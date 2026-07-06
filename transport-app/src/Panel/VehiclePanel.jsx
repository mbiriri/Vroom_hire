import { useEffect, useState } from 'react';
import { db } from "../firebase"; 
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";

function VehiclePanel(){
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);   
    const [sortByHires, setSortByHires] = useState(false);
    const [toggleId, setToggleId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        Vehicle_id: '',
        Vehicle_Name: '',
        Color: '',
        Mileage: '',
        Number: '',
        Image_Url: '',
        IsAvailable: true
    });

    const loadVehicles = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "vehicles"));
            const vehiclesArray = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setVehicles(vehiclesArray);
        } catch (err) {
            console.error("Error reading vehicles from Firestore:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVehicles();
    }, []);

    // Handle Form Input Changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Add New Vehicle
    const handleAddVehicle = async (e) => {
        e.preventDefault();
        if (!formData.Vehicle_id.trim()) return alert("Vehicle ID is required!");

        try {
            const targetId = formData.Vehicle_id.trim();
            const docRef = doc(db, "vehicles", targetId);
            
            const newVehicleData = {
                Vehicle_id: targetId,
                Vehicle_Name: formData.Vehicle_Name,
                Color: formData.Color,
                Mileage: Number(formData.Mileage) || 0,
                Number: formData.Number,
                Image_Url: formData.Image_Url || "https://via.placeholder.com/150",
                IsAvailable: formData.IsAvailable,
                hire_count: 0
            };

            // Save to Firestore using custom ID
            await setDoc(docRef, newVehicleData);

            // Update local UI state
            setVehicles(prev => [...prev, newVehicleData]);

            // Reset Form
            setFormData({
                Vehicle_id: '',
                Vehicle_Name: '',
                Color: '',
                Mileage: '',
                Number: '',
                Image_Url: '',
                IsAvailable: true
            });
            alert("Vehicle added successfully!");
        } catch (err) {
            console.error("Error adding vehicle:", err);
            alert("Failed to add vehicle: " + err.message);
        }
    };

    // Delete Vehicle
    const handleDeleteVehicle = async (id) => {
        if (!window.confirm("Are you sure you want to permanently remove this vehicle?")) return;
        
        try {
            await deleteDoc(doc(db, "vehicles", id));
            setVehicles(prev => prev.filter(v => (v.Vehicle_id !== id && v.id !== id)));
            alert("Vehicle removed successfully!");
        } catch (err) {
            console.error("Error deleting vehicle:", err);
            alert("Failed to delete vehicle: " + err.message);
        }
    };

    const handleToggleAvailable = async (vehicle) => {
        const targetId = vehicle.Vehicle_id || vehicle.id;
        setToggleId(targetId);
        
        try {
            const vehicleRef = doc(db, "vehicles", targetId);
            const nextAvailabilityValue = !vehicle.IsAvailable;
            
            await updateDoc(vehicleRef, {
                IsAvailable: nextAvailabilityValue
            });

            setVehicles(prev =>
                prev.map(v => ((v.Vehicle_id === targetId || v.id === targetId) 
                    ? { ...v, IsAvailable: nextAvailabilityValue } 
                    : v
                ))
            );
        } catch (err) {
            console.error("Error updating vehicle status:", err);
            alert(err.message);
        } finally {
            setToggleId(null);
        }
    };

    const displayedVehicles = sortByHires
        ? [...vehicles].sort((a, b) => (b.hire_count || 0) - (a.hire_count || 0))
        : vehicles;

    if (loading) return <p style={{ fontSize: '13px', color: '#999' }}>Loading vehicles...</p>;
    if (error) return <p style={{ fontSize: '13px', color: '#e63946' }}>Error loading vehicles: {error}</p>;

    return (
        <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
            {/* ADD VEHICLE FORM COMPONENT */}
            <div style={{ background: '#f9f8f6', border: '1px solid #ece9e3', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f1c3f', marginTop: 0, marginBottom: '14px' }}>Add New Vehicle to Fleet</h3>
                <form onSubmit={handleAddVehicle} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Vehicle ID</label>
                        <input type="text" name="Vehicle_id" value={formData.Vehicle_id} onChange={handleInputChange} required style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Vehicle Name</label>
                        <input type="text" name="Vehicle_Name" value={formData.Vehicle_Name} onChange={handleInputChange} required style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Color</label>
                        <input type="text" name="Color" value={formData.Color} onChange={handleInputChange} required style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Mileage (km/l)</label>
                        <input type="number" name="Mileage" value={formData.Mileage} onChange={handleInputChange} required style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Plate Number</label>
                        <input type="text" name="Number" value={formData.Number} onChange={handleInputChange} required style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Photo Image URL</label>
                        <input type="url" name="Image_Url" value={formData.Image_Url} onChange={handleInputChange} placeholder="https://..." style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div style={{ paddingBottom: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                            <input type="checkbox" name="IsAvailable" checked={formData.IsAvailable} onChange={handleInputChange} style={{ marginRight: '6px' }} />
                            Available Immediately
                        </label>
                    </div>
                    <button type="submit" style={{ background: '#0F6E56', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        Save Vehicle
                    </button>
                </form>
            </div>

            {/* MANAGEMENT TABLE */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f1c3f', marginBottom: '2px' }}>Vehicles Administration Panel</h2>
                    <p style={{ fontSize: '13px', color: '#888', marginBottom: '0' }}>Manage availability, view fleet specifics, and configure performance assets.</p>
                </div>
                <button
                    onClick={() => setSortByHires(prev => !prev)}
                    style={{
                        background: sortByHires ? '#185FA5' : 'transparent',
                        color: sortByHires ? '#fff' : '#185FA5',
                        border: '1.5px solid #185FA5',
                        borderRadius: '6px',
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    {sortByHires ? 'Sorted by most hired' : 'Sort by most hired'}
                </button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #ece9e3', textAlign: 'left' }}>
                        <th style={{ padding: '10px 8px' }}>Preview</th>
                        <th style={{ padding: '10px 8px' }}>Vehicle</th>
                        <th style={{ padding: '10px 8px' }}>Number</th>
                        <th style={{ padding: '10px 8px' }}>Color</th>
                        <th style={{ padding: '10px 8px' }}>Mileage</th>
                        <th style={{ padding: '10px 8px' }}>Times Hired</th>
                        <th style={{ padding: '10px 8px' }}>Status</th>
                        <th style={{ padding: '10px 8px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {displayedVehicles.map(v => {
                        const currentId = v.Vehicle_id || v.id;
                        return (
                            <tr key={currentId} style={{ borderBottom: '1px solid #f0eee9' }}>
                                <td style={{ padding: '6px 8px' }}>
                                    <img src={v.Image_Url || "https://via.placeholder.com/50"} alt={v.Vehicle_Name} style={{ width: '45px', height: '30px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
                                </td>
                                <td style={{ padding: '10px 8px', fontWeight: 600, color: '#0f1c3f' }}>{v.Vehicle_Name}</td>
                                <td style={{ padding: '10px 8px', color: '#666' }}>{v.Number || 'N/A'}</td>
                                <td style={{ padding: '10px 8px', color: '#666' }}>{v.Color}</td>
                                <td style={{ padding: '10px 8px', color: '#666' }}>{v.Mileage} km/l</td>
                                <td style={{ padding: '10px 8px', color: '#666' }}>{v.hire_count ?? 0}</td>
                                <td style={{ padding: '10px 8px', color: v.IsAvailable ? '#0F6E56' : '#e63946' }}>
                                    {v.IsAvailable ? 'Available' : 'Unavailable'}
                                </td>
                                <td style={{ padding: '10px 8px', display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => handleToggleAvailable(v)}
                                        disabled={toggleId === currentId}
                                        style={{
                                            background: 'transparent',
                                            color: '#185FA5',
                                            border: '1.5px solid #185FA5',
                                            borderRadius: '6px',
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: toggleId === currentId ? 'wait' : 'pointer',
                                            opacity: toggleId === currentId ? 0.6 : 1,
                                        }}
                                    >
                                        {v.IsAvailable ? 'Mark unavailable' : 'Mark available'}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteVehicle(currentId)}
                                        style={{
                                            background: 'transparent',
                                            color: '#e63946',
                                            border: '1.5px solid #e63946',
                                            borderRadius: '6px',
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default VehiclePanel;