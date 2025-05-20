import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import EditProfileForm from "./EditProfileForm";
import './Profile.css';

function Profile() {
  const [userDetails, setUserDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.warn("User is null, redirecting to login.");
        navigate("/login");
        return;
      }

      try {
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserDetails(docSnap.data());
        } else {
          console.warn("No user document found.");
          setUserDetails({ missingProfile: true });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserDetails({ missingProfile: true });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  async function handleLogout() {
    try {
      setIsEditing(true);
      if (auth.currentUser) {
        console.log("Logging out user:", auth.currentUser.uid);
      }

      await auth.signOut();
      console.log("User logged out successfully!");

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
      try {
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserDetails(docSnap.data());
        }
      } catch (err) {
        console.error("Error refreshing profile after update:", err);
      }
    }
    setIsEditing(false);
  };

  return (
    <div className="profile-container">
      {userDetails ? (
        userDetails.missingProfile ? (
          <p className="error-message">
            No profile data found. Please contact an admin.
          </p>
        ) : isEditing ? (
          <EditProfileForm userDetails={userDetails} onUpdate={handleProfileUpdate} />
        ) : (
          <>
            <div className="profile-section">
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
            </div>

            <div className="profile-details">
              <p className="profile-field">
                <span className="field-label">Name:</span>
                <span className="field-value">{userDetails.firstName} {userDetails.lastName}</span>
              </p>
              <p className="profile-field">
                <span className="field-label">Email:</span>
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
                <span className="field-value">{Number(userDetails.swePoints) || 0}</span>
              </p>
            </div>

            {(!userDetails.year || !userDetails.major) && (
              <p className="warning-message">
                Please fill out the required fields marked with * in the Edit Profile page.
              </p>
            )}

            <div className="button-group">
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
              <button className="btn btn-primary" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </>
        )
      ) : (
        <p className="loading-state">Loading...</p>
      )}
    </div>
  );
}

export default Profile;
