import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./UpcomingEvents.css";

function UpcomingEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const navigate = useNavigate();
  const [isSignedIn, setIsSignedIn] = useState([]);

  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      const userRef = doc(db, "Users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setIsSignedIn(userData.attendedEvents || []); // store user's signed-in events

        if (userData.hasOwnProperty("isAdmin")) {
          setIsAdmin(userData.isAdmin);
        } else {
          await setDoc(userRef, { isAdmin: false }, { merge: true });
          setIsAdmin(false);
        }
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
    if (!timestamp) return null;
  
    const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isToday(timestamp)) {
      return "Today";
    }
    return dateObj.toLocaleDateString(); // Format as regular date otherwise
  };
  

  const handleSignUpClick = (eventId) => {
    navigate(`/eventsignin/${eventId}`); // Navigate to the event signing page with event ID
  };

  const handleCancelRegistration = async (eventId, points) => {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel your registration?\nYou will lose any SWE points that you earned from this event.`
    );
    if (!confirmCancel) return;
  
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    const userRef = doc(db, "Users", userId);
    const eventRef = doc(db, "events", eventId);
  
    try {
      const userSnap = await getDoc(userRef);
      const eventSnap = await getDoc(eventRef);
  
      if (userSnap.exists() && eventSnap.exists()) {
        const userData = userSnap.data();
        const eventData = eventSnap.data();
  
        const updatedAttended = (userData.attendedEvents || []).filter((id) => id !== eventId);
        const updatedSWEPoints = Math.max((userData.swePoints || 0) - (points || 0), 0);
  
        await setDoc(userRef, {
          attendedEvents: updatedAttended,
          swePoints: updatedSWEPoints,
        }, { merge: true });
  
        const updatedAttendees = (eventData.attendees || []).filter((uid) => uid !== userId);
  
        await setDoc(eventRef, {
          attendees: updatedAttendees,
        }, { merge: true });
  
        setIsSignedIn(updatedAttended);
      }
    } catch (error) {
      console.error("Error canceling registration:", error);
    }
  };
  
  

  useEffect(() => {
    fetchUserData();
    fetchEvents();
  }, []);

  return (
    <div className="events-container">
      <div className="events-header">
        <h2 className="events-title">Upcoming Events</h2>
      </div>

      {loading ? (
        <div className="loading-message">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      ) : events.length > 0 ? (
        <div className="event-cards-container">
          {events.map((event) => (
            <div
              key={event.id}
              className={`event-card ${isToday(event.date) ? "today-event" : ""}`}
            >
              <h4>{event.name}</h4>
              {formatDate(event.date) && (
                <div
                  className={`event-date-badge ${isToday(event.date) ? "today-badge" : ""}`}
                >
                  {formatDate(event.date)}
                </div>
              )}

              <div className="event-card-content">
                <div className="event-detail">
                  <strong>Location:</strong>
                  <span>{event.location}</span>
                </div>

                <div className="event-detail">
                  <strong>Committee:</strong>
                  <span>{event.createdBy} Committee</span>
                </div>

                {event.description && <p>{event.description}</p>}

                {isAdmin && event.attendanceCode && (
                  <div className="event-detail">
                    <strong>Attendance Code:</strong>
                    <span>{event.attendanceCode}</span>
                  </div>
                )}

                {isToday(event.date) && (
                  <div className="event-card-footer">
                    {isSignedIn.includes(event.id) ? (
                      <button
                        onClick={() => handleCancelRegistration(event.id, event.points || 0)}
                        className="btn btn-danger"
                      >
                        Cancel Registration
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSignUpClick(event.id)}
                        className="btn btn-primary"
                      >
                        Sign In (Earn {event.points || 0} points)
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-message">
          <p>No upcoming events.</p>
        </div>
      )}
    </div>
  );
}

export default UpcomingEvents;
