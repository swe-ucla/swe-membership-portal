import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
  const [userDetails, setUserDetails] = useState(null);
  const [signedUpEvents, setSignedUpEvents] = useState([]);
  const navigate = useNavigate();

  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log(user);
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUserDetails(userData);
          
          // Filter events to only include future ones
          if (userData.signedUpEvents && userData.signedUpEvents.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const futureEvents = userData.signedUpEvents.filter(event => {
              const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
              return eventDate >= today;
            });
            
            // Sort events by date (nearest first)
            futureEvents.sort((a, b) => {
              const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
              const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
              return dateA - dateB;
            });
            
            setSignedUpEvents(futureEvents);
          }
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
  
  const handleViewAllEvents = () => {
    navigate("/upcoming");
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

  return (
    <div className="home-container">
      <div className="welcome-section">
        <div className="welcome-content">
          {userDetails ? (
            <h3 className="welcome-text">Welcome {userDetails.firstName}!</h3>
          ) : (
            <h3 className="welcome-text">Welcome User!</h3>
          )}
          
          <button onClick={handleProfileClick} className="btn-profile">
            View Profile
          </button>
        </div>
      </div>
      
      {/* Upcoming Events Section */}
      <div className="my-events-section">
        <div className="section-header">
          <h3 className="section-title">My Upcoming Events</h3>
          <button onClick={handleViewAllEvents} className="btn-view-all">
            View All Events
          </button>
        </div>
        
        {signedUpEvents.length > 0 ? (
          <div className="my-events-list">
            {signedUpEvents.map((event) => (
              <div 
                key={event.id}
                className={`my-event-card ${isToday(event.date) ? 'today-event' : ''}`}
              >
                <div className="event-info">
                  <h4 className="event-name">{event.name}</h4>
                  <div className={`event-date ${isToday(event.date) ? 'today-date' : ''}`}>
                    {formatDate(event.date)}
                  </div>
                </div>
                
                <div className="event-details">
                  <div className="event-location">
                    <span className="detail-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    </span>
                    {event.location}
                  </div>
                  
                  {event.time && (
                    <div className="event-time">
                      <span className="detail-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      </span>
                      {event.time}
                    </div>
                  )}
                  
                  <div className="event-committee">
                    <span className="detail-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </span>
                    {event.committee}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-events-message">
            <p>You haven't signed up for any events yet.</p>
            <button onClick={handleViewAllEvents} className="btn-find-events">
              Find Events
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;