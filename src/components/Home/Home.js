import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Home() {
  const [userDetails, setUserDetails] = useState(null);
  const navigate = useNavigate();

  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (user && user.uid) {
        console.log(user);
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserDetails(docSnap.data());
          console.log(docSnap.data());
        }
      } else {
        navigate("/login");
        console.log("User is not logged in");
        setUserDetails(null);
      }
    });
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <div>
      {userDetails ? (
        <>
          <h3>Welcome {userDetails.firstName}!</h3>
          <button onClick={handleProfileClick} className="btn btn-primary">
            View Profile
          </button>
        </>
      ) : (
        <h3>Welcome User!</h3>
      )}
    </div>
  );
}

export default Home;
