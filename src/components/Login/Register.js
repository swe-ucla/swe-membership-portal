import { createUserWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import './login.css';


function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
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
  
    try {
      // Attempt to create user with Firebase authentication
      await createUserWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
  
      if (user && user.uid) {
        // If user created successfully, store additional information in Firestore
        await setDoc(doc(db, "Users", user.uid), {
          email: user.email,
          firstName: fname,
          lastName: lname,
          photo: "",
          swePoints: 10
        });
      }
  
      // Navigate to profile page on successful registration
      navigate("/profile");
      console.log("User Registered Successfully!!");
    } catch (error) {
      console.error(error.message);
      toast.error(error.message, {
        position: "top-center",
      });
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
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="d-grid">
          <button type="submit" className="btn btn-primary">
            Sign Up
          </button>
        </div>
        <p className="forgot-password text-right">
          Already registered? <a href="/login">Login</a>
        </p>
      </form>
      </div>
    </div>
  );
}
export default Register;
