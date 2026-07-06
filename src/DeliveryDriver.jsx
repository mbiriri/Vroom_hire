import React, { useEffect, useState } from 'react';
import { db, auth } from "./firebase";

import { collection, addDoc, serverTimestamp, getDoc, doc, query, where, getDocs } from "firebase/firestore";
function DeliveryDriver() {
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Query active trips for this driver
    const q = query(
      collection(db, "hires"), 
      where("driverId", "==", auth.currentUser.uid),
      where("status", "in", ["pending", "in-progress"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveTrip(!snapshot.empty ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (newStatus) => {
    if (!activeTrip) return;
    try {
      await updateDoc(doc(db, "hires", activeTrip.id), { status: newStatus });
      if (newStatus === 'completed') {
        await updateDoc(doc(db, "vehicles", activeTrip.vehicleId), { IsAvailable: true });
      }
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '12px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>MY DELIVERIES</h2>

      {!activeTrip ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>No active assignments.</div>
      ) : (
        <div>
          {/* Trip Header */}
          <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
            <p style={{ fontWeight: 'bold', color: '#185FA5' }}>TRIP STATUS: {activeTrip.status.toUpperCase()}</p>
            <p>BOOKING ID: {activeTrip.id.slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Map Placeholder */}
          <div style={{ height: '150px', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', color: '#666' }}>
            Map Area Placeholder
          </div>

          {/* Locations */}
          <div style={{ marginBottom: '15px' }}>
            <p>📍 FROM: Hub Station</p>
            <p>🏁 TO: {activeTrip.delivery_address}</p>
          </div>

          {/* Customer Details */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginBottom: '15px' }}>
            <p style={{ fontWeight: 'bold' }}>CUSTOMER DETAILS</p>
            <p>NAME: {activeTrip.customerName}</p>
            <p>PHONE: {activeTrip.customerPhone || "Not Provided"}</p>
          </div>

          {/* Timing */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginBottom: '20px' }}>
            <p style={{ fontWeight: 'bold' }}>TIMING</p>
            <p>SCHEDULE: {activeTrip.start_date}</p>
          </div>

          {/* Action Button */}
          <button 
            onClick={() => updateStatus(activeTrip.status === 'pending' ? 'in-progress' : 'completed')}
            style={{ 
              width: '100%', 
              padding: '15px', 
              background: '#185FA5', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {activeTrip.status === 'pending' ? 'START TRIP' : 'MARK AS DELIVERED'}
          </button>
        </div>
      )}
    </div>
  );
}

export default DeliveryDriver;