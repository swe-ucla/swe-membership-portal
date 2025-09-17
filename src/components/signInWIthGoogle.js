import { GoogleAuthProvider, signInWithPopup, linkWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth, db } from "./firebase";
import { toast } from "react-toastify";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import React from "react";

function SignInwithGoogle({ onGoogleSignInStart, onGoogleSignInEnd }) {
  const navigate = useNavigate();

  const googleLogin = async () => {
    if (onGoogleSignInStart) {
      onGoogleSignInStart();
    }
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        hd: 'ucla.edu' // Restrict to UCLA domain
      });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email.endsWith('@ucla.edu') && !user.email.endsWith('@g.ucla.edu')) {
        await auth.signOut();
        toast.error("Please use your UCLA email to sign in", {
          position: "top-center",
        });
        if (onGoogleSignInEnd) {
          onGoogleSignInEnd();
        }
        return;
      }

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "Users", user.uid));
      
      if (!userDoc.exists()) {
        // Create new user document if it doesn't exist
        await setDoc(doc(db, "Users", user.uid), {
          email: user.email,
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          photo: user.photoURL || "",
          swePoints: 0,
          isAdmin: false,
          attendedEvents: [],
          rsvpEvents: [],
          emailVerified: true
        });
      }

      // Wait a moment to ensure the auth state is updated
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success("Successfully signed in with Google", {
        position: "top-center",
      });
      navigate("/profile");
    } catch (error) {
      console.error("Google sign-in error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error("Sign in was cancelled", {
          position: "top-center",
        });
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        // Handle account merging
        const email = error.customData?.email;
        if (email) {
          try {
            // Prompt user to enter their password
            const password = prompt('Please enter your password to link your Google account');
            if (password) {
              const credential = EmailAuthProvider.credential(email, password);
              await linkWithCredential(auth.currentUser, credential);
              toast.success("Accounts linked successfully!", {
                position: "top-center",
              });
              navigate("/profile");
            }
          } catch (linkError) {
            toast.error("Failed to link accounts. Please try again.", {
              position: "top-center",
            });
          }
        }
      } else {
        toast.error("Failed to sign in with Google", {
          position: "top-center",
        });
      }
    } finally {
      if (onGoogleSignInEnd) {
        onGoogleSignInEnd();
      }
    }
  };

  return (
    <div className="google-signin-container">
      <p style={{textAlign: 'center', color: '#999', fontSize: '0.85rem', margin: '25px 0'}}>or continue with</p>
      <button 
        className="google-signin-button"
        onClick={googleLogin}
      >
        <div className="google-icon"></div>
        <span>Sign in with Google</span>
      </button>
    </div>
  );
}

export default SignInwithGoogle;
