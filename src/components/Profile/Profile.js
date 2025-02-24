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
      console.log(user);
      const docRef = doc(db, "Users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserDetails(docSnap.data());
        console.log(docSnap.data());
      } else {
        console.log("User is not logged in");
      }
    });
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
      window.location.href = "/login";
      console.log("User logged out successfully!");
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  }

  const handleProfileUpdate = (updatedData) => {
    setUserDetails(updatedData);
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

  return (
    <div className="profile-container">
      {userDetails ? (
        <>
          <button className="home-button" onClick={handleHomeClick}>
            <FaHome />
          </button>
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
              <span className="field-value">{userDetails.swePoints}</span>
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
      ) : (
        <p className="loading-state">Loading...</p>
      )}
    </div>
  );
}

export default Profile;