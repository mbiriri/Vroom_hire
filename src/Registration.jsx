import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function Registration() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "", email: "", phone: "", password: "", confirmPassword: "",
    licenseNumber: "", kraPin: "",
  });

  const [idFile, setIdFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);

  // --- CLOUDINARY UPLOAD FUNCTION ---
  const uploadToCloudinary = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "vroom_preset"); // ADD YOUR PRESET HERE

    const res = await fetch(`https://api.cloudinary.com/v1_1/gyjk8o0z/image/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.secure_url;
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleIdFileChange = (e) => { if (e.target.files?.[0]) setIdFile(e.target.files[0]); };
  const handleLicenseFileChange = (e) => { if (e.target.files?.[0]) setLicenseFile(e.target.files[0]); };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    setStep(2);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Upload to Cloudinary
      const idUrl = await uploadToCloudinary(idFile);
      const licenseUrl = await uploadToCloudinary(licenseFile);

      // 2. Save URLs to Firestore instead of just filenames
      await addDoc(collection(db, "customer_applications"), {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        licenseNumber: formData.licenseNumber,
        kraPin: formData.kraPin,
        idImageUrl: idUrl,          // URL saved
        licenseImageUrl: licenseUrl, // URL saved
        status: "pending",
        role: "customer",
        createdAt: serverTimestamp(),
      });
      setIsSubmitted(true);
    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
    const approveCustomer = async (application) => {
  // 1. Create the user in the 'users' collection
  await setDoc(doc(db, "users", application.userId), {
    fullName: application.fullName,
    email: application.email,
    phone: application.phone, 
    role: "customer",
    status: "active",
    createdAt: serverTimestamp(),
  });
  
  // 2. Delete the application
  await deleteDoc(doc(db, "customer_applications", application.id));
};
  };

  const style = {
    container: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "90vh", fontFamily: "'system-ui', -apple-system, sans-serif", padding: "20px", backgroundColor: "#f7f5f0", position: "relative" },
    card: { width: "100%", maxWidth: "400px", backgroundColor: "#ffffff", padding: "30px 25px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)", border: "1px solid #e0ddd8", boxSizing: "border-box" },
    headerWrap: { textAlign: "center", marginBottom: "24px" },
    brandTitle: { fontSize: "20px", fontWeight: "800", color: "#0f1c3f", letterSpacing: "1px", margin: "0 0 15px 0" },
    heading: { color: "#0f1c3f", fontSize: "22px", fontWeight: "700", margin: "0 0 4px 0" },
    stepIndicator: { fontSize: "12px", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" },
    form: { display: "flex", flexDirection: "column", gap: "14px" },
    inputGroup: { display: "flex", flexDirection: "column", gap: "4px" },
    label: { fontSize: "12px", fontWeight: "600", color: "#0f1c3f" },
    input: { padding: "12px 14px", fontSize: "14px", borderRadius: "8px", border: "1px solid #e0ddd8", outline: "none", backgroundColor: "#fff", color: "#222", boxSizing: "border-box", width: "100%" },
    button: { padding: "14px", fontSize: "14px", fontWeight: "600", color: "#ffffff", backgroundColor: "#185FA5", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: "10px", width: "100%" },
    footerText: { textAlign: "center", fontSize: "13px", color: "#666", marginTop: "20px" },
    errorMsg: { backgroundColor: "#fdf2f2", border: "1px solid #f3c8c4", color: "#e63946", padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: "500", marginBottom: "16px", textAlign: "center" },
    modalOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(10, 16, 38, 0.5)", backdropFilter: "blur(2px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999, padding: "20px" },
    modalCard: { width: "100%", maxWidth: "400px", backgroundColor: "#ffffff", padding: "30px 25px", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)", border: "1px solid #e0ddd8", boxSizing: "border-box", position: "relative" },
    modalHeaderWrap: { textAlign: "center", marginBottom: "20px", position: "relative" },
    backArrowButton: { position: "absolute", left: "0", top: "2px", background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#0f1c3f", fontWeight: "700" },
    uploadBox: { border: "2px dashed #e0ddd8", borderRadius: "8px", padding: "14px", textAlign: "center", cursor: "pointer", fontSize: "13px", color: "#555", backgroundColor: "#faf9f6", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
    fileInputHidden: { display: "none" },
    fileNameBadge: { fontSize: "11px", color: "#185FA5", fontWeight: "600", marginTop: "2px" },
    checkboxWrap: { display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#444", marginTop: "5px", cursor: "pointer" }
  };

  if (isSubmitted) {
    return (
      <div style={style.container}>
        <div style={{ ...style.card, textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📩</div>
          <h2 style={style.heading}>Application Submitted</h2>
          <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.5', margin: '12px 0 24px' }}>
            Your application is under review. Once an admin approves your profile, you will be able to log in.
          </p>
          <button style={style.button} onClick={() => navigate("/")}>Return Home</button>
        </div>
      </div>
    );
  }

  return (
    <div style={style.container}>
      <div style={style.card}>
        <div style={style.headerWrap}>
            <div style={style.brandTitle}>🚗 VROOM HIRE</div>
            <h2 style={style.heading}>Create Account</h2>
            <div style={style.stepIndicator}>Customer Sign Up — Step 1 of 2</div>
        </div>
        <form style={style.form} onSubmit={handleNextStep}>
          <div style={style.inputGroup}><label style={style.label}>Full Name</label><input type="text" name="fullName" placeholder="John Doe" required style={style.input} value={formData.fullName} onChange={handleChange} /></div>
          <div style={style.inputGroup}><label style={style.label}>Email Address</label><input type="email" name="email" placeholder="name@domain.com" required style={style.input} value={formData.email} onChange={handleChange} /></div>
          <div style={style.inputGroup}><label style={style.label}>Phone Number</label><input type="tel" name="phone" placeholder="0712345678" required style={style.input} value={formData.phone} onChange={handleChange} /></div>
          <div style={style.inputGroup}><label style={style.label}>Create Password</label><input type="password" name="password" placeholder="••••••••" required style={style.input} value={formData.password} onChange={handleChange} /></div>
          <div style={style.inputGroup}><label style={style.label}>Confirm Password</label><input type="password" name="confirmPassword" placeholder="••••••••" required style={style.input} value={formData.confirmPassword} onChange={handleChange} /></div>
          <button type="submit" style={style.button}>Continue to Verification</button>
          <p style={style.footerText}>Already have an account? <Link to="/Login" style={{ color: "#185FA5", fontWeight: "600", textDecoration: "none" }}>Log In</Link></p>
        </form>
      </div>

      {step === 2 && (
        <div style={style.modalOverlay}>
          <div style={style.modalCard}>
            <div style={style.modalHeaderWrap}>
              <button type="button" style={style.backArrowButton} onClick={() => setStep(1)}>←</button>
              <h2 style={style.heading}>Verify Your Profile</h2>
              <div style={style.stepIndicator}>Identity Verification • Step 2</div>
            </div>
            {error && <div style={style.errorMsg}>⚠️ {error}</div>}
            <form style={style.form} onSubmit={handleRegisterSubmit}>
              <div style={style.inputGroup}><label style={style.label}>Driving License Number</label><input type="text" name="licenseNumber" placeholder="KCD 12345" required style={style.input} value={formData.licenseNumber} onChange={handleChange} /></div>
              <div style={style.inputGroup}><label style={style.label}>KRA PIN</label><input type="text" name="kraPin" placeholder="A00XXXXXXXXZ" required style={style.input} value={formData.kraPin} onChange={handleChange} /></div>
              <div style={style.inputGroup}>
                <label style={style.label}>Upload Copies</label>
                <label htmlFor="id-file-upload" style={style.uploadBox}><span>📷</span> {idFile ? "Change ID" : "National ID Copy"}</label>
                <input id="id-file-upload" type="file" accept="image/*,.pdf" style={style.fileInputHidden} onChange={handleIdFileChange} />
              </div>
              <div style={style.inputGroup}>
                <label style={style.label}>Driving License Copy</label>
                <label htmlFor="license-file-upload" style={style.uploadBox}><span>📷</span> {licenseFile ? "Change License" : "Driving License (Front)"}</label>
                <input id="license-file-upload" type="file" accept="image/*,.pdf" style={style.fileInputHidden} onChange={handleLicenseFileChange} />
              </div>
              <label style={style.checkboxWrap}><input type="checkbox" required /><span>I certify these documents are valid</span></label>
              <button type="submit" disabled={loading} style={style.button}>{loading ? "Creating Account..." : "Complete Registration"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Registration;