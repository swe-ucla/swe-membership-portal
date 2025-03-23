import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./UpcomingEvents.css";

function UpcomingEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const navigate = useNavigate();

  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
      } else {
        setUser(user);
        
        // Fetch the events the user has signed up for
        const userDocRef = doc(db, "Users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().signedUpEvents) {
          setUserEvents(userDoc.data().signedUpEvents || []);
        } else {
          // Initialize signedUpEvents array if it doesn't exist
          await updateDoc(userDocRef, {
            signedUpEvents: []
          });
          setUserEvents([]);
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
    
    return (
      today.getDate() === eventDateObj.getDate() &&
      today.getMonth() === eventDateObj.getMonth() &&
      today.getFullYear() === eventDateObj.getFullYear()
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return null;
    
    const eventDate = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // Check if the event is today
    if (isToday(timestamp)) {
      return "Today";
    }
    
    // Otherwise format the date normally
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSignUpClick = async (event) => {
    if (!user) return;
    
    try {
      const userDocRef = doc(db, "Users", user.uid);
      
      // Check if user is already signed up
      const isSignedUp = userEvents.some(e => e.id === event.id);
      
      if (isSignedUp) {
        // Remove the event from user's signedUpEvents
        await updateDoc(userDocRef, {
          signedUpEvents: arrayRemove({
            id: event.id,
            name: event.name,
            date: event.date,
            location: event.location,
            committee: event.createdBy,
            time: event.time || "",
          })
        });
        
        setUserEvents(userEvents.filter(e => e.id !== event.id));
        alert("You have been removed from this event.");
      } else {
        // Add the event to user's signedUpEvents
        await updateDoc(userDocRef, {
          signedUpEvents: arrayUnion({
            id: event.id,
            name: event.name,
            date: event.date,
            location: event.location,
            committee: event.createdBy,
            time: event.time || "",
          })
        });
        
        setUserEvents([...userEvents, {
          id: event.id,
          name: event.name,
          date: event.date
        }]);
        alert("You have successfully signed up for this event!");
      }
    } catch (error) {
      console.error("Error updating user events:", error);
      alert("There was an error. Please try again.");
    }
  };

  const isUserSignedUp = (eventId) => {
    return userEvents.some(event => event.id === eventId);
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
              className={`event-card ${isToday(event.date) ? 'today-event' : ''}`}
            >
              <h4>{event.name}</h4>
              {formatDate(event.date) && (
                <div className={`event-date-badge ${isToday(event.date) ? 'today-badge' : ''}`}>
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
                  <span>{event.createdBy}</span>
                </div>
                
                {event.time && (
                  <div className="event-detail">
                    <strong>Time:</strong>
                    <span>{event.time}</span>
                  </div>
                )}
                
                {event.description && (
                  <p>{event.description}</p>
                )}
                
                <div className="event-card-footer">
                  <button
                    onClick={() => handleSignUpClick(event)}
                    className={`btn ${isUserSignedUp(event.id) ? 'btn-signed-up' : 'btn-primary'}`}
                  >
                    {isUserSignedUp(event.id) ? 'Cancel Registration' : 'Sign Up'}
                  </button>
                </div>
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