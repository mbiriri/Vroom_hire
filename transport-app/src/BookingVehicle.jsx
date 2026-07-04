import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// 1. Import Firebase Firestore tools and auth
import { db, auth } from "./firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

import './App.css';
import './Navbar.css';

function BookingVehicle() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const selectedVehicle = state?.vehicle;

  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapUrl, setMapUrl] = useState('');

  // Updates the map location dynamically whenever pickup or destination changes
  useEffect(() => {
    const locationQuery = destination || pickup || 'Nairobi';
    // Fixed string syntax bug with template literals `${}`
    const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(locationQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    setMapUrl(embedUrl);
  }, [pickup, destination]);

  // Handle the Cloud Booking Process
  const handleFinalizeBooking = async () => {
    if (!pickup || !destination || !date) {
      alert("Please fill in all booking fields (Pickup, Destination, and Date).");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("You must be logged in to book a vehicle.");
      return;
    }

    const targetVehicleId = selectedVehicle?.id || selectedVehicle?.Vehicle_id;
    if (!targetVehicleId) {
      alert("Vehicle identification error. Please select a vehicle from the homepage again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const liveBookingPayload = {
        userId: currentUser.uid,
        customerName: currentUser.displayName || "Customer",
        customerEmail: currentUser.email,
        vehicleId: targetVehicleId,
        vehicle_name: selectedVehicle.Vehicle_Name,
        pickup_location: pickup,
        destination_location: destination,
        hire_date: date,
        return_date: "", // Fulfilled later upon checking back in
        status: "active",
        createdAt: serverTimestamp()
      };

      // A. Add to global 'hires' ledger
      await addDoc(collection(db, "hires"), liveBookingPayload);

      // B. Append into customer's historical sub-collection path for UserPanel.jsx tracking
      await addDoc(collection(db, "users", currentUser.uid, "hires"), {
        vehicle_name: selectedVehicle.Vehicle_Name,
        hire_date: date,
        return_date: "Active Trip"
      });

      // C. Switch target vehicle availability state to false
      const vehicleDocRef = doc(db, "vehicles", targetVehicleId);
      await updateDoc(vehicleDocRef, {
        IsAvailable: false
      });

      alert(`Success! Your ride with ${selectedVehicle.Vehicle_Name} has been booked.`);
      navigate('/'); // Return safely to home view
    } catch (err) {
      console.error("Booking error:", err);
      alert("Could not process booking transaction: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guard Clause if someone navigates directly to page without picking a car
  if (!selectedVehicle) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui,sans-serif' }}>
        <p style={{ color: '#e63946', fontWeight: 600 }}>No vehicle selected for booking.</p>
        <button onClick={() => navigate('/')} style={{ background: '#185FA5', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' }}>
          Go to Fleet Selection
        </button>
      </div>
    );
  }

  const fieldWrap = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#ffffff',
    border: '1px solid #e0ddd8',
    borderRadius: '8px',
    padding: '0 14px',
    height: '46px',
  };

  const inputStyle = {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '13px',
    color: '#222',
    width: '100%',
    height: '100%',
  };

  const iconStyle = { color: '#aaa', fontSize: '15px', flexShrink: 0 };

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100vh',
      background: '#f7f5f0',
    }}>
      {/* LEFT CONTAINER: FORM */}
      <div style={{
        flex: '0 0 38%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '32px',
        overflowY: 'auto',
        borderRight: '1px solid #e0ddd8'
      }}>
        
        <div style={{
          display:'flex', alignItems:'center', gap:'12px',
          background:'#e8f0fb', padding:'16px', borderRadius:'8px', marginBottom:'20px',
        }}>
          <span style={{ fontSize:'32px' }}>🚗</span>
          <div>
            <h3 style={{ margin:0, fontSize:'16px', color:'#0f1c3f' }}>{selectedVehicle.Vehicle_Name}</h3>
            <p style={{ margin:0, fontSize:'13px', color:'#666' }}>Color: {selectedVehicle.Color}</p>
            <p style={{ margin:0, fontSize:'13px', color:'#666' }}>Mileage: {selectedVehicle.Mileage} km/l</p>
          </div>
        </div>

        <div className="left-booking-container">
          <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'12px' }}>
            
            {/* Pickup Input */}
            <div style={fieldWrap}>
              <span style={iconStyle}>📍</span>
              <input 
                style={inputStyle} 
                type="text" 
                placeholder="Pickup location"
                value={pickup} 
                onChange={e => setPickup(e.target.value)} 
              />
            </div>

            {/* Destination Input */}
            <div style={fieldWrap}>
              <span style={iconStyle}>🏁</span>
              <input 
                style={inputStyle} 
                type="text" 
                placeholder="Destination"
                value={destination} 
                onChange={e => setDestination(e.target.value)} 
              />
            </div>

            {/* Date Input */}
            <div style={fieldWrap}>
              <span style={iconStyle}>📅</span>
              <input 
                style={inputStyle} 
                type="datetime-local"
                value={date} 
                onChange={e => setDate(e.target.value)} 
              />
            </div>

            {/* Finalize Action Button */}
            <button
              onClick={handleFinalizeBooking}
              disabled={isSubmitting}
              style={{
                marginTop:'10px', 
                background:'#185FA5', 
                color:'#ffffff',
                border:'none', 
                borderRadius:'8px', 
                padding:'14px 0',
                fontSize:'14px', 
                fontWeight:600,
                cursor: isSubmitting ? 'wait' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1, 
                width:'100%',
              }}
            >
              {isSubmitting ? 'Saving Booking...' : 'Finalize Payment & Hire'}
            </button>

          </div>
        </div>
      </div>

      {/* RIGHT CONTAINER: LIVE GPS MAP */}
      <div className="right-booking-container" style={{ flex: 1, position: 'relative', background: '#e5e2db' }}>
        <iframe
          title="GPS Navigation Map"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          src={mapUrl}
        />
      </div>
    </div>
  );
}

export default BookingVehicle;