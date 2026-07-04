import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import firstVideo from './assets/background-Video.mp4';
import './App.css';
import './Navbar.css';
import Registration from './Registration';
import Login from './Login';
import Home from './Home';
import Aboutus from './Aboutus';
import DeliveryDriver from './DeliveryDriver';
import BookingVehicle from './BookingVehicle';
import Admin from './Admin';

// Import your Firestore database instance and Auth bindings
import { db, auth } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// --- ROUTE PROTECTION SUB-COMPONENT ---
function ProtectedRoute({ children, allowedRole }) {
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
            setRole(null);
          }
        } catch (err) {
          console.error("Error evaluating role permissions:", err);
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
      <div style={{ display: 'flex', height: '100vh', width: '100vw', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f5f0', fontFamily: 'system-ui' }}>
        <p style={{ color: '#0f1c3f', fontWeight: 600 }}>Verifying Access Authorizations...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/Login" replace />;
  }

  // Admins bypass role gating checks globally
  if (role === 'admin') {
    return children;
  }

  if (allowedRole && role !== allowedRole) {
    // Send matching roles to their distinct layouts if they wander onto the wrong route
    return <Navigate to={role === 'driver' ? '/delivery-driver' : '/home'} replace />;
  }

  return children;
}

// --- NAVBAR ---
function Navbar() {
  return (
    <nav className="navbar">
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/Registration">Registration</Link></li>
        <li><Link to="/Login">Login</Link></li>
        <li> 
          <select name="Contacts" className="nav-dropdown" defaultValue="">
            <option value="">HelpLine- 0718754121</option>
            <option value="">Other Contact-0720354121</option>
            <option value="">Contacts</option>
          </select>
        </li>
        <li><Link to="/Aboutus">About us</Link></li>
      </ul>
    </nav>
  );
}

// --- LOGS ---
function Logs({ name }) {
  return (
    <div>
      <h2>We Are, {name}</h2>
    </div>
  );
}

// --- LEFT SECTION ---
function LeftSection({ setView, backendData }) {
  return (
    <div className="left-side">
      <h1>Hello Welcome to VROOM HIRE</h1>

      <div className="logs-container">
        <Logs name={"Satisfying"} />
        <Logs name={"Happy"} />
        <Logs name={"Content"} />
      </div>

      <div className="text-content">
        <h2>What we offer</h2>
        <p>
          {backendData.left ||
            "We offer a wide range of services to meet your transportation needs. Whether you're looking for a quick ride across town or a comfortable long-distance journey."}
        </p>
        <button onClick={() => setView("services")}>View Services</button>
      </div>
    </div>
  );
}

// --- RIGHT SECTION ---
function RightSection({ images, currentImage, setCurrentImage, backendData }) {
  const nextImage = () => setCurrentImage((currentImage + 1) % images.length);
  const prevImage = () => setCurrentImage((currentImage - 1 + images.length) % images.length);

  return (
    <div className="right-side">
      <h2>Our Fleet</h2>
      <p>{backendData.right || "A Glimpse of what we have"}</p>

      <div className="slideshow-container">
        <img
          src={images[currentImage]}
          alt="Slideshow"
          className="slideshow-image"
        />
      </div>

      <div className="controls">
        <button onClick={prevImage}>← Previous</button>
        <button onClick={nextImage}>Next →</button>
      </div>

      <p style={{ marginTop: '10px', fontSize: '0.85rem', opacity: 0.7 }}>
        Edit <code>src/App.jsx</code> and save to test HMR
      </p>
    </div>
  );
}

// --- MAIN APP ---
function App() {
  const [view, setView] = useState("home");
  const [backendData, setBackendData] = useState({ left: '', right: '' });

  const images = [
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2SUrJs5olEvOggfsdqdJ5VvogfgHlXpEkRQ&s",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQBGq1RF9iHs6OPVtlHV32DRmSFQM4Q3mUgQ&s",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMHkrV5l6VyPza_y2QDXTaUnaeELZY3DPUlA&s"
  ];
  const [currentImage, setCurrentImage] = useState(0);

  // Fetch landing page copy dynamically from Firebase Cloud Firestore
  useEffect(() => {
    const fetchLandingPageData = async () => {
      try {
        const docRef = doc(db, "content", "landingPage");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setBackendData(docSnap.data());
        } else {
          console.log("No custom landing page text found in Firestore, using defaults.");
        }
      } catch (err) {
        console.error("Error reading data from Firestore:", err);
      }
    };

    fetchLandingPageData();
  }, []);

  // Auto-advance slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage(prev => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <>
      {/* Video Background */}
      <div className="video-background">
        <video autoPlay loop muted playsInline className="bg-video">
          <source src={firstVideo} type="video/mp4" />
        </video>
      </div>

      <BrowserRouter>
        <Navbar />

        <div className="page-content">
          <Routes>
            <Route path="/" element={
              <div className="split-container">
                <LeftSection
                  setView={setView}
                  backendData={backendData}
                />
                <RightSection
                  images={images}
                  currentImage={currentImage}
                  setCurrentImage={setCurrentImage}
                  backendData={backendData}
                />
              </div>
            } />

            <Route path="/Registration" element={<Registration/>} />
            <Route path="/Login" element={<Login/>} />
            <Route path="/aboutus" element={<Aboutus/>} />
            
            {/* GATED CUSTOMER CHANNELS */}
            <Route path="/home" element={
              <ProtectedRoute allowedRole="customer">
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/BookingVehicle" element={
              <ProtectedRoute allowedRole="customer">
                <BookingVehicle />
              </ProtectedRoute>
            } />

            {/* GATED DRIVER SPACES */}
            <Route path="/delivery-driver" element={
              <ProtectedRoute allowedRole="driver">
                <DeliveryDriver />
              </ProtectedRoute>
            } />

            {/* GATED ADMINISTRATIVE HUB */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRole="admin">
                <Admin />
              </ProtectedRoute>
            } />

            <Route path="/contact" element={<h2 style={{ padding: '20px' }}>Contact Page Coming Soon</h2>} />
            
            {/* Catch-all Routing Redirect */}
            <Route path="*" element={<Navigate to="/Login" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </>
  );
}

export default App;