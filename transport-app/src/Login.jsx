import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. Firebase Core & Auth Imports
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Assets / Videos
import secondVideo from './assets/12127389_360_640_30fps.mp4';
import thirdVideo  from './assets/4612660-sd_426_226_25fps.mp4';
import forthVideo  from './assets/5558025-sd_426_240_25fps.mp4';
import fifthVideo  from './assets/7464027-sd_426_240_30fps.mp4';
import './App.css';
import './Navbar.css';

const slides = [
  { video: secondVideo,  message: 'Best off-road vehicles for your adventures'},
  { video: thirdVideo,   message: 'Rugged terrain? We have you covered'       },
  { video: forthVideo,   message: 'Comfortable rides for family and friends'  },
  { video: fifthVideo,   message: 'Creating unforgettable memories every day' },
];

// --- VIDEO BACKGROUND SLIDER PANEL (LEFT SIDE) ---
function VideoPanel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ flex: '1', position: 'relative', background: '#0f1c3f', overflow: 'hidden' }}>
      <video
        key={slides[current].video}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
        src={slides[current].video}
        autoPlay loop muted playsInline
      />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,16,38,0.45)', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: '32px', left: '28px', right: '28px', zIndex: 2 }}>
        <p style={{ fontSize: 'clamp(16px,2vw,24px)', fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: '12px', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
          {slides[current].message}
        </p>
      </div>
    </div>
  );
}

// --- MAIN LOGIN & ROUTING PORTAL COMPONENT ---
function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Explicit role choice selector state ('customer' vs 'driver')
  const [selectedRole, setSelectedRole] = useState('customer'); 
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState(null);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);

    try {
      // Authenticate account via Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verify the role match inside your Firestore 'users' document profiles
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      let actualRole = 'customer'; 
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.role) {
          actualRole = userData.role; // e.g. "driver" or "customer" or "admin"
        }
      }

      // Check if the database profile role matches the UI dropdown selection form selection
      if (actualRole !== selectedRole && actualRole !== 'admin') {
        // Sign out immediately so unauthorized token states don't hang out locally
        await signOut(auth);
        throw new Error(`Access Denied. Your account is registered under a ${actualRole} configuration profile.`);
      }

      // Dynamic Forwarding Logic depending on user authorization profile
      if (actualRole === 'admin') {
        navigate('/admin');
      } else if (actualRole === 'driver') {
        navigate('/delivery-driver'); 
      } else {
        navigate('/home'); 
      }

    } catch (err) {
      console.error("Login verification failed: ", err);
      setAuthError(err.message.replace("Firebase: ", ""));
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Form block UI styles
  const inputContainer = { display: 'flex', flexDirection: 'column', gap: '6px' };
  const textInputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e0ddd8', fontSize: '14px', boxSizing: 'border-box', background: '#fff' };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'system-ui,sans-serif', background: '#f7f5f0' }}>
      
      {/* Video branding loop (Left Pane) */}
      <div style={{ display: 'flex', flex: '1.2', minWidth: '0', display: window.innerWidth < 768 ? 'none' : 'flex' }}>
        <VideoPanel />
      </div>

      {/* Dynamic Processing Authentication Pane (Right Hand Container) */}
      <div style={{ flex: '0 0 420px', width: '420px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px', background: '#fff', borderLeft: '1px solid #e0ddd8', boxSizing: 'border-box' }}>
        
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0f1c3f', marginBottom: '4px' }}>Welcome Back</h2>
          <p style={{ fontSize: '13px', color: '#888' }}>Access your centralized fleet workspace profile.</p>
        </div>

        {authError && (
          <div style={{ background: '#fdf2f2', border: '1px solid #f3c8c4', color: '#e63946', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: 500 }}>
            ⚠️ {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={inputContainer}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#0f1c3f' }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@domain.com" style={textInputStyle} required />
          </div>

          <div style={inputContainer}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#0f1c3f' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={textInputStyle} required />
          </div>

          {/* Role Choice dropdown field component */}
          <div style={inputContainer}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#0f1c3f' }}>Log in Portal Type</label>
            <select 
              value={selectedRole} 
              onChange={e => setSelectedRole(e.target.value)} 
              style={{ ...textInputStyle, cursor: 'pointer', appearance: 'none', background: '#fff url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>") no-repeat right 12px center', backgroundSize: '16px' }}
            >
              <option value="customer">Customer Fleet Portal</option>
              <option value="driver">Delivery Driver Workspace</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            style={{
              marginTop: '8px', background: '#185FA5', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '14px 0',
              fontSize: '14px', fontWeight: 600, cursor: isLoggingIn ? 'wait' : 'pointer', opacity: isLoggingIn ? 0.6 : 1, width: '100%'
            }}
          >
            {isLoggingIn ? 'Verifying Account Documents...' : 'Secure Log In'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default Login;