import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from "./firebase";
import * as firestore from "firebase/firestore";

function BookingVehicle() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedVehicle = location.state?.selectedVehicle;
  console.log("Vehicle object received:", selectedVehicle);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deliveryOption, setDeliveryOption] = useState("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculation logic
  useEffect(() => {
    if (startDate && endDate && selectedVehicle?.price) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.max(0, end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      
      const vehiclePrice = selectedVehicle.price;
      const deliveryFee = deliveryOption === 'deliver' ? 1500 : 0;
      
      setTotalPrice((vehiclePrice * diffDays) + deliveryFee);
    }
  }, [startDate, endDate, deliveryOption, selectedVehicle]);

  const handleFinalizeBooking = async () => {
    if (deliveryOption === 'deliver' && !deliveryAddress) {
      alert("Please enter a delivery address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = firestore.doc(db, "users", auth.currentUser.uid);
      const userSnap = await firestore.getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : { fullName: "Customer", phone: "Not Provided" };

      const driversQuery = firestore.query(
        firestore.collection(db, "users"), 
        firestore.where("role", "==", "driver"), 
        firestore.where("status", "==", "active")
      );
      const driverSnap = await firestore.getDocs(driversQuery);
      if (driverSnap.empty) throw new Error("No drivers available.");
      
      await firestore.addDoc(firestore.collection(db, "hires"), {
        userId: auth.currentUser.uid,
        driverId: driverSnap.docs[0].id,
        vehicle_name: selectedVehicle?.Vehicle_Name,
        customerName: userData.fullName,
        customerPhone: userData.phone || "Not Provided",
        start_date: startDate,
        end_date: endDate,
        delivery_address: deliveryOption === 'deliver' ? deliveryAddress : "Pickup at Garage",
        total_price: totalPrice,
        status: "pending",
        createdAt: firestore.serverTimestamp()
      });

      alert("Booking confirmed! Total: KES " + totalPrice);
      navigate("/dashboard");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- STYLES ---
  const styles = {
    container: {
      padding: '40px 20px',
      maxWidth: '500px',
      margin: '50px auto',
      background: '#ffffff',
      borderRadius: '20px',
      boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
      fontFamily: "'Inter', sans-serif"
    },
    title: { color: '#1a202c', marginBottom: '10px' },
    label: { display: 'block', fontWeight: '600', marginBottom: '8px', color: '#4a5568' },
    input: {
      width: '100%',
      padding: '14px',
      marginBottom: '20px',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      boxSizing: 'border-box',
      fontSize: '16px'
    },
    priceBox: {
      background: '#f7fafc',
      padding: '20px',
      borderRadius: '12px',
      textAlign: 'center',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#185FA5',
      marginBottom: '20px'
    },
    button: {
      width: '100%',
      padding: '16px',
      background: '#185FA5',
      color: '#ffffff',
      border: 'none',
      borderRadius: '10px',
      fontSize: '18px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'background 0.3s'
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Book {selectedVehicle?.Vehicle_Name}</h2>
      
      <label style={styles.label}>Start Date</label>
      <input type="date" style={styles.input} onChange={(e) => setStartDate(e.target.value)} />
      
      <label style={styles.label}>End Date</label>
      <input type="date" style={styles.input} onChange={(e) => setEndDate(e.target.value)} />

      <label style={styles.label}>Delivery Option</label>
      <select style={styles.input} onChange={(e) => setDeliveryOption(e.target.value)}>
        <option value="pickup">Pickup (Free)</option>
        <option value="deliver">Delivery (+ KES 1500)</option>
      </select>

      {deliveryOption === 'deliver' && (
        <>
          <label style={styles.label}>Delivery Address</label>
          <input type="text" style={styles.input} placeholder="e.g. 123 Street, City" onChange={(e) => setDeliveryAddress(e.target.value)} />
        </>
      )}

      <div style={styles.priceBox}>
        Total Price: KES {totalPrice.toLocaleString()}
      </div>

      <button onClick={handleFinalizeBooking} disabled={isSubmitting} style={styles.button}>
        {isSubmitting ? "Processing..." : "CONFIRM BOOKING"}
      </button>
    </div>
  );
}

export default BookingVehicle;