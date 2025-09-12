import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./UpcomingEvents.css";
import { MaterialSymbol } from "react-material-symbols";
import "react-material-symbols/rounded";
import Popup from "../Popup/Popup";
import EventDetailsPopup from "../EventDetailsPopup/EventDetailsPopup";

function UpcomingEvents() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const navigate = useNavigate();
  const [isSignedIn, setIsSignedIn] = useState([]);
  const [rsvpEvents, setRsvpEvents] = useState([]);
  const [popup, setPopup] = useState({
    isOpen: false,
    message: "",
    toast: false,
    confirm: false,
    onConfirm: null,
  });
  const [selectedCommittee, setSelectedCommittee] = useState("");
  const [committees, setCommittees] = useState([]);
  const [eventDetailsPopup, setEventDetailsPopup] = useState({
    isOpen: false,
    event: null,
  });
  const [signInPopup, setSignInPopup] = useState({
    isOpen: false,
    event: null,
    code: "",
  });


  // Page navigation state
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 9;
  const eventsContainerRef = useRef(null);

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
        setRsvpEvents(userData.rsvpEvents || []); // store user's RSVP events

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
      const futureEvents = eventsData
        .filter((event) => {
          // Convert the Firebase timestamp into a JavaScript Date object
          const eventDate = event.date?.toDate
            ? event.date.toDate()
            : new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0); // Set today's time to 00:00:00 to ignore the time part
          return eventDate >= today; // Only keep events that are today or in the future
        })
        .sort((a, b) => {
          const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
          const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
          
          // If dates are the same, sort by start time
          if (dateA.toDateString() === dateB.toDateString()) {
            const timeA = a.startTime || "00:00";
            const timeB = b.startTime || "00:00";
            return timeA.localeCompare(timeB);
          }
          
          return dateA - dateB; // Sort by date ascending (soonest first)
        });

      setEvents(futureEvents);
      setFilteredEvents(futureEvents);

      // Extract unique committees
      const uniqueCommittees = [
        ...new Set(
          futureEvents.map((event) => event.createdBy).filter(Boolean)
        ),
      ];
      setCommittees(uniqueCommittees);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
    setLoading(false);
  };

  const isToday = (eventDate) => {
    const today = new Date();
    const eventDateObj = eventDate?.toDate
      ? eventDate.toDate()
      : new Date(eventDate);

    console.log("Event Date:", eventDateObj); // Log the event date to check
    console.log("Today:", today); // Log today's date to check

    return (
      today.getDate() === eventDateObj.getDate() &&
      today.getMonth() === eventDateObj.getMonth() &&
      today.getFullYear() === eventDateObj.getFullYear()
    );
  };

  const hasEventPassed = (event) => {
    const now = new Date();
    const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
    const eventEndTime = event.endTime 
      ? new Date(eventDate.getTime() + 
          (parseInt(event.endTime.split(':')[0]) * 60 + parseInt(event.endTime.split(':')[1]) - 
           parseInt(event.startTime?.split(':')[0] || '0') * 60 - parseInt(event.startTime?.split(':')[1] || '0')) * 60000)
      : new Date(eventDate.getTime() + 2 * 3600000);
    return now > eventEndTime;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return null;

    const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time ("14:30" -> "2:30 PM")
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [hour, minute] = timeStr.split(":");
    const date = new Date();
    date.setHours(Number(hour), Number(minute));
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const showAlreadySignedInMessage = () => {
    setPopup({ isOpen: true, message: "You have already signed into this event.", toast: true });
  };

  const handleSignUpClick = (eventId) => {
    const event = events.find(e => e.id === eventId);
    setSignInPopup({ isOpen: true, event, code: "" });
  };

  const handleCancelRegistration = async (eventId, points) => {
    setPopup({
      isOpen: true,
      message: `Are you sure you want to cancel your RSVP?`,
      toast: false,
      confirm: true,
      onConfirm: () => performCancelRegistration(eventId, points),
    });
  };

  const performCancelRegistration = async (eventId, points) => {
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

        // Remove from both RSVP and attended events
        const updatedRsvp = (userData.rsvpEvents || []).filter(
          (id) => id !== eventId
        );
        const updatedAttended = (userData.attendedEvents || []).filter(
          (id) => id !== eventId
        );

        // Only deduct points if they were signed in
        const wasSignedIn = (userData.attendedEvents || []).includes(eventId);
        const updatedSWEPoints = wasSignedIn
          ? Math.max((userData.swePoints || 0) - (points || 0), 0)
          : userData.swePoints || 0;

        await setDoc(
          userRef,
          {
            rsvpEvents: updatedRsvp,
            attendedEvents: updatedAttended,
            swePoints: updatedSWEPoints,
          },
          { merge: true }
        );

        const updatedAttendees = (eventData.attendees || []).filter(
          (uid) => uid !== userId
        );

        await setDoc(
          eventRef,
          {
            attendees: updatedAttendees,
          },
          { merge: true }
        );

        setRsvpEvents(updatedRsvp);
        setIsSignedIn(updatedAttended);
      }
    } catch (error) {
      console.error("Error canceling registration:", error);
    }
  };

  const isSignInOpen = (event) => {
    if (!event.date || !event.signInOpensHoursBefore) return false;
    const eventDate = event.date?.toDate
      ? event.date.toDate()
      : new Date(event.date);
    const now = new Date();
    const signInOpens = new Date(
      eventDate.getTime() - (event.signInOpensHoursBefore || 1) * 3600000
    ); // Convert hours to milliseconds
    
    // Calculate event end time (use endTime if available, otherwise assume 2 hours duration)
    const eventEndTime = event.endTime 
      ? new Date(eventDate.getTime() + 
          (parseInt(event.endTime.split(':')[0]) * 60 + parseInt(event.endTime.split(':')[1]) - 
           parseInt(event.startTime?.split(':')[0] || '0') * 60 - parseInt(event.startTime?.split(':')[1] || '0')) * 60000)
      : new Date(eventDate.getTime() + 2 * 3600000); // Default 2 hours if no end time
    
    return now >= signInOpens && now <= eventEndTime;
  };

  const isRSVPOpen = (event) => {
    if (!event.date || !event.signInOpensHoursBefore) return false;
    const eventDate = event.date?.toDate
      ? event.date.toDate()
      : new Date(event.date);
    const now = new Date();
    const signInOpens = new Date(
      eventDate.getTime() - (event.signInOpensHoursBefore || 1) * 3600000
    ); // Convert hours to milliseconds
    return now < signInOpens;
  };

  const hasUserRSVPd = (eventId) => {
    return rsvpEvents.includes(eventId);
  };

  const hasUserSignedIn = (eventId) => {
    return isSignedIn.includes(eventId);
  };

  const isUserRegistered = (eventId) => {
    return hasUserRSVPd(eventId) || hasUserSignedIn(eventId);
  };

  const handleRSVP = async (eventId) => {
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

        // Add to RSVP events (no points)
        const updatedRsvpEvents = [...(userData.rsvpEvents || []), eventId];

        // Add to attendees list for the event
        const updatedAttendees = [...(eventData.attendees || []), userId];

        await setDoc(
          userRef,
          {
            rsvpEvents: updatedRsvpEvents,
          },
          { merge: true }
        );

        await setDoc(
          eventRef,
          {
            attendees: updatedAttendees,
          },
          { merge: true }
        );

        setRsvpEvents(updatedRsvpEvents);
      }
    } catch (error) {
      console.error("Error RSVPing:", error);
    }
  };

  const handleMoreInfo = (event) => {
    setEventDetailsPopup({ isOpen: true, event });
  };

  const closeEventDetailsPopup = () => {
    setEventDetailsPopup({ isOpen: false, event: null });
  };

  const handleSignInSubmit = async () => {
    const { event, code } = signInPopup;
    if (!event || !code) return;

    if (code.toUpperCase() === event.attendanceCode) {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const userRef = doc(db, "Users", userId);
        const eventRef = doc(db, "events", event.id);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentPoints = Number(userData.swePoints) || 0;
          const attendedEvents = userData.attendedEvents || [];
          const rsvpEvents = userData.rsvpEvents || [];

          if (attendedEvents.includes(event.id)) {
            showAlreadySignedInMessage();
            setSignInPopup({ isOpen: false, event: null, code: "" });
            return;
          }

          const wasRSVPd = rsvpEvents.includes(event.id);
          const updatedRsvpEvents = wasRSVPd ? rsvpEvents.filter(id => id !== event.id) : rsvpEvents;

          await setDoc(userRef, {
            attendedEvents: [...attendedEvents, event.id],
            rsvpEvents: updatedRsvpEvents,
            swePoints: currentPoints + (Number(event.points) || 0),
          }, { merge: true });

          await setDoc(eventRef, {
            attendees: [...(event.attendees || []), userId],
          }, { merge: true });

          setIsSignedIn([...attendedEvents, event.id]);
          setRsvpEvents(updatedRsvpEvents);
          setSignInPopup({ isOpen: false, event: null, code: "" });
          setPopup({ isOpen: true, message: "Successfully signed in!", toast: true });
        }
      } catch (error) {
        console.error("Error signing in:", error);
        setPopup({ isOpen: true, message: "Failed to sign in", toast: true });
      }
    } else {
      setPopup({ isOpen: true, message: "Invalid attendance code", toast: true });
    }
  };

  // Page navigation logic
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(
    indexOfFirstEvent,
    indexOfLastEvent
  );
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    // Auto scroll to top when changing pages
    setTimeout(() => {
      if (eventsContainerRef.current) {
        eventsContainerRef.current.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo(0, 0);
      }
    }, 100);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    // Auto scroll to top when changing pages
    setTimeout(() => {
      if (eventsContainerRef.current) {
        eventsContainerRef.current.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo(0, 0);
      }
    }, 100);
  };

  useEffect(() => {
    fetchUserData();
    fetchEvents();
    document.body.classList.add("events-page");
    return () => {
      document.body.classList.remove("events-page");
    };
  }, []);

  useEffect(() => {
    if (selectedCommittee === "") {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(
        events.filter((event) => event.createdBy === selectedCommittee)
      );
    }
    // Reset to first page when filtering changes
    setCurrentPage(1);
  }, [selectedCommittee, events]);

  return (
    <>
      <div className="events-container" ref={eventsContainerRef}>
        <div className="events-header">
          <h2 className="events-title">Upcoming Events</h2>
          <div className="committee-filter">
            <select
              value={selectedCommittee}
              onChange={(e) => setSelectedCommittee(e.target.value)}
              className="form-select"
            >
              <option value="">All Committees</option>
              {committees.map((committee) => (
                <option key={committee} value={committee}>
                  {committee}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-message">
            <div className="loading-spinner"></div>
            <p>Loading events...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="event-cards-container">
            {currentEvents.map((event) => (
              <div
                key={event.id}
                className={`event-card ${
                  isToday(event.date) ? "today-event" : ""
                }`}
              >
                <div className="event-card-photo-area">
                  <div className="event-card-photo">
                    <img
                      src={
                        event.photo
                          ? event.photo
                          : process.env.PUBLIC_URL +
                            "/assets/placeholder-image.png"
                      }
                      alt={event.name + " event"}
                    />
                  </div>
                </div>

                <div className="event-points-badge">{event.points} pts</div>

                {isToday(event.date) && !hasEventPassed(event) && (
                  <div className="today-badge">HAPPENING TODAY</div>
                )}

                <div className="event-title-row">
                  <h4>{event.name}</h4>
                </div>

                <div className="event-card-content">
                  <div className="event-detail">
                    <MaterialSymbol icon="calendar_clock" size={24} />
                    <div className="event-date-time">
                      {formatDate(event.date)}
                      {(event.startTime || event.endTime) && (
                        <>
                          {" | "}
                          {event.startTime && event.endTime
                            ? `${formatTime(event.startTime)} - ${formatTime(
                                event.endTime
                              )}`
                            : event.startTime
                            ? `${formatTime(event.startTime)}`
                            : ""}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="event-detail">
                    <MaterialSymbol icon="location_on" size={24} />
                    <span>{event.location}</span>
                  </div>

                  <div className="event-card-footer">
                    {isSignInOpen(event) ? (
                      // Sign-in period is open
                      hasUserSignedIn(event.id) ? (
                        <button 
                          onClick={showAlreadySignedInMessage}
                          className="btn btn-signed-in-badge"
                        >
                          SIGNED IN
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSignUpClick(event.id)}
                          className="btn btn-sign-in"
                        >
                          SIGN IN
                        </button>
                      )
                    ) : isRSVPOpen(event) ? (
                      // RSVP period is open
                      isUserRegistered(event.id) ? (
                        <button
                          onClick={() => handleCancelRegistration(event.id, 0)}
                          className="btn btn-event"
                        >
                          CANCEL RSVP
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRSVP(event.id)}
                          className="btn btn-event"
                        >
                          RSVP
                        </button>
                      )
                    ) : // Event is in the future but registration is closed, or event is past
                    isUserRegistered(event.id) ? (
                      <button
                        onClick={() =>
                          handleCancelRegistration(
                            event.id,
                            hasUserSignedIn(event.id) ? event.points || 0 : 0
                          )
                        }
                        className="btn btn-event-danger"
                      >
                        Cancel{" "}
                        {hasUserSignedIn(event.id) ? "Registration" : "RSVP"}
                      </button>
                    ) : (
                      <span>
                        {new Date() >
                        (event.date?.toDate
                          ? event.date.toDate()
                          : new Date(event.date))
                          ? "Event has passed"
                          : "Registration closed"}
                      </span>
                    )}
                    <button
                      onClick={() => handleMoreInfo(event)}
                      className="btn btn-event"
                    >
                      MORE INFO
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

        {/* Page navigation buttons */}
        {totalPages > 1 && (
          <div className="page-nav-container">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="btn btn-page-nav"
            >
              <MaterialSymbol icon="arrow_back" size={20} />
              PREVIOUS PAGE
            </button>

            <span className="page-nav-info">
              PAGE {currentPage} OF {totalPages}
            </span>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="btn btn-page-nav"
            >
              NEXT PAGE
              <MaterialSymbol icon="arrow_forward" size={20} />
            </button>
          </div>
        )}
        <Popup
          isOpen={popup.isOpen}
          message={popup.message}
          toast={popup.toast}
          confirm={popup.confirm}
          onConfirm={popup.onConfirm}
          onClose={() =>
            setPopup({
              isOpen: false,
              message: "",
              toast: false,
              confirm: false,
              onConfirm: null,
            })
          }
        />
        <EventDetailsPopup
          isOpen={eventDetailsPopup.isOpen}
          event={eventDetailsPopup.event}
          onClose={closeEventDetailsPopup}
          isAdmin={isAdmin}
        />
        
        {/* Sign In Popup */}
        {signInPopup.isOpen && (
          <div className="popup-overlay" onClick={() => setSignInPopup({ isOpen: false, event: null, code: "" })}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
              <h3>Enter the event code:</h3>
              <div className="form-group">
                <input
                  type="text"
                  className="form-control"
                  value={signInPopup.code}
                  onChange={(e) => setSignInPopup(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter 6-letter code"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <div className="popup-buttons">
                <button 
                  className="btn btn-primary" 
                  onClick={handleSignInSubmit}
                  disabled={!signInPopup.code}
                >
                  Sign In
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSignInPopup({ isOpen: false, event: null, code: "" })}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default UpcomingEvents;
