import { useEffect, useState } from 'react';

// 1. Import your Firebase core tools
import { db } from "../firebase"; // Points to your src/firebase.js configuration
import { collection, getDocs, query, orderBy } from "firebase/firestore";

function PaymentPanel() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Fetch payments from your Firestore cloud database ordered by newest first
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const paymentsRef = collection(db, "payments");
        // Sorts records dynamically by date
        const q = query(paymentsRef, orderBy("paymentDate", "desc"));
        const querySnapshot = await getDocs(q);
        
        const paymentsArray = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setPayments(paymentsArray);
      } catch (err) {
        console.error("Error loading payments from Firestore:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  if (loading) return <p style={{ fontSize: '13px', color: '#999' }}>Loading transaction records...</p>;
  if (error) return <p style={{ fontSize: '13px', color: '#e63946' }}>Error loading transactions: {error}</p>;

  const thStyle = { padding: '12px 10px', background: '#f4f6f9', color: '#0f1c3f', fontWeight: '700', textAlign: 'left' };
  const tdStyle = { padding: '12px 10px', color: '#555', borderBottom: '1px solid #eef0f4' };

  return (
    <div>
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f1c3f', marginBottom: '2px' }}>
          Payments Management Ledger
        </h2>
        <p style={{ fontSize: '13px', color: '#888' }}>
          Track customer payments, billing dates, and transactions history.
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ece9e3' }}>
              <th style={thStyle}>Transaction ID</th>
              <th style={thStyle}>Customer Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Payment Date</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '30px', color: '#999' }}>
                  No payment histories found in database.
                </td>
              </tr>
            ) : (
              payments.map(p => (
                <tr key={p.id} style={{ transition: 'background 0.2s' }}>
                  <td style={{ ...tdStyle, fontWeight: '600', color: '#185FA5' }}>{p.id.substring(0, 8).toUpperCase()}...</td>
                  <td style={{ ...tdStyle, fontWeight: '600', color: '#0f1c3f' }}>{p.customerName || 'N/A'}</td>
                  <td style={tdStyle}>{p.customerEmail || 'N/A'}</td>
                  <td style={{ ...tdStyle, fontWeight: '600', color: '#0f1c3f' }}>
                    KES {Number(p.amount || 0).toLocaleString()}
                  </td>
                  <td style={tdStyle}>
                    {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-KE', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      background: p.status === 'completed' || p.status === 'paid' ? '#e6f4ea' : '#feeedc',
                      color: p.status === 'completed' || p.status === 'paid' ? '#0f6e56' : '#b06000'
                    }}>
                      {p.status || 'pending'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PaymentPanel;