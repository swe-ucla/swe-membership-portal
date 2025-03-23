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
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserData = async (user) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const docRef = doc(db, "Users", user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setUserDetails(docSnap.data());
        console.log("User data loaded:", docSnap.data());
      } else {
        console.log("No user data found");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
      } else {
        fetchUserData(user);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleHomeClick = () => {
    navigate("/home");
  };

  async function handleLogout() {
    try {
      await auth.signOut();
      navigate("/login");
      console.log("User logged out successfully!");
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  }

  const handleProfileUpdate = (updatedData) => {
    setUserDetails(updatedData);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
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

  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {userDetails ? (
        <>
          <button className="home-button" onClick={handleHomeClick}>
            <FaHome />
          </button>
          <h3 className="profile-header">Profile</h3>

          {!isEditing && (
            <>
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
                <div className="profile-field">
                  <span className="field-label">Name:</span>
                  <span className="field-value">{userDetails.firstName} {userDetails.lastName}</span>
                </div>
                
                <div className="profile-field">
                  <span className="field-label">Year:</span>
                  <span className="field-value">{userDetails.year || "Not specified"}</span>
                </div>
                
                <div className="profile-field">
                  <span className="field-label">Major:</span>
                  <span className="field-value">{userDetails.major || "Not specified"}</span>
                </div>
                
                <div className="profile-field">
                  <span className="field-label">Email:</span>
                  <span className="field-value">{userDetails.email}</span>
                </div>
                
                {userDetails.memberId && (
                  <div className="profile-field">
                    <span className="field-label">Member ID:</span>
                    <span className="field-value">{userDetails.memberId}</span>
                  </div>
                )}
                
                <div className="profile-field">
                  <span className="field-label">Bio:</span>
                  <span className="field-value">{userDetails.bio || "No bio provided"}</span>
                </div>
                
                <div className="profile-field">
                  <span className="field-label">SWE Points:</span>
                  <span className="field-value">{userDetails.swePoints || 0}</span>
                </div>
              </div>

              {(!userDetails.year || !userDetails.major) && (
                <div className="warning-message">
                  Please complete your profile by adding your year and major.
                </div>
              )}
            </>
          )}

          {isEditing ? (
            <EditProfileForm 
              userDetails={userDetails} 
              onUpdate={handleProfileUpdate} 
              onCancel={handleCancelEdit}
            />
          ) : (
            <div className="button-group">
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
              <button className="btn btn-primary" onClick={handleLogout}>
                Logout
              </button>
              <button className="btn btn-secondary" onClick={requestAdminAccess}>
                Request Admin Access
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="loading-state">
          <p>No user data found. Please log in again.</p>
          <button className="btn btn-primary" onClick={() => navigate("/login")}>
            Go to Login
          </button>
        </div>
      )}
    </div>
  );
}

export default Profile;