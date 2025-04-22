import { createUserWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import './login.css';
import SignInwithGoogle from "../signInWIthGoogle";


function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
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

    if (inputEmail && !inputEmail.endsWith('g.ucla.edu')) {
      setError('Email must end with g.ucla.edu');
      return;
    } else {
      setError('');
    }
  };
  const handleRegister = async (e) => {
    e.preventDefault();
  
    // Check if email ends with 'g.ucla.edu'
    if (!email.endsWith('g.ucla.edu')) {
      setError('Email must end with g.ucla.edu');
      return; // Exit early if email is not valid
    }

    // Check password length
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      toast.error('Password must be at least 6 characters long', {
        position: "top-center",
      });
      return;
    }
  
    try {
      // Attempt to create user with Firebase authentication
      await createUserWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
  
      if (user && user.uid) {
        const isAdmin = adminEmails.includes(user.email);
        // If user created successfully, store additional information in Firestore
        await setDoc(doc(db, "Users", user.uid), {
          email: user.email,
          firstName: fname,
          lastName: lname,
          photo: "",
          swePoints: 10,
          isAdmin: isAdmin
        });
      }
  
      // Navigate to profile page on successful registration
      navigate("/profile");
      console.log("User Registered Successfully!!");
    } catch (error) {
      console.error(error.message);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email or log in.');
        toast.error('This email is already registered. Please use a different email or log in.', {
          position: "top-center",
        });
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
          <label>First name</label>
          <input
            type="text"
            className="form-control"
            placeholder="First name"
            onChange={(e) => setFname(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label>Last name</label>
          <input
            type="text"
            className="form-control"
            placeholder="Last name"
            onChange={(e) => setLname(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label>Email address</label>
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
          <label>Password</label>
          <input
            type="password"
            className="form-control"
            placeholder="Enter password"
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(''); // Clear password error when user types
            }}
            required
          />
          {passwordError && <div className="text-danger">{passwordError}</div>}
        </div>

        <div className="d-grid">
          <button type="submit" className="btn btn-primary">
            Sign Up
          </button>
        </div>
        <p className="forgot-password text-right">
          Already registered? <a href="/login">Login</a>
        </p>
        <SignInwithGoogle/>
      </form>
      </div>
    </div>
  );
}
export default Register;
