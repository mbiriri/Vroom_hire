import React, { useEffect, useState } from 'react';
import { db, firebaseConfig } from "../firebase";
import { collection, getDocs, doc, deleteDoc, setDoc } from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const secondaryApp = getApps().find((app) => app.name === "SecondaryAuthEngine") || initializeApp(firebaseConfig, "SecondaryAuthEngine");
const secondaryAuth = getAuth(secondaryApp);

function UserPanel() {
  const [users, setUsers] = useState([]);
  const [pendingApps, setPendingApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersSnap, appsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "customer_applications"))
        ]);
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setPendingApps(appsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error("Error fetching data:", err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleApprove = async (app) => {
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, app.email, app.password);
      
      // APPROVED: Transferring all data including the 'phone' field
      await setDoc(doc(db, "users", cred.user.uid), {
        fullName: app.fullName, 
        email: app.email, 
        phone: app.phone, // <--- Now synced from application to user table
        role: "customer", 
        status: "active", 
        createdAt: new Date().toISOString()
      });

      await deleteDoc(doc(db, "customer_applications", app.id));
      
      setPendingApps(prev => prev.filter(p => p.id !== app.id));
      setUsers(prev => [...prev, { 
        id: cred.user.uid, 
        fullName: app.fullName, 
        role: "customer", 
        status: "active", 
        email: app.email, 
        phone: app.phone 
      }]);
      
      alert("Application Approved!");
    } catch (err) { alert("Approval failed: " + err.message); }
  };

  if (loading) return <div style={{ padding: '32px' }}>Loading Admin Panel...</div>;

  return (
    <div style={containerStyle}>
      <h2 style={{ fontSize: '28px', color: '#111827', marginBottom: '32px' }}>Member Management</h2>

      {/* PENDING APPLICATIONS */}
      <section style={sectionStyle}>
        <h3 style={{ marginBottom: '20px' }}>Pending KYC Reviews</h3>
        <table style={tableStyle}>
          <thead><tr style={headerRowStyle}>{['Name', 'Email', 'Phone', 'Documents', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {pendingApps.map(app => (
              <tr key={app.id} style={rowStyle}>
                <td style={tdStyle}>{app.fullName}</td>
                <td style={tdStyle}>{app.email}</td>
                <td style={tdStyle}>{app.phone || 'N/A'}</td>
                <td style={tdStyle}><button onClick={() => setSelectedDoc(app)} style={btnBlue}>View KYC</button></td>
                <td style={tdStyle}><button onClick={() => handleApprove(app)} style={btnGreen}>Approve</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ACTIVE USERS TABLE */}
      <section style={sectionStyle}>
        <h3 style={{ marginBottom: '20px' }}>Active System Users</h3>
        <table style={tableStyle}>
          <thead><tr style={headerRowStyle}>{['Name', 'Email', 'Phone', 'Role', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={rowStyle}>
                <td style={tdStyle}>{u.fullName}</td>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}>{u.phone || 'N/A'}</td>
                <td style={tdStyle}>{u.role || 'customer'}</td>
                <td style={tdStyle}><span style={statusStyle}>● {u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* KYC MODAL */}
      {selectedDoc && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>KYC Documentation</h3>
            <p><strong>Driving License:</strong></p>
            {selectedDoc.licenseImageUrl ? <img src={selectedDoc.licenseImageUrl} style={imgStyle} /> : <p>No license image.</p>}
            <p style={{ marginTop: '20px' }}><strong>National ID:</strong></p>
            {selectedDoc.idImageUrl ? <img src={selectedDoc.idImageUrl} style={imgStyle} /> : <p>No ID image.</p>}
            <button onClick={() => setSelectedDoc(null)} style={btnClose}>Close Window</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const containerStyle = { padding: '32px', backgroundColor: '#f9fafb', minHeight: '100vh', overflowY: 'auto' };
const sectionStyle = { background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '32px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const headerRowStyle = { borderBottom: '2px solid #f3f4f6' };
const thStyle = { textAlign: 'left', padding: '12px', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' };
const tdStyle = { padding: '12px', fontSize: '14px' };
const rowStyle = { borderBottom: '1px solid #f3f4f6' };
const statusStyle = { color: '#059669', fontSize: '12px', fontWeight: 'bold' };
const btnBlue = { background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' };
const btnGreen = { background: '#dcfce7', color: '#166534', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContent = { background: '#fff', padding: '24px', borderRadius: '12px', width: '450px', maxHeight: '80vh', overflowY: 'auto' };
const imgStyle = { width: '100%', borderRadius: '8px', border: '1px solid #ddd' };
const btnClose = { width: '100%', padding: '10px', marginTop: '20px', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' };

export default UserPanel;