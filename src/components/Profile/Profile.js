import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import EditProfileForm from "./EditProfileForm";
import './Profile.css';
import { MaterialSymbol } from "react-material-symbols";
import "react-material-symbols/rounded";



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
    <div className="profile-page">
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
            <div className="profile-main-section">
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

              <div className="profile-basic-info">
                <div className="profile-text-column">
                  <h2 className="profile-header">{userDetails.firstName} {userDetails.lastName}</h2>
                  <p className="profile-member-id">Member ID: {userDetails.memberId}</p>
                  <p className="profile-major">
                    {/* <MaterialSymbol icon="circle" size={28} />  */}
                    <img
                      src="/assets/bear-face-icon.svg"
                      alt="Bear Icon" 
                      className="major-icon"
                    />
                    {userDetails.major}
                  </p>
                  <p className="profile-year">
                    <MaterialSymbol icon="school" size={28} className="year-icon" />
                    {userDetails.year}
                  </p>
                </div>
                <div className="profile-button-column">
                  <button className="btn edit-profile-btn" onClick={() => setIsEditing(true)}>
                    <MaterialSymbol icon="edit" size={24} />
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
            
            {(!userDetails.year || !userDetails.major) && (
              <div className="alert-banner">
                <MaterialSymbol icon="error" size={20} className="alert-icon" />
                <span>Your profile is missing information!</span>
              </div>
            )}
            
            <hr className="divider" />
            
            <h2 className="profile-header">Statistics</h2>
            <div className="profile-statistics-cards">
              <div className="stat-card">
                <MaterialSymbol icon="stars" size={28} className="stat-icon" />
                <span className="stat-value">{Number(userDetails.swePoints) || 0} SWE Points</span>
              </div>
              <div className="stat-card">
                <MaterialSymbol icon="social_leaderboard" size={28} className="stat-icon" />
                <span className="stat-value">Rank #{Number(userDetails.rank) || 0}</span>
              </div>
            </div>

            <div className="button-group">
              <button className="btn logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </>
        )
      ) : (
        <p className="loading-state">Loading...</p>
      )}
      </div>
    </div>
  );
}

export default Profile;
