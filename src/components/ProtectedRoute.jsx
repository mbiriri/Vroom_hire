// src/components/ProtectedRoute.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function ProtectedRoute({ children, allowedRole }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setRole(docSnap.data().role);
          } else {
            setRole(null); // User authenticated but no profile document exists
          }
        } catch (err) {
          console.error("Error confirming application profile role:", err);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'system-ui' }}>
        <p style={{ fontSize: '14px', color: '#666' }}>Verifying application profile permissions...</p>
      </div>
    );
  }

  // If not logged in at all, force redirect to Login portal
  if (!user) {
    return <Navigate to="/Login" replace />;
  }

  // If logged in, but the database profile role does not match what the page requires
  if (allowedRole && role !== allowedRole) {
    // Kick drivers away from customer app, or clients away from driver workspace
    return <Navigate to={role === 'driver' ? '/delivery-driver' : '/home'} replace />;
  }

  return children;
}