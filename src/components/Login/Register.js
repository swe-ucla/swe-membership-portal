import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import React, { useState } from "react";
import { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "./login.css";
import SignInwithGoogle from "../signInWIthGoogle";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const navigate = useNavigate();
  const adminEmails = [
    "ewi.swe.ucla@gmail.com",
    "mentorship.swe.ucla@gmail.com",
    "webmaster.swe.ucla@gmail.com",
    "advocacy.swe.ucla@gmail.com",
    "teamtech.swe.ucla@gmail.com",
    "studentrelations.swe.ucla@gmail.com",
    "lobbying.swe.ucla@gmail.com",
    "president.swe.ucla@gmail.com",
    "ivp.swe.ucla@gmail.com",
    "evp.swe.ucla@gmail.com",
    "outreach.swe.ucla@gmail.com",
    "secretary.swe.ucla@gmail.com",
    "graduate.swe.ucla@gmail.com",
    "publicity.swe.ucla@gmail.com",
    "alumnirelations.swe.ucla@gmail.com",
    "historian.swe.ucla@gmail.com",
  ];

  const handleEmailChange = (e) => {
    const inputEmail = e.target.value;
    setEmail(inputEmail);

    if (inputEmail && !inputEmail.endsWith("g.ucla.edu")) {
      setError("Email must end with g.ucla.edu");
      return;
    } else {
      setError("");
    }
  };
  const handleRegister = async (e) => {
    e.preventDefault();

    // Check if email ends with 'g.ucla.edu'
    if (!email.endsWith("g.ucla.edu")) {
      setError("Email must end with g.ucla.edu");
      return; // Exit early if email is not valid
    }

    // Check password length
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      toast.error("Password must be at least 6 characters long", {
        position: "top-center",
      });
      return;
    }

    try {
      // Attempt to create user with Firebase authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user && user.uid) {
        try {
          // Send email verification immediately after account creation
          await sendEmailVerification(user);
          console.log("Verification email sent to:", user.email);
          
          const isAdmin = adminEmails.includes(user.email);
          // Store user information in Firestore
          await setDoc(doc(db, "Users", user.uid), {
            email: user.email,
            firstName: fname,
            lastName: lname,
            photo: "",
            swePoints: 10,
            isAdmin: isAdmin,
            attendedEvents: [],
            rsvpEvents: [],
            emailVerified: false,
          });
          
          // Sign out user so they must verify email before logging in
          await auth.signOut();
          
          setIsVerificationSent(true);
          toast.success("Account created! Verification email sent to " + user.email, {
            position: "top-center",
          });
          // Don't navigate - keep user on registration page
        } catch (verificationError) {
          console.error("Error sending verification email:", verificationError);
          toast.error("Account created but failed to send verification email: " + verificationError.message, {
            position: "top-center",
          });
        }
      }
      return; // Exit here to prevent any navigation
    } catch (error) {
      console.error(error.message);
      if (error.code === "auth/email-already-in-use") {
        setError(
          "This email is already registered. Please use a different email or log in."
        );
        toast.error(
          "This email is already registered. Please use a different email or log in.",
          {
            position: "top-center",
          }
        );
      } else {
        toast.error(error.message, {
          position: "top-center",
        });
      }
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-inner">
        <form onSubmit={handleRegister}>
          <h3>Sign Up</h3>

          <div className="mb-3">
            <input
              type="text"
              className="register-form-control"
              placeholder="First name"
              style={{ marginBottom: "0px" }}
              onChange={(e) => setFname(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <input
              type="text"
              className="register-form-control"
              placeholder="Last name"
              style={{ marginBottom: "0px" }}
              onChange={(e) => setLname(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <input
              type="email"
              className="form-control"
              placeholder="Enter email"
              value={email}
              onChange={handleEmailChange}
              required
            />
            {error && <div className="text-danger">{error}</div>}
          </div>

          <div className="mb-3">
            <input
              type="password"
              className="form-control"
              placeholder="Enter password"
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(""); // Clear password error when user types
              }}
              required
            />
            {passwordError && (
              <div className="text-danger">{passwordError}</div>
            )}
          </div>

          <div className="d-grid">
            <button type="submit" className="btn btn-primary" disabled={isVerificationSent}>
              {isVerificationSent ? "Verification Email Sent" : "Sign Up"}
            </button>
          </div>
          
          {isVerificationSent && (
            <div className="verification-message" style={{marginTop: "15px", padding: "10px", backgroundColor: "#d4edda", border: "1px solid #c3e6cb", borderRadius: "5px", color: "#155724"}}>
              <p>Please check your email and click the verification link before logging in.</p>
            </div>
          )}
          <p className="forgot-password text-right">
            Already registered? <a href="/login">Login</a>
          </p>
          <SignInwithGoogle />
        </form>
      </div>
    </div>
  );
}
export default Register;
