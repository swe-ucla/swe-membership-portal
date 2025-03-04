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
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("User logged in Successfully");
      navigate("/");
    } catch (error) {
      console.log(error.code);
      toast.error("An error occurred. Please check your email and password.", {
        position: "top-center",
      });
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
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

      let errorMessage = "Failed to send password reset email.";
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account exists with this email address.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      }

      toast.error(errorMessage, {
        position: "top-center",
      });
    }
  };

  const toggleResetForm = () => {
    setShowResetForm(!showResetForm);
    setResetLinkSent(false);
    setResetEmail(email); // Pre-fill with the login email if available
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-inner">
        {!showResetForm ? (
          <form onSubmit={handleSubmit}>
            <h3>Login</h3>

            <div className="mb-3">
              <label>Email address</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label>Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
              New user <a href="/register">Register Here</a>
            </p>
            {/* <SignInwithGoogle/> */}
          </form>
        ) : (
          <div>
            {!resetLinkSent ? (
              <form onSubmit={handleForgotPassword}>
                <h3>Reset Password</h3>
                <div className="mb-3">
                  <label>Email address</label>
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
