import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from "./firebase";

// 1. Import Firebase Firestore tools
import { doc, updateDoc } from "firebase/firestore";

import './App.css';
import './Navbar.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Haversine distance formula in km
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ==== ADDED: geocode a typed delivery address into {lat, lng} using the Google Maps JS Geocoder ====
function geocodeAddress(address, apiKey) {
  return new Promise((resolve, reject) => {
    function runGeocode() {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          reject(new Error(`Geocode failed: ${status}`));
        }
      });
    }

    if (window.google && window.google.maps) {
      runGeocode();
      return;
    }

    const existing = document.getElementById('google-maps-script');
    if (existing) {
      existing.addEventListener('load', runGeocode);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.onload = runGeocode;
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.body.appendChild(script);
  });
}


function DeliveryDriver({ delivery, onUpdateStatus }) {
  const navigate = useNavigate();
  const { state } = useLocation();

  const customer = state?.customer || delivery?.customer;
  const booking = state?.booking || delivery?.booking;

  const customerLat = customer?.latitude ?? customer?.lat ?? null;
  const customerLng = customer?.longitude ?? customer?.lng ?? null;
  const customerAddress = customer?.address || customer?.destination || '';

  const [driverPosition, setDriverPosition] = useState(null); 
  const [gpsError, setGpsError] = useState('');
  const [status, setStatus] = useState(booking?.status || 'en_route'); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const watchIdRef = useRef(null);


    const [customerCoords, setCustomerCoords] = useState(
    customerLat && customerLng ? { lat: customerLat, lng: customerLng } : null
  );
  const [geocodeError, setGeocodeError] = useState('');

  // Turns the customer's typed delivery address into real coordinates once,
  // then caches the result on the booking doc so we don't re-geocode next time
  useEffect(() => {
    if (customerCoords || !customerAddress || !GOOGLE_MAPS_API_KEY) return;

    geocodeAddress(customerAddress, GOOGLE_MAPS_API_KEY)
      .then((coords) => {
        setCustomerCoords(coords);
        const bookingId = booking?.id || booking?.Booking_id;
        if (bookingId) {
          updateDoc(doc(db, 'hires', bookingId), {
            destination_lat: coords.lat,
            destination_lng: coords.lng,
          }).catch(() => {});
        }
      })
      .catch((err) => setGeocodeError(err.message));
  }, [customerAddress, customerCoords, booking]);

  // ---- Live GPS tracking of the driver's own device -----------------------
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported on this device.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError('');
        setDriverPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enable GPS to navigate to the customer.'
            : 'Unable to fetch current location.'
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ---- Build the map URL dynamically --------------------------------------
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    const destination =
      customerCoords
        ? `${customerCoords.lat},${customerCoords.lng}`
        : customerAddress;

    if (!destination) {
      setMapUrl('');
      return;
    }

    if (GOOGLE_MAPS_API_KEY && driverPosition) {
      const origin = `${driverPosition.lat},${driverPosition.lng}`;
      // Fixed template string syntax bug using standard variables interpolation ${}
      const url = `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(destination)}&mode=driving`;
      setMapUrl(url);
    } else {
      const query = destination;

      const url = `https://maps.google.com/maps?q=${encodeURIComponent(
        query
      )}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
      setMapUrl(url);
    }
  }, [driverPosition, customerCoords, customerAddress]);

  const liveDistanceKm =
    driverPosition && customerCoords
      ? distanceKm(driverPosition.lat, driverPosition.lng, customerCoords.lat, customerCoords.lng)
      : null;

  // ---- Fire Cloud Updates upon changing travel milestones --------------------
  const handleAdvanceStatus = async () => {
    const nextStatus = status === 'en_route' ? 'arrived' : 'delivered';
    
    // Extract hiring record tracking key
    const bookingId = booking?.id || booking?.Booking_id;

    if (bookingId) {
      setIsSubmitting(true);
      try {
        const hireDocRef = doc(db, "hires", bookingId);
        
        // Push status payload to cloud
        await updateDoc(hireDocRef, {
          status: nextStatus,
          lastDriverPosition: driverPosition ? { lat: driverPosition.lat, lng: driverPosition.lng } : null
        });

        // If trip is complete, free up vehicle availability status
        if (nextStatus === 'delivered' && booking?.vehicleId) {
          const vehicleDocRef = doc(db, "vehicles", booking.vehicleId);
          await updateDoc(vehicleDocRef, { IsAvailable: true });
        }

      } catch (err) {
        console.error("Firestore progress sync failed:", err);
        alert("Status synced locally but failed to update cloud registry: " + err.message);
      } finally {
        setIsSubmitting(false);
      }
    }

    setStatus(nextStatus);
    if (onUpdateStatus) onUpdateStatus(nextStatus, { booking, customer });
  };

  const fieldWrap = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#ffffff',
    border: '1px solid #e0ddd8',
    borderRadius: '8px',
    padding: '10px 14px',
  };

  const labelStyle = { color: '#aaa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const valueStyle = { fontSize: '14px', color: '#222', fontWeight: 500 };

  const statusMeta = {
    en_route: { label: 'En route to customer', color: '#185FA5' },
    arrived: { label: 'Arrived at delivery location', color: '#b3811a' },
    delivered: { label: 'Delivered', color: '#1f9d55' },
  };

  const nextActionLabel =
    isSubmitting
      ? "Syncing status..."
      : status === 'en_route'
      ? "I've arrived"
      : status === 'arrived'
      ? 'Mark as delivered'
      : 'Delivered ✓';

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100vh',
        background: '#f7f5f0',
      }}
    >
      {/* LEFT CONTAINER: DRIVER INFO / STATUS */}
      <div
        style={{
          flex: '0 0 38%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '32px',
          overflowY: 'auto',
          borderRight: '1px solid #e0ddd8',
        }}
      >
        {/* Status pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
          }}
        >
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: statusMeta[status].color,
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 600, color: statusMeta[status].color }}>
            {statusMeta[status].label}
          </span>
        </div>

        {/* Customer card */}
        {customer && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: '#e8f0fb',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '32px' }}>📦</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f1c3f' }}>
                {customer.name || 'Customer'}
              </h3>
              {customer.phone && (
                <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{customer.phone}</p>
              )}
              {customerAddress && (
                <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{customerAddress}</p>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
          {/* Delivery destination */}
          <div style={fieldWrap}>
            <span style={{ color: '#aaa', fontSize: '15px' }}>🏁</span>
            <div>
              <div style={labelStyle}>Delivery destination</div>
              <div style={valueStyle}>{customerAddress || 'Awaiting customer location'}</div>
            </div>
          </div>

          {/* Driver's live position */}
          <div style={fieldWrap}>
            <span style={{ color: '#aaa', fontSize: '15px' }}>📍</span>
            <div>
              <div style={labelStyle}>Your live location</div>
              <div style={valueStyle}>
                {driverPosition
                  ? `${driverPosition.lat.toFixed(5)}, ${driverPosition.lng.toFixed(5)}`
                  : gpsError
                  ? gpsError
                  : 'Locating…'}
              </div>
            </div>
          </div>

          {/* Distance readout */}
          {liveDistanceKm !== null && (
            <div style={fieldWrap}>
              <span style={{ color: '#aaa', fontSize: '15px' }}>📏</span>
              <div>
                <div style={labelStyle}>Distance to customer</div>
                <div style={valueStyle}>{liveDistanceKm.toFixed(2)} km</div>
              </div>
            </div>
          )}

          {gpsError && (
            <div
              style={{
                fontSize: '12px',
                color: '#a33',
                background: '#fdecea',
                border: '1px solid #f3c8c4',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              {gpsError}
            </div>
          )}

           {/* ==== ADDED: surface geocoding failure to the driver ==== */}
          {geocodeError && (
            <div
              style={{
                fontSize: '12px',
                color: '#a33',
                background: '#fdecea',
                border: '1px solid #f3c8c4',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              Could not locate delivery address: {geocodeError}
            </div>
          )}

          {/* Status action button */}
          <button
            onClick={handleAdvanceStatus}
            disabled={status === 'delivered' || isSubmitting}
            style={{
              marginTop: '10px',
              background: statusMeta[status].color,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '14px 0',
              fontSize: '14px',
              fontWeight: 600,
              cursor: (status === 'delivered' || isSubmitting) ? 'default' : 'pointer',
              opacity: (status === 'delivered' || isSubmitting) ? 0.6 : 1,
              width: '100%',
            }}
          >
            {nextActionLabel}
          </button>
        </div>
      </div>

      {/* RIGHT CONTAINER: LIVE GPS MAP */}
      <div className="right-booking-container" style={{ flex: 1, position: 'relative', background: '#e5e2db' }}>
        {mapUrl ? (
          <iframe
            title="Delivery Navigation Map"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={mapUrl}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#888',
              fontSize: '14px',
            }}
          >
            Waiting for customer delivery location…
          </div>
        )}

        {!GOOGLE_MAPS_API_KEY && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              right: '12px',
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid #e0ddd8',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              color: '#666',
            }}
          >
            Showing an approximate location. Add a Google Maps API key
            (REACT_APP_GOOGLE_MAPS_API_KEY) to enable turn-by-turn directions
            from your current position to the customer.
          </div>
        )}
      </div>
    </div>
  );
}

export default DeliveryDriver;