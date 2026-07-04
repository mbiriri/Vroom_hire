import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

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

function VideoPanel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ flex:'1', position:'relative', background:'#0f1c3f', overflow:'hidden' }}>
      <video
        key={slides[current].video}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block' }}
        src={slides[current].video}
        autoPlay loop muted playsInline
      />
      <div style={{ position:'absolute', inset:0, background:'rgba(10,16,38,0.45)', zIndex:1 }} />
      <div style={{ position:'absolute', bottom:'32px', left:'28px', right:'28px', zIndex:2 }}>
        <p style={{ fontSize:'clamp(16px,2vw,24px)', fontWeight:700, color:'#fff', lineHeight:1.3,
                    marginBottom:'12px', textShadow:'0 1px 6px rgba(0,0,0,0.6)' }}>
          {slides[current].message}
        </p>
        <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                border:'none', cursor:'pointer', padding:0,
                background: i === current ? '#fff' : 'rgba(255,255,255,0.3)',
                borderRadius:'3px', height:'4px',
                width: i === current ? '24px' : '8px',
                transition:'all 0.3s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VehicleCards({ vehicles, onSelectVehicle }) {
  return (
    <section style={{ width:'100%', background:'#fff', padding:'20px 28px' }}>
      <div style={{ marginBottom:'14px' }}>
        <h2 style={{ fontSize:'18px', fontWeight:700, color:'#0f1c3f', marginBottom:'2px' }}>
          Our vehicles & pricing
        </h2>
        <p style={{ fontSize:'13px', color:'#888' }}>
          Choose the right ride for your journey
        </p>
      </div>

      <div style={{ display:'flex', flexDirection:'row', flexWrap:'wrap', gap:'16px', width:'100%' }}>
        {vehicles.length === 0 && (
          <p style={{ fontSize:'13px', color:'#999' }}>No vehicles available currently...</p>
        )}

        {vehicles.map(v => (
          <div
            key={v.Vehicle_id || v.id}
            style={{
              flex: '1 1 240px', minWidth: '240px',
              background:'#f9f8f6', border:'1px solid #ece9e3', borderRadius:'12px',
              padding:'16px 14px', display:'flex', flexDirection:'column', gap:'5px',
            }}
          >
            {/* RENDER DYNAMIC IMAGE LINK DIRECTLY FROM FIRESTORE DATA */}
            <div style={{ width:'100%', height:'130px', borderRadius:'8px', overflow:'hidden', marginBottom:'6px', border:'1px solid #eae7e0' }}>
                <img 
                  src={v.Image_Url || "https://via.placeholder.com/150"} 
                  alt={v.Vehicle_Name} 
                  style={{ width:'100%', height:'100%', objectFit:'cover' }}
                />
            </div>

            <p style={{ fontSize:'14px', fontWeight:600, color:'#0f1c3f', margin:0 }}>
              {v.Vehicle_Name}
            </p>
            <p style={{ fontSize:'11px', color:'#666', margin:0 }}>🔢 Plate: {v.Number || 'N/A'}</p>
            <p style={{ fontSize:'11px', color:'#999', margin:0 }}>🎨 Color: {v.Color}</p>
            <p style={{ fontSize:'11px', color:'#999', margin:0 }}>⛽ Mileage: {v.Mileage} km/l</p>
            <p style={{ fontSize:'11px', color: v.IsAvailable ? '#0F6E56' : '#e63946', margin:0, fontWeight: 600 }}>
              {v.IsAvailable ? 'Available' : 'Unavailable'}
            </p>

            <button
              onClick={() => onSelectVehicle(v)}
              disabled={!v.IsAvailable}
              style={{
                marginTop:'10px', background:'transparent', color:'#185FA5',
                border:'1.5px solid #185FA5', borderRadius:'6px', padding:'8px 0',
                fontSize:'12px', fontWeight:600,
                cursor: v.IsAvailable ? 'pointer' : 'not-allowed',
                opacity: v.IsAvailable ? 1 : 0.5, width:'100%',
              }}
            >
              Book this vehicle
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Home() {
  const navigate = useNavigate();
  const [liveVehicles, setLiveVehicles] = useState([]);

  // Fetch Live Data Directly from Firestore matching VehiclePanel structure
  useEffect(() => {
    const fetchFleet = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "vehicles"));
        const fleetArray = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLiveVehicles(fleetArray);
      } catch (err) {
        console.error("Error loading fleet from Firestore:", err);
      }
    };

    fetchFleet();
  }, []);

  const handleSelectVehicle = (v) => {
    navigate('/BookingVehicle', { state: { vehicle: v } });  
  };

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100vh', width:'100vw',
      overflow:'x-hidden', margin:0, padding:0, fontFamily:'system-ui,sans-serif', boxSizing:'border-box',
    }}>
      <div style={{ display:'flex', flex:'1', minHeight:'0' }}>
        <VideoPanel />
      </div>

      <VehicleCards vehicles={liveVehicles} onSelectVehicle={handleSelectVehicle} />
    </div>
  );
}

export default Home;