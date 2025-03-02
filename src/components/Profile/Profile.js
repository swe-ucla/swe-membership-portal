import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import EditProfileForm from "./EditProfileForm";
import emailjs from "emailjs-com";
import './Profile.css';

function Profile() {
  const [userDetails, setUserDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const navigate = useNavigate();

  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.warn("No user found. Skipping fetch.");
        return;
      }

      if (user && user.uid) {

        console.log(user);
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserDetails(docSnap.data());
          console.log(docSnap.data());
        } else {
          console.log("User is not logged in");
        }
      }
    });
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        console.warn("User is null, redirecting to login.");
        navigate("/login");
        return; // ✅ Prevents fetchUserData() from running
      }
  
      console.log("User exists, fetching data...");
      fetchUserData(); // ✅ Only call when user is valid
    });
  
    return () => unsubscribe();
  }, [navigate]);
  
  const handleHomeClick = () => {
    navigate("/home");
  };
  
  async function handleLogout() {
    try {
      setIsEditing(true);
  
      if (auth.currentUser) {
        console.log("Logging out user:", auth.currentUser.uid); // ✅ Debugging log
      } else {
        console.warn("User already logged out.");
      }
  
      await auth.signOut();
      console.log("User logged out successfully!");
  
      // Small delay to ensure the auth state is fully updated before navigation
      setTimeout(() => {
        setIsEditing(false);
        navigate("/login");
      }, 500); 
  
    } catch (error) {
      console.error("Error logging out:", error.message);
      setIsEditing(false);
    }
  }
  
  
  

  const handleProfileUpdate = async (updatedData) => {
    const user = auth.currentUser;
    if (user && user.uid) {
      const docRef = doc(db, "Users", user.uid);
      const docSnap = await getDoc(docRef);  // Fetch updated data from Firestore
      if (docSnap.exists()) {
        setUserDetails(docSnap.data()); // Set updated data
      }
    }
    setIsEditing(false); // Hide edit form after saving
  };

  const requestAdminAccess = () => {
    if (!userDetails) return;

    const templateParams = {
      user_email: userDetails.email,
      user_name: `${userDetails.firstName} ${userDetails.lastName}`,
      message: `
        I would like to request admin access.
        User Name: ${userDetails.firstName} ${userDetails.lastName}
        User Email: ${userDetails.email}
      `,
    };

    emailjs
      .send("service_oa92hy9", "template_xschbvb", templateParams, "Z7j812LuDjlbsCsMe")
      .then((response) => {
        console.log("Email sent successfully!", response.status, response.text);
        alert("Admin access request sent successfully!");
      })
      .catch((error) => {
        console.error("Error sending email:", error);
        alert("Failed to send request. Please try again later.");
      });
  };

  return (
    <div className="profile-container">
      {userDetails ? (
        <>
          <button onClick={handleHomeClick}> <FaHome/></button>
          
          {isEditing ? (
            <EditProfileForm userDetails={userDetails} onUpdate={handleProfileUpdate} />
          ) : (
            <>
              <h3 className="profile-header">Profile</h3>
  
              <div className="profile-picture-container">
                {userDetails.profilePicture ? (
                  <img
                    src={userDetails.profilePicture}
                    alt="Profile"
                    className="profile-picture"
                  />
                ) : (
                  <div className="no-picture">No Profile Picture</div>
                )}
              </div>
  
              <div className="profile-details">
                <p className="profile-field">
                  <span className="field-label">Name:</span>
                  <span className="field-value">{userDetails.firstName} {userDetails.lastName}</span>
                </p>
                <p className="profile-field">
                  <span className="field-label">Emaik:</span>
                  <span className="field-value">{userDetails.email}</span>
                </p>
                <p className="profile-field">
                  <span className="field-label">Year:</span>
                  <span className="field-value">{userDetails.year}</span>
                </p>
                <p className="profile-field">
                  <span className="field-label">Major:</span>
                  <span className="field-value">{userDetails.major}</span>
                </p>
                <p className="profile-field">
                  <span className="field-label">Member ID:</span>
                  <span className="field-value">{userDetails.memberId}</span>
                </p>
                <p className="profile-field">
                  <span className="field-label">Bio:</span>
                  <span className="field-value">{userDetails.bio}</span>
                </p>
                <p className="profile-field">
                  <span className="field-label">#SWE Points:</span>
                  <span className="field-value">{userDetails.totalPoints}</span>
                </p>
              </div>
  
              {(!userDetails.year || !userDetails.major) && (
                <p className="warning-message">
                  Please fill out the required fields marked with *.
                </p>
              )}
  
              {isEditing ? (
                <EditProfileForm userDetails={userDetails} onUpdate={handleProfileUpdate} />
              ) : (
                <div className="button-group">
                  <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </button>
                  <button className="btn btn-primary" onClick={handleLogout}>
                    Logout
                  </button>
                  <button className="btn btn-secondary" onClick={requestAdminAccess}>
                    Request Admin Access (board members only)
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <p className="loading-state">Loading...</p>
      )}
    </div>
  );  
}

export default Profile;