import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

function EventSignin() {
  const { eventId } = useParams(); // Get the eventId from URL params
  const [eventDetails, setEventDetails] = useState(null);

  useEffect(() => {
    const fetchEventDetails = async () => {
      const eventRef = doc(db, "events", eventId);
      const docSnap = await getDoc(eventRef);
      if (docSnap.exists()) {
        setEventDetails(docSnap.data());
      } else {
        console.log("Event not found");
      }
    };

    fetchEventDetails();
  }, [eventId]);

  return (
    <div>
      <h2>Event Signin</h2>
      {eventDetails ? (
        <div>
          <h3>{eventDetails.name}</h3>
          <p>{eventDetails.description}</p>
        </div>
      ) : (
        <p>Loading event details...</p>
      )}
    </div>
  );
}

export default EventSignin;
