import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useParams, useNavigate} from "react-router-dom";
import { useEffect, useState } from "react";

const EventSignin = () => {
  const { eventID } = useParams();
  const [event, setEvent] = useState(null);
  const [user, setUser] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const navigate = useNavigate();

 useEffect(() => {
   const fetchEventDetails = async () => {
      if (!eventID) return; // Prevent fetching if eventID is missing

     try {
        const docRef = doc(db, "events", eventID); // Ensure eventID is valid
       const docSnap = await getDoc(docRef);

       if (docSnap.exists()) {
          setEvent(docSnap.data());
       } else {
         console.log("No such document!");
       }
     } catch (error) {
       console.error("Error fetching event details:", error);
     }
   };

   const fetchUserData = async () => {
     auth.onAuthStateChanged(async (currentUser) => {
       if (!currentUser) {
         navigate("/login");
         return;
       }

       setUser(currentUser);
       const userRef = doc(db, "Users", currentUser.uid);
       const userSnap = await getDoc(userRef);

       if (userSnap.exists()) {
         const userData = userSnap.data();
         setIsSignedIn(userData.signedInEvents?.includes(eventID) || false);
       }
     });
   };

   fetchEventDetails();
   fetchUserData();
 }, [eventID, navigate]);

 const handleSignIn = async () => {
   if (!user || !event) return;

   try {
     const userRef = doc(db, "Users", user.uid);
     const userSnap = await getDoc(userRef);

     if (userSnap.exists()) {
       const userData = userSnap.data();
       const currentPoints = userData.totalPoints || 0;
       const signedInEvents = userData.signedInEvents || [];

       if (signedInEvents.includes(eventID)) {
         alert("You have already signed into this event.");
         return;
       }

       await updateDoc(userRef, {
         totalPoints: currentPoints + (event.points || 0),
         lastEventSignIn: new Date().toISOString(),
         signedInEvents: [...signedInEvents, eventID],
       });

       setIsSignedIn(true);
       alert(`Successfully signed in! You earned ${event.points || 0} points!`);
     }
   } catch (error) {
     console.error("Error signing in:", error);
     alert("Failed to sign in. Please try again.");
   }
 };

  
  return (
    <div>
      <h1>Event Signin</h1>
      {event ? (
        <div>
          <p><strong>Title:</strong> {event.name}</p> 
          <p><strong>Location:</strong> {event.location}</p>
          <p><strong>Created By:</strong> {event.createdBy} Committee</p>
           <button onClick={handleSignIn} disabled={isSignedIn} className="btn btn-primary">
            {isSignedIn ? "Already Signed In" : "Sign In"}
          </button>
        </div>
      ) : (
        <p>Loading event...</p>
      )}
    </div>
  );
};

export default EventSignin;
