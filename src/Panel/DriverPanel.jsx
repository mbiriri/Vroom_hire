import React, { useState } from 'react';
import { db, firebaseConfig } from "../firebase";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";

const secondaryApp = getApps().find((app) => app.name === "SecondaryAuthEngine") || initializeApp(firebaseConfig, "SecondaryAuthEngine");
const secondaryAuth = getAuth(secondaryApp);

function DriverPanel() {
  const [driverForm, setDriverForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, driverForm.email, driverForm.password);
      await setDoc(doc(db, "users", cred.user.uid), {
        ...driverForm,
        role: "driver",
        status: "active",
        createdAt: new Date().toISOString()
      });
      alert("Driver registered successfully!");
      setDriverForm({ fullName: "", email: "", phone: "", password: "" });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reusing your consistent styling object
  const style = {
    card: { backgroundColor: "#ffffff", padding: "30px 25px", borderRadius: "16px", border: "1px solid #e0ddd8", width: "100%", maxWidth: "400px" },
    form: { display: "flex", flexDirection: "column", gap: "14px" },
    inputGroup: { display: "flex", flexDirection: "column", gap: "4px" },
    label: { fontSize: "12px", fontWeight: "600", color: "#0f1c3f" },
    input: { padding: "12px 14px", fontSize: "14px", borderRadius: "8px", border: "1px solid #e0ddd8", outline: "none", width: "100%", boxSizing: "border-box" },
    button: { padding: "14px", fontSize: "14px", fontWeight: "600", color: "#ffffff", backgroundColor: "#185FA5", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: "10px" },
    heading: { color: "#0f1c3f", fontSize: "20px", fontWeight: "700", marginBottom: "20px" }
  };

  return (
    <div style={style.card}>
      <h2 style={style.heading}>Register New Driver</h2>
      <form onSubmit={handleCreate} style={style.form}>
        <div style={style.inputGroup}>
          <label style={style.label}>Full Name</label>
          <input placeholder="John Doe" required style={style.input} value={driverForm.fullName} onChange={e => setDriverForm({...driverForm, fullName: e.target.value})} />
        </div>
        <div style={style.inputGroup}>
          <label style={style.label}>Email Address</label>
          <input type="email" placeholder="name@domain.com" required style={style.input} value={driverForm.email} onChange={e => setDriverForm({...driverForm, email: e.target.value})} />
        </div>
        <div style={style.inputGroup}>
          <label style={style.label}>Phone Number</label>
          <input type="tel" placeholder="0712345678" required style={style.input} value={driverForm.phone} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} />
        </div>
        <div style={style.inputGroup}>
          <label style={style.label}>Password</label>
          <input type="password" placeholder="••••••••" required style={style.input} value={driverForm.password} onChange={e => setDriverForm({...driverForm, password: e.target.value})} />
        </div>
        <button type="submit" disabled={loading} style={style.button}>
          {loading ? "Registering..." : "Register Driver"}
        </button>
      </form>
    </div>
  );
}

export default DriverPanel;