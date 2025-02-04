import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaHome } from 'react-icons/fa';
import { useNavigate } from "react-router-dom";
import EditProfileForm from "./EditProfileForm";


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
    setIsEditing(false); // Hide edit form after saving
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
          </div>
          <button onClick={() => setIsEditing(true)}>Edit Profile</button>
          <button className="btn btn-primary" onClick={handleLogout}> Logout </button>

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
