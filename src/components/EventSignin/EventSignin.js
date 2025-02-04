import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const EventSignin = () => {
  const { eventID } = useParams();
  const [event, setEvent] = useState(null);

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

    fetchEventDetails();
  }, [eventID]);

  return (
    <div>
      <h1>Event Signin</h1>
      {event ? (
        <div>
          <p><strong>Title:</strong> {event.name}</p> 
          <p><strong>Location:</strong> {event.location}</p>
          <p><strong>Created By:</strong> {event.createdBy} Committee</p>
        </div>
      ) : (
        <p>Loading event...</p>
      )}
    </div>
  );
};

export default EventSignin;
