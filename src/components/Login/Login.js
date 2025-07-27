import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import React, { useState } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import SignInwithGoogle from "../signInWIthGoogle";
import { useNavigate } from "react-router-dom";
import "./login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isGoogleSignIn, setIsGoogleSignIn] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
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
      console.log("User logged in Successfully");
      navigate("/");
    } catch (error) {
      console.log("Full error object:", error);
      console.log("Error code:", error.code);
      console.log("Error message:", error.message);

      // Handle Firebase authentication errors
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

      toast.error("Login failed", {
        position: "top-center",
      });
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
      toast.success("Password reset email sent!", {
        position: "top-center",
      });
      setResetLinkSent(true);
    } catch (error) {
      console.log(error.code);

      let message = "Failed to send password reset email.";
      if (error.code === "auth/user-not-found") {
        message = "No account exists with this email address.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }

      setErrorMessage(message);
      toast.error(message, {
        position: "top-center",
      });
    }
  };

  const toggleResetForm = () => {
    setShowResetForm(!showResetForm);
    setResetLinkSent(false);
    setErrorMessage("");
    setResetEmail(email); // Pre-fill with the login email if available
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-inner">
        {!showResetForm ? (
          <form onSubmit={handleSubmit}>
            <h3>Welcome Back!</h3>

            {errorMessage && !isGoogleSignIn && (
              <div className="alert alert-danger" role="alert">
                {errorMessage}
              </div>
            )}

            <div className="mb-3">
              <input
                type="email"
                className={`form-control${emailError ? " error-input" : ""}`}
                placeholder="Enter email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
              />
              {emailError && <div className="input-error">{emailError}</div>}
            </div>

            <div className="mb-3">
              <input
                type="password"
                className={`form-control${passwordError ? " error-input" : ""}`}
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
            </div>

            <div className="d-grid">
              <button type="submit" className="btn btn-primary">
                Submit
              </button>
            </div>
            <div className="forgot-password text-right mt-2">
              <a href="#" onClick={toggleResetForm}>
                Forgot password?
              </a>
            </div>
            <p className="forgot-password text-right">
              New user? <a href="/register">Register Here</a>
            </p>
            <SignInwithGoogle
              onGoogleSignInStart={() => {
                setIsGoogleSignIn(true);
                setErrorMessage(""); // Clear any existing error message
              }}
              onGoogleSignInEnd={() => setIsGoogleSignIn(false)}
            />
          </form>
        ) : (
          <div>
            {!resetLinkSent ? (
              <form onSubmit={handleForgotPassword}>
                <h3>Reset Password</h3>

                {errorMessage && (
                  <div className="alert alert-danger" role="alert">
                    {errorMessage}
                  </div>
                )}

                <div className="mb-3">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
                <div className="d-grid">
                  <button type="submit" className="btn btn-primary">
                    Send Reset Link
                  </button>
                </div>
                <div className="back-to-login text-right mt-2">
                  <a href="#" onClick={toggleResetForm}>
                    Back to Login
                  </a>
                </div>
              </form>
            ) : (
              <div className="reset-success">
                <h3>Check Your Email</h3>
                <div className="alert alert-success">
                  <p>We've sent a password reset link to:</p>
                  <p className="email-sent">
                    <strong>{resetEmail}</strong>
                  </p>
                  <p>
                    Please check your inbox and follow the instructions to reset
                    your password.
                  </p>
                </div>
                <div className="d-grid mt-3">
                  <button onClick={toggleResetForm} className="btn btn-primary">
                    Back to Login
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
