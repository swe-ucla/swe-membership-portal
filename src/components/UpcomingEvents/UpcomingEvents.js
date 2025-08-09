import React, { useEffect, useState } from "react";
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

  const handleSignUpClick = (eventId) => {
    navigate(`/eventsignin/${eventId}`); // Navigate to the event signing page with event ID
  };

  const handleCancelRegistration = async (eventId, points) => {
    setPopup({
      isOpen: true,
      message: `Are you sure you want to cancel your registration?\nYou will lose any SWE points that you earned from this event.`,
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
    return now >= signInOpens && now <= eventDate;
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

  useEffect(() => {
    fetchUserData();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedCommittee === "") {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(
        events.filter((event) => event.createdBy === selectedCommittee)
      );
    }
  }, [selectedCommittee, events]);

  return (
    <>
      <div className="events-container">
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
            {filteredEvents.map((event) => (
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

                {isToday(event.date) && (
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
                        <button className="btn btn-signed-in-badge">
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
      </div>
    </>
  );
}

export default UpcomingEvents;
