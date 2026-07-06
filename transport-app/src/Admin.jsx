import { useState } from 'react';
import './App.css';
import './Navbar.css';

import UserPanel from './Panel/UserPanel';
import PaymentPanel from './Panel/PaymentPanel';
import VehiclePanel from './Panel/VehiclePanel';

const icons = {
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  ),
  vehicle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 13l2-5a2 2 0 012-1h10a2 2 0 012 1l2 5" />
      <rect x="2" y="13" width="20" height="6" rx="1.5" />
      <circle cx="7" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </svg>
  ),
  payment: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 9h20" />
    </svg>
  ),
};

function Admin() {
  const [activeTab, setActiveTab] = useState('users');
  const [collapsed, setCollapsed] = useState(false);

  const tabs = [
    { key: 'users', label: 'Users', icon: icons.users },
    { key: 'vehicle', label: 'Fleet', icon: icons.vehicle },
    { key: 'payment', label: 'Payments', icon: icons.payment },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'users': return <UserPanel />;
      case 'payment': return <PaymentPanel />;
      case 'vehicle': return <VehiclePanel />;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'system-ui,sans-serif' }}>
      <nav
        style={{
          width: collapsed ? '64px' : '220px',
          flexShrink: 0,
          background: '#fff',
          borderRight: '1px solid #e2e2e2',
          height: '100vh',
          overflowY: 'auto',
          transition: 'width 0.2s ease',
        }}
      >
        <div
          onClick={() => setCollapsed(prev => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '18px 20px',
            borderBottom: '1px solid #e2e2e2',
            cursor: 'pointer',
            color: '#0f1c3f',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
          {!collapsed && <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px' }}>SIDEBAR</span>}
        </div>

        <ul style={{ listStyle: 'none', margin: 0, padding: '10px 0' }}>
          {tabs.map(tab => (
            <li key={tab.key}>
              <button
                onClick={() => setActiveTab(tab.key)}
                title={tab.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: activeTab === tab.key ? '#e8f0fb' : 'transparent',
                  color: activeTab === tab.key ? '#185FA5' : '#333',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {tab.icon}
                {!collapsed && <span>{tab.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#fafafa' }}>
        {renderContent()}
      </main>
    </div>
  );
}

export default Admin;