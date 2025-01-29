import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function UpcomingEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const checkUserStatus = () => {
    auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login"); // Redirect to login if user is not logged in
      } else {
        setUser(user); // Set the user if logged in
      }
    });
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const eventsRef = collection(db, "events");
      const q = query(eventsRef, orderBy("date", "asc"));
      const querySnapshot = await getDocs(q);

      const eventsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventsData);

      const today = new Date();
      const futureEvents = eventsData.filter((event) => {
        // Convert the Firebase timestamp into a JavaScript Date object
        const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0); // Set today's time to 00:00:00 to ignore the time part
        return eventDate >= today; // Only keep events that are today or in the future
      });
      setEvents(futureEvents);

    } catch (error) {
      console.error("Error fetching events:", error);
    }
    setLoading(false);
  };

  const isToday = (eventDate) => {
    const today = new Date();
    const eventDateObj = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate);
    
    console.log("Event Date:", eventDateObj); // Log the event date to check
    console.log("Today:", today); // Log today's date to check
    
    return (
      today.getDate() === eventDateObj.getDate() &&
      today.getMonth() === eventDateObj.getMonth() &&
      today.getFullYear() === eventDateObj.getFullYear()
    );
  };

  const formatDate = (timestamp) => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString(); // Use .toDate() for Firebase Timestamp
    }
    return null; // If no valid date is found
  };

  const handleSignUpClick = (eventId) => {
    navigate(`/eventsignin/${eventId}`); // Navigate to the event signing page with event ID
  };

  useEffect(() => {
    checkUserStatus();
    fetchEvents();
  }, []);

  return (
    <div>
      <h2>Upcoming Events</h2>
      {loading ? (
        <p>Loading events...</p>
      ) : events.length > 0 ? (
        <ul>
          {events.map((event) => (
            <div key={event.id} className="event-card">
              <h4>{event.name}</h4>
              <strong>Date:</strong> {formatDate(event.date)} {/* Format event date */}
              <strong>Location:</strong> {event.location}
              <strong>Created By:</strong> {event.createdBy} Committee
              <p>{event.description}</p>
              {isToday(event.date) && (
                <button
                  onClick={() => handleSignUpClick(event.id)}
                  className="btn btn-primary"
                >
                  Sign In
                </button>
              )}
            </div>
          ))}
        </ul>
      ) : (
        <p>No upcoming events.</p>
      )}
    </div>
  );
}

export default UpcomingEvents;
