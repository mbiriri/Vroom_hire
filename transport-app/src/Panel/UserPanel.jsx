import React, { useEffect, useState } from 'react';
import { db } from "../firebase"; 
// NEW: Imported getDoc and initializeApp to cleanly isolate driver workspace configuration
import { collection, getDocs, doc, deleteDoc, query, where, onSnapshot, writeBatch, getDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

// Replace this with your exact configuration values from firebase.js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize an isolated fallback engine instances framework to create users without kicking out the logged-in Administrator
const secondaryApp = initializeApp(firebaseConfig, "SecondaryAuthEngine");
const secondaryAuth = getAuth(secondaryApp);

function UserPanel(){
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
       
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [hireHistory, setHireHistory] = useState({}); 
  const [hireLoading, setHireLoading] = useState(null); 

  const [removingId, setRemovingId] = useState(null);

  // Tracks real-time incoming alerts application items
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [processingDecisionId, setProcessingDecisionId] = useState(null);

  // Fetch all users from your Firestore cloud database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersArray = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersArray);
      } catch (err) {
        console.error("Error reading users from Firestore:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Real-time Listener for Administrative Notifications Queue
  useEffect(() => {
    const q = query(
      collection(db, "admin_notifications"),
      where("status", "==", "unread"),
      where("type", "==", "NEW_DRIVER_REGISTRATION")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeAlerts = [];
      snapshot.forEach((doc) => {
        activeAlerts.push({ id: doc.id, ...doc.data() });
      });
      setPendingDrivers(activeAlerts);
    });

    return () => unsubscribe();
  }, []);

  // --- CORE ADMINISTRATIVE DECISION LOGIC ---
  const handleAdminDecision = async (applicationId, notificationId, isApproved) => {
    setProcessingDecisionId(notificationId);
    try {
      // 1. Fetch data from driver_applications staging engine tier
      const appDocRef = doc(db, "driver_applications", applicationId);
      const appSnapshot = await getDoc(appDocRef);

      if (!appSnapshot.exists()) {
        throw new Error("Application records could not be located in database staging maps.");
      }

      const driverData = appSnapshot.data();
      const batch = writeBatch(db);

      if (isApproved) {
        // 2. Provision and Register Authentication Credentials inside the secondary layer
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          driverData.email,
          driverData.password
        );
        const newUser = userCredential.user;

        // 3. Build actual profile object payload target to allow login access framework 
        const userProfileRef = doc(db, "users", newUser.uid);
        batch.set(userProfileRef, {
          uid: newUser.uid,
          fullName: driverData.fullName,
          email: driverData.email,
          phone: driverData.phone,
          role: "driver",
          licenseNumber: driverData.licenseNumber,
          kraPin: driverData.kraPin,
          status: "active",
          idDocumentStatus: "attached",
          licenseDocumentStatus: "attached",
          createdAt: driverData.createdAt,
          approvedAt: new Date().toISOString()
        });

        // Sync local client state UI cache dynamically
        setUsers(prev => [...prev, {
          id: newUser.uid,
          uid: newUser.uid,
          fullName: driverData.fullName,
          email: driverData.email,
          role: "driver",
          status: "active"
        }]);
      }

      // 4. Update core staging references
      batch.update(appDocRef, { status: isApproved ? "approved" : "rejected" });

      // 5. Clear out notification entry frame alert array 
      const notificationRef = doc(db, "admin_notifications", notificationId);
      batch.update(notificationRef, {
        status: "resolved",
        resolution: isApproved ? "APPROVED" : "REJECTED"
      });
      
      await batch.commit();
      alert(isApproved ? "Driver verified successfully! They can now login." : "Driver rejected successfully.");

    } catch (err) {
      console.error("Administrative operation execution failed: ", err);
      alert(`Decision commit failed: ${err.message}`);
    } finally {
      setProcessingDecisionId(null);
    }
  };

  // Fetch specific customer rental records from their sub-collection
  const toggleExpandCustomer = async (customerId) => {
    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
      return;
    }
    setExpandedCustomerId(customerId);
    if (hireHistory[customerId]) {
      return;
    }
    setHireLoading(customerId);

    try {
      const hiresSnapshot = await getDocs(collection(db, "users", customerId, "hires"));
      const historyArray = hiresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHireHistory(prev => ({ ...prev, [customerId]: historyArray }));
    } catch (err) {
      console.error("Error loading hire history:", err);
    } finally {
      setHireLoading(null);
    }
  };

  // Delete user securely from Firestore database
  const handleRemove = async (user) => {
    if (user.role === 'admin') return;

    const displayName = user.fullName || user.name || "This user";
    const confirmed = window.confirm(`Remove ${displayName} (${user.role})? This action cannot be undone.`);
    if (!confirmed) return;

    setRemovingId(user.id);
    try {
      await deleteDoc(doc(db, "users", user.id));
      setUsers(prev => prev.filter(u => !((u.id || u.uid) === user.id && u.role === user.role)));
    } catch (err) {
      alert(`Could not remove user: ${err.message}`);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return <p style={{ fontSize: '13px', color: '#999' }}>Loading users...</p>;
  if (error) return <p style={{ fontSize: '13px', color: '#e63946' }}>Error loading users: {error}</p>;

  const admins = users.filter(u => u.role === 'admin');
  const customers = users.filter(u => u.role === 'customer');
  const drivers = users.filter(u => u.role === 'driver');

  const sectionHeaderStyle = { fontSize: '15px', fontWeight: 700, color: '#0f1c3f', margin: '24px 0 10px' };
  const thStyle = { padding: '10px 8px' };
  const tdStyle = { padding: '10px 8px', color: '#666' };
  const removeBtnStyle = (disabled) => ({
    background: 'transparent',
    color: '#e63946',
    border: '1.5px solid #e63946',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: disabled ? 'wait' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  });

  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f1c3f', marginBottom: '2px' }}>
        Users Management
      </h2>
      <p style={{ fontSize: '13px', color: '#888', marginBottom: '14px' }}>
        All users on the platform, grouped by role.
      </p>

      {/* Pending Approvals Queue Container */}
      {pendingDrivers.length > 0 && (
        <div style={{ backgroundColor: '#fff9e6', border: '1.5px solid #ffeeba', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <h3 style={{ ...sectionHeaderStyle, margin: '0 0 12px 0', color: '#856404', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔔 Pending Driver Registrations ({pendingDrivers.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingDrivers.map((alert) => (
              <div key={alert.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e2e2', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: '#0f1c3f', display: 'block' }}>{alert.title}</strong>
                  <span style={{ fontSize: '13px', color: '#555' }}>{alert.message}</span>
                  {alert.licenseNumber && (
                    <small style={{ display: 'block', color: '#888', marginTop: '4px' }}>DL: {alert.licenseNumber}</small>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    disabled={processingDecisionId === alert.id}
                    onClick={() => handleAdminDecision(alert.applicationId, alert.id, true)}
                    style={{ backgroundColor: '#185FA5', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: processingDecisionId === alert.id ? 'wait' : 'pointer' }}
                  >
                    {processingDecisionId === alert.id ? 'Verifying...' : 'Approve'}
                  </button>
                  <button
                    disabled={processingDecisionId === alert.id}
                    onClick={() => handleAdminDecision(alert.applicationId, alert.id, false)}
                    style={{ backgroundColor: 'transparent', color: '#e63946', border: '1px solid #e63946', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: processingDecisionId === alert.id ? 'wait' : 'pointer' }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMINS */}
      <h3 style={sectionHeaderStyle}>Admins</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ece9e3', textAlign: 'left' }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Email</th>
          </tr>
        </thead>
        <tbody>
          {admins.length === 0 ? (
            <tr><td colSpan={2} style={tdStyle}>No admins found</td></tr>
          ) : admins.map(u => (
            <tr key={u.id || u.uid} style={{ borderBottom: '1px solid #f0eee9' }}>
              <td style={{ ...tdStyle, fontWeight: 600, color: '#0f1c3f' }}>{u.fullName || u.name}</td>
              <td style={tdStyle}>{u.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* CUSTOMERS */}
      <h3 style={sectionHeaderStyle}>Customers</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ece9e3', textAlign: 'left' }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}></th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {customers.length === 0 ? (
            <tr><td colSpan={4} style={tdStyle}>No customers found</td></tr>
          ) : customers.map(u => (
            <React.Fragment key={`customer-${u.id || u.uid}`}>
              <tr style={{ borderBottom: '1px solid #f0eee9' }}>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#0f1c3f' }}>{u.fullName || u.name}</td>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => toggleExpandCustomer(u.id || u.uid)}
                    style={{ background: 'transparent', color: '#185FA5', border: '1.5px solid #185FA5', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {expandedCustomerId === (u.id || u.uid) ? 'Hide history' : 'View hire history'}
                  </button>
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleRemove(u)}
                    disabled={removingId === (u.id || u.uid)}
                    style={removeBtnStyle(removingId === (u.id || u.uid))}
                  >
                    Remove
                  </button>
                </td>
              </tr>
              
              {expandedCustomerId === (u.id || u.uid) && (
                <tr>
                  <td colSpan={4} style={{ padding: '10px 8px', background: '#f9f8f6' }}>
                    {hireLoading === (u.id || u.uid) ? (
                      <p style={{ fontSize: '12px', color: '#999' }}>Loading hire history...</p>
                    ) : (hireHistory[u.id || u.uid]?.length ?? 0) === 0 ? (
                      <p style={{ fontSize: '12px', color: '#999' }}>No hire history for this customer.</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', color: '#888' }}>
                            <th style={{ padding: '6px 8px' }}>Vehicle</th>
                            <th style={{ padding: '6px 8px' }}>Hire Date</th>
                            <th style={{ padding: '6px 8px' }}>Return Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hireHistory[u.id || u.uid].map((h, i) => (
                            <tr key={i}>
                              <td style={{ padding: '6px 8px' }}>{h.vehicle_name}</td>
                              <td style={{ padding: '6px 8px' }}>{h.hire_date}</td>
                              <td style={{ padding: '6px 8px' }}>{h.return_date || 'Not yet returned'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* DRIVERS */}
      <h3 style={sectionHeaderStyle}>Delivery Drivers</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ece9e3', textAlign: 'left' }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Verification Status</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {drivers.length === 0 ? (
            <tr><td colSpan={4} style={tdStyle}>No drivers found</td></tr>
          ) : drivers.map(u => (
            <tr key={u.id || u.uid} style={{ borderBottom: '1px solid #f0eee9' }}>
              <td style={{ ...tdStyle, fontWeight: 600, color: '#0f1c3f' }}>{u.fullName || u.name}</td>
              <td style={tdStyle}>{u.email}</td>
              <td style={tdStyle}>
                <span style={{ 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
                  fontWeight: 600,
                  backgroundColor: u.status === 'active' ? '#e6f4ea' : u.status === 'rejected' ? '#fce8e6' : '#fef7e0',
                  color: u.status === 'active' ? '#137333' : u.status === 'rejected' ? '#c5221f' : '#b06000'
                }}>
                  {u.status || 'pending_review'}
                </span>
              </td>
              <td style={tdStyle}>
                <button
                  onClick={() => handleRemove(u)}
                  disabled={removingId === (u.id || u.uid)}
                  style={removeBtnStyle(removingId === (u.id || u.uid))}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserPanel;