import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaHome } from 'react-icons/fa';
import { useNavigate } from "react-router-dom";
import EditProfileForm from "./EditProfileForm";
import emailjs from 'emailjs-com'

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

  const handleProfileUpdate = async (updatedData) => {
    const user = auth.currentUser;
    if (user) {
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
      `
    };
    

    emailjs.send(
      "service_oa92hy9",
      "template_xschbvb",
      templateParams,
      "Z7j812LuDjlbsCsMe"
    )
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
    <div>
      {userDetails ? (
        <>
          <button onClick={handleHomeClick}> <FaHome/></button>
          <h3>Profile</h3>
          
          {isEditing ? (
          <EditProfileForm userDetails={userDetails} onUpdate={handleProfileUpdate} />
        ) : (
          <>
          <div>
            <p>Email: {userDetails.email}</p>
            <p>Name: {userDetails.firstName} {userDetails.lastName}</p>
            <p>Points: {userDetails.totalPoints}</p>
          </div>
          <button onClick={() => setIsEditing(true)}>Edit Profile</button>
          <button className="btn btn-primary" onClick={handleLogout}> Logout </button>
          <button className="btn btn-secondary" onClick={requestAdminAccess}>Request Admin Access (board members only)</button>

          </>
        )}
      </>
    ) : (
      <p>Loading...</p>
    )}
  </div>
);
};
export default Profile;
