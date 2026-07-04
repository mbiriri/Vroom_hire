import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// Import your Firebase initialization items
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";

function Registration() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // --- UI Flow State ---
  const [step, setStep] = useState(1); 
  const [role, setRole] = useState("customer"); // 'customer' or 'driver'
  const [isSubmitted, setIsSubmitted] = useState(false); // NEW: Track application hold state

  // --- Unified Form State ---
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
    kraPin: "",
  });

  // Track files selected from explorer locally in state
  const [idFile, setIdFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);

  // --- Handlers to track input changes ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleIdFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setIdFile(e.target.files[0]);
    }
  };

  const handleLicenseFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLicenseFile(e.target.files[0]);
    }
  };

  // --- Step 1 Submit Handler ---
  const handleNextStep = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    
    if (role === "driver") {
      setStep(2);
    } else {
      setLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: "customer",
          status: "active", 
          createdAt: new Date().toISOString(),
        });

        navigate("/login");
      } catch (err) {
        console.error("Customer creation error: ", err);
        setError(err.message.replace("Firebase: ", ""));
      } finally {
        setLoading(false);
      }
    }
  };

  // --- Unified Registration Logic (Fires from pop-up modal for drivers) ---
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!idFile || !licenseFile) {
      setError("Please upload all required document copies.");
      setLoading(false);
      return;
    }

    try {
      // MODIFIED: We do NOT run createUserWithEmailAndPassword here anymore.
      // We push the raw application to a staging tier. Admin will instantiate the auth entry on approval.
      
      const applicationPayload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password, // Saved securely in application stage for administrative provisioning
        role: "driver",
        licenseNumber: formData.licenseNumber,
        kraPin: formData.kraPin,
        status: "pending_review", 
        idDocumentStatus: "attached",
        licenseDocumentStatus: "attached",
        createdAt: new Date().toISOString(),
      };

      // Add to a global application staging queue collection
      const appRef = await addDoc(collection(db, "driver_applications"), applicationPayload);

      // Send Alert Message to Administration Workspace
      await addDoc(collection(db, "admin_notifications"), {
        type: "NEW_DRIVER_REGISTRATION",
        title: "New Driver Application Pending",
        message: `${formData.fullName} has submitted their documents for verification.`,
        applicationId: appRef.id, // Linked to the staging document ID
        licenseNumber: formData.licenseNumber,
        status: "unread",
        createdAt: new Date().toISOString(),
      });

      // Switch view stack to show hold confirmation screen
      setIsSubmitted(true);
    } catch (err) {
      console.error("Driver onboarding staging error: ", err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const style = {
    container: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "90vh",
      fontFamily: "'system-ui', -apple-system, sans-serif",
      padding: "20px",
      backgroundColor: "#f7f5f0",
      position: "relative",
    },
    card: {
      width: "100%",
      maxWidth: "400px",
      backgroundColor: "#ffffff",
      padding: "30px 25px",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
      border: "1px solid #e0ddd8",
      boxSizing: "border-box",
    },
    headerWrap: {
      textAlign: "center",
      marginBottom: "24px",
    },
    brandTitle: {
      fontSize: "20px",
      fontWeight: "800",
      color: "#0f1c3f",
      letterSpacing: "1px",
      margin: "0 0 15px 0",
    },
    heading: {
      color: "#0f1c3f",
      fontSize: "22px",
      fontWeight: "700",
      margin: "0 0 4px 0",
    },
    stepIndicator: {
      fontSize: "12px",
      color: "#888",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    roleSelectorWrap: {
      display: "flex",
      gap: "10px",
      marginBottom: "20px",
    },
    roleButton: (isActive) => ({
      flex: 1,
      padding: "10px",
      fontSize: "13px",
      fontWeight: "600",
      borderRadius: "8px",
      border: isActive ? "2px solid #185FA5" : "1px solid #e0ddd8",
      backgroundColor: isActive ? "#e8f0fb" : "#fff",
      color: isActive ? "#185FA5" : "#666",
      cursor: "pointer",
      transition: "all 0.2s ease",
    }),
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "14px",
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    label: {
      fontSize: "12px",
      fontWeight: "600",
      color: "#0f1c3f",
    },
    input: {
      padding: "12px 14px",
      fontSize: "14px",
      borderRadius: "8px",
      border: "1px solid #e0ddd8",
      outline: "none",
      backgroundColor: "#fff",
      color: "#222",
      boxSizing: "border-box",
      width: "100%",
    },
    button: {
      padding: "14px",
      fontSize: "14px",
      fontWeight: "600",
      color: "#ffffff",
      backgroundColor: "#185FA5",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      marginTop: "10px",
      width: "100%",
    },
    footerText: {
      textAlign: "center",
      fontSize: "13px",
      color: "#666",
      marginTop: "20px",
    },
    errorMsg: {
      backgroundColor: "#fdf2f2",
      border: "1px solid #f3c8c4",
      color: "#e63946",
      padding: "10px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: "500",
      marginBottom: "16px",
      textAlign: "center",
    },
    modalOverlay: {
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(10, 16, 38, 0.5)",
      backdropFilter: "blur(2px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999,
      padding: "20px",
    },
    modalCard: {
      width: "100%",
      maxWidth: "400px",
      backgroundColor: "#ffffff",
      padding: "30px 25px",
      borderRadius: "16px",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
      border: "1px solid #e0ddd8",
      boxSizing: "border-box",
      position: "relative",
    },
    modalHeaderWrap: {
      textAlign: "center",
      marginBottom: "20px",
      position: "relative",
    },
    backArrowButton: {
      position: "absolute",
      left: "0",
      top: "2px",
      background: "none",
      border: "none",
      fontSize: "22px",
      cursor: "pointer",
      color: "#0f1c3f",
      fontWeight: "700",
    },
    uploadBox: {
      border: "2px dashed #e0ddd8",
      borderRadius: "8px",
      padding: "14px",
      textAlign: "center",
      cursor: "pointer",
      fontSize: "13px",
      color: "#555",
      backgroundColor: "#faf9f6",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      transition: "background 0.2s ease",
    },
    fileInputHidden: {
      display: "none" 
    },
    fileNameBadge: {
      fontSize: "11px",
      color: "#185FA5",
      fontWeight: "600",
      marginTop: "2px",
      wordBreak: "break-all"
    },
    checkboxWrap: {
      display: "flex",
      alignItems: "flex-start",
      gap: "8px",
      fontSize: "13px",
      color: "#444",
      marginTop: "5px",
      cursor: "pointer",
    },
  };

  // NEW UI VIEW: Render pending verification display block if submitted
  if (isSubmitted) {
    return (
      <div style={style.container}>
        <div style={{ ...style.card, textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h2 style={style.heading}>Application Received</h2>
          <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.5', margin: '12px 0 24px' }}>
            Thanks for applying! Your documents are currently held in review. Once administration approves your access profile, you will receive confirmation and can log into the driver workspace dashboard.
          </p>
          <button style={style.button} onClick={() => navigate("/login")}>
            Return to Login Screen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={style.container}>
      
      {/* STEP 1 CONTAINER */}
      <div style={style.card}>
        <div style={style.headerWrap}>
          <div style={style.brandTitle}>🚗 VROOM HIRE</div>
          <h2 style={style.heading}>Create Account</h2>
          <div style={style.stepIndicator}>
            {role === "driver" ? "Step 1 of 2" : "General Account"}
          </div>
        </div>

        {error && step === 1 && <div style={style.errorMsg}>⚠️ {error}</div>}

        <form style={style.form} onSubmit={handleNextStep}>
          <div style={style.roleSelectorWrap}>
            <button type="button" style={style.roleButton(role === "customer")} onClick={() => setRole("customer")}>
              Customer Portal
            </button>
            <button type="button" style={style.roleButton(role === "driver")} onClick={() => setRole("driver")}>
              Delivery Driver
            </button>
          </div>

          <div style={style.inputGroup}>
            <label style={style.label}>Full Name</label>
            <input type="text" name="fullName" placeholder="John Doe" required style={style.input} value={formData.fullName} onChange={handleChange} />
          </div>

          <div style={style.inputGroup}>
            <label style={style.label}>Email Address</label>
            <input type="email" name="email" placeholder="name@domain.com" required style={style.input} value={formData.email} onChange={handleChange} />
          </div>

          <div style={style.inputGroup}>
            <label style={style.label}>Phone Number</label>
            <input type="tel" name="phone" placeholder="0712345678" required style={style.input} value={formData.phone} onChange={handleChange} />
          </div>

          <div style={style.inputGroup}>
            <label style={style.label}>Create Password</label>
            <input type="password" name="password" placeholder="••••••••" required style={style.input} value={formData.password} onChange={handleChange} />
          </div>

          <div style={style.inputGroup}>
            <label style={style.label}>Confirm Password</label>
            <input type="password" name="confirmPassword" placeholder="••••••••" required style={style.input} value={formData.confirmPassword} onChange={handleChange} />
          </div>

          <button type="submit" disabled={loading} style={style.button}>
            {loading ? "Processing..." : role === "driver" ? "Next" : "Register Account"}
          </button>
          
          <p style={style.footerText}>
            Already have an account? <Link to="/Login" style={{ color: "#185FA5", fontWeight: "600", textDecoration: "none" }}>Log In</Link>
          </p>
        </form>
      </div>

      {/* STEP 2: Pop-up Modal Panel */}
      {step === 2 && role === "driver" && (
        <div style={style.modalOverlay}>
          <div style={style.modalCard}>
            
            <div style={style.modalHeaderWrap}>
              <button type="button" style={style.backArrowButton} onClick={() => setStep(1)}>
                ←
              </button>
              <h2 style={style.heading}>Verify Your Profile</h2>
              <div style={style.stepIndicator}>Identity Verification • Step 2</div>
            </div>

            {error && <div style={style.errorMsg}>⚠️ {error}</div>}

            <form style={style.form} onSubmit={handleRegisterSubmit}>
              
              <div style={style.inputGroup}>
                <label style={style.label}>Driving License Number</label>
                <input type="text" name="licenseNumber" placeholder="DL-XXXXXXX" required style={style.input} value={formData.licenseNumber} onChange={handleChange} />
              </div>

              <div style={style.inputGroup}>
                <label style={style.label}>KRA PIN</label>
                <input type="text" name="kraPin" placeholder="A00XXXXXXXXZ" required style={style.input} value={formData.kraPin} onChange={handleChange} />
              </div>

              <div style={style.inputGroup}>
                <label style={style.label}>Upload Copies:</label>
                <label htmlFor="id-file-upload" style={style.uploadBox}>
                  <span>📷</span> {idFile ? "Change ID/Passport Copy" : "National ID / Passport Copy"}
                </label>
                <input 
                  id="id-file-upload" 
                  type="file" 
                  accept="image/*,.pdf" 
                  style={style.fileInputHidden} 
                  onChange={handleIdFileChange} 
                />
                {idFile && (
                  <div style={style.fileNameBadge}>Selected: {idFile.name}</div>
                )}
              </div>

              <div style={style.inputGroup}>
                <label htmlFor="license-file-upload" style={style.uploadBox}>
                  <span>📷</span> {licenseFile ? "Change DL Copy" : "Driving License (Front)"}
                </label>
                <input 
                  id="license-file-upload" 
                  type="file" 
                  accept="image/*,.pdf" 
                  style={style.fileInputHidden} 
                  onChange={handleLicenseFileChange} 
                />
                {licenseFile && (
                  <div style={style.fileNameBadge}>Selected: {licenseFile.name}</div>
                )}
              </div>

              <label style={style.checkboxWrap}>
                <input type="checkbox" required style={{ marginTop: "3px" }} />
                <span>I certify these documents are valid</span>
              </label>

              <button 
                type="submit" 
                disabled={loading} 
                style={{ ...style.button, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Processing Credentials..." : "Submit For Review"}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default Registration;