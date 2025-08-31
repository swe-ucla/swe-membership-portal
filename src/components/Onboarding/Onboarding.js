import React, { useState } from "react";
import "./Onboarding.css";
import "../Login/login.css";
import SignInwithGoogle from "../signInWIthGoogle";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const BEAR_BANNER = process.env.PUBLIC_URL + "/assets/onboarding-banner.svg";

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

function Onboarding() {
  const [form, setForm] = useState("login"); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isGoogleSignIn, setIsGoogleSignIn] = useState(false);
  const navigate = useNavigate();

  // Login logic
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setEmailError("");
    setPasswordError("");
    let hasError = false;
    if (!email) {
      setEmailError("Please enter your email.");
      hasError = true;
    }
    if (!password) {
      setPasswordError("Please enter a password.");
      hasError = true;
    }
    if (hasError) return;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (error) {
      if (error.code === "auth/invalid-credential") {
        setErrorMessage("Invalid email or password.");
      } else if (error.code === "auth/invalid-email") {
        setEmailError("Please enter a valid email address.");
      } else if (error.code === "auth/missing-password") {
        setPasswordError("Please enter a password.");
      } else if (error.code === "auth/too-many-requests") {
        setErrorMessage(
          "Too many failed login attempts. Please try again later."
        );
      } else {
        setErrorMessage(
          "An error occurred. Please check your email and password."
        );
      }
      toast.error("Login failed", { position: "top-center" });
    }
  };

  // Register logic
  const handleEmailChange = (e) => {
    const inputEmail = e.target.value;
    setEmail(inputEmail);
    if (
      form === "register" &&
      inputEmail &&
      !inputEmail.endsWith("g.ucla.edu")
    ) {
      setError("Email must end with g.ucla.edu");
      return;
    } else {
      setError("");
    }
  };
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email.endsWith("g.ucla.edu")) {
      setError("Email must end with g.ucla.edu");
      return;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      toast.error("Password must be at least 6 characters long", {
        position: "top-center",
      });
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      if (user && user.uid) {
        const isAdmin = adminEmails.includes(user.email);
        await setDoc(doc(db, "Users", user.uid), {
          email: user.email,
          firstName: fname,
          lastName: lname,
          photo: "",
          swePoints: 10,
          isAdmin: isAdmin,
          attendedEvents: [],
          rsvpEvents: [],
        });
      }
      navigate("/profile");
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setError(
          "This email is already registered. Please use a different email or log in."
        );
        toast.error(
          "This email is already registered. Please use a different email or log in.",
          { position: "top-center" }
        );
      } else {
        toast.error(error.message, { position: "top-center" });
      }
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!resetEmail) {
      setErrorMessage("Please enter your email address");
      toast.error("Please enter your email address", {
        position: "top-center",
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("If an account exists with this email, you will receive a password reset link.", { position: "top-center" });
      setResetLinkSent(true);
    } catch (error) {
      let message = "Failed to send password reset email.";
      if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }
      setErrorMessage(message);
      toast.error(message, { position: "top-center" });
    }
  };

  const toggleResetForm = (e) => {
    e.preventDefault();
    setForm(form === "forgot" ? "login" : "forgot");
    setResetEmail(email);
    setResetLinkSent(false);
    setErrorMessage("");
  };

  return (
    <div className="onboarding-split-layout">
      <div className="onboarding-left-panel">
        <div>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <img
              src={process.env.PUBLIC_URL + "/assets/purple-swe-logo.svg"}
              alt="SWE Logo"
              style={{ height: "80px" }}
            />
          </div>
          <div>
            {form === "login" && (
              <form onSubmit={handleLogin}>
                <h3>Welcome Back!</h3>
                <p className="forgot-password text-right">
                  Don't have an account yet?{" "}
                  <a href="#" onClick={() => setForm("register")}>
                    Sign up now
                  </a>
                </p>
                {errorMessage && !isGoogleSignIn && (
                  <div className="alert alert-danger" role="alert">
                    {errorMessage}
                  </div>
                )}
                <div className="mb-3">
                  <input
                    type="email"
                    className={`form-control${
                      emailError ? " error-input" : ""
                    }`}
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                  />
                  {emailError && (
                    <div className="input-error">{emailError}</div>
                  )}
                </div>
                <div className="mb-3">
                  <input
                    type="password"
                    className={`form-control${
                      passwordError ? " error-input" : ""
                    }`}
                    style={{ marginBottom: "20px" }}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                  />
                  {passwordError && (
                    <div className="input-error">{passwordError}</div>
                  )}
                  <div className="forgot-password-right">
                    <a href="#" onClick={toggleResetForm}>
                      Forgot password?
                    </a>
                  </div>
                </div>
                <div className="d-grid">
                  <button type="submit" className="btn btn-primary">
                    Submit
                  </button>
                </div>
                <SignInwithGoogle
                  onGoogleSignInStart={() => {
                    setIsGoogleSignIn(true);
                    setErrorMessage("");
                  }}
                  onGoogleSignInEnd={() => setIsGoogleSignIn(false)}
                />
              </form>
            )}
            {form === "register" && (
              <form onSubmit={handleRegister}>
                <h3>Create your account</h3>
                <p className="forgot-password text-right">
                  Already registered?{" "}
                  <a href="#" onClick={() => setForm("login")}>
                    Login
                  </a>
                </p>
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
                      setPasswordError("");
                    }}
                    required
                  />
                  {passwordError && (
                    <div className="text-danger">{passwordError}</div>
                  )}
                </div>
                <div className="d-grid">
                  <button type="submit" className="btn btn-primary">
                    Sign Up
                  </button>
                </div>
                <SignInwithGoogle
                  onGoogleSignInStart={() => {
                    setIsGoogleSignIn(true);
                    setErrorMessage("");
                  }}
                  onGoogleSignInEnd={() => setIsGoogleSignIn(false)}
                />
              </form>
            )}
            {form === "forgot" && (
              <div>
                {!resetLinkSent ? (
                  <form onSubmit={handleForgotPassword}>
                    <h3>Reset Password</h3>
                    <div className="mb-3">
                      <input
                        type="email"
                        className="form-control"
                        placeholder="Enter your email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    {errorMessage && (
                      <div className="alert alert-danger" role="alert">
                        {errorMessage}
                      </div>
                    )}
                    <div className="d-grid">
                      <button type="submit" className="btn btn-primary">
                        Send Reset Link
                      </button>
                    </div>
                    <div className="back-to-login">
                      Back to{" "}
                      <a href="#" onClick={() => setForm("login")}>
                        Login
                      </a>
                    </div>
                  </form>
                ) : (
                  <div className="reset-success">
                    <h3>Check Your Email</h3>
                    <div className="alert alert-success">
                      <p>If an account exists with this email, we've sent a password reset link to:</p>
                      <p className="email-sent">
                        <strong>{resetEmail}</strong>
                      </p>
                      <p>
                        Please check your inbox and follow the instructions to
                        reset your password.
                      </p>
                      <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "10px" }}>
                        <strong>Note:</strong> If you don't see the email, please check your spam/junk folder.
                      </p>
                    </div>
                    <div className="d-grid mt-3">
                      <a
                        href="#"
                        onClick={() => setForm("login")}
                        className="btn btn-primary"
                      >
                        Back to Login
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="onboarding-right-panel">
        <img src={BEAR_BANNER} alt="Bear Banner" className="bear-banner-img" />
      </div>
    </div>
  );
}

export default Onboarding;
