import React, { useEffect, useState, useRef, useCallback } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  deleteDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./UpcomingEvents.css";
import { MaterialSymbol } from "react-material-symbols";
import "react-material-symbols/rounded";

import Popup from "../Popup/Popup";
import SignInQuestions from "./SignInQuestions";

import placeholderImage from "../../assets/placeholder-image.png";
import {
  EVENT_TYPES,
  COMMITTEES,
  getEventType,
  getCommittee,
} from "../../constants/eventTypes";

function UpcomingEvents() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
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
  const [selectedEventType, setSelectedEventType] = useState("");
  const [selectedCommittee, setSelectedCommittee] = useState("");
  const [eventDetailsPopup, setEventDetailsPopup] = useState({
    isOpen: false,
    event: null,
  });
  const [signInPopup, setSignInPopup] = useState({
    isOpen: false,
    event: null,
    code: "",
    responses: {},
    error: "",
  });


  // Page navigation state
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 9;
  const eventsContainerRef = useRef(null);

  const fetchUserData = useCallback(async () => {
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
  }, [navigate]);

  const fetchEvents = useCallback(async () => {
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

    } catch (error) {
      console.error("Error fetching events:", error);
    }
    setLoading(false);
  }, []);

  const isToday = (eventDate) => {
    const today = new Date();
    const eventDateObj = eventDate?.toDate
      ? eventDate.toDate()
      : new Date(eventDate);

    return (
      today.getDate() === eventDateObj.getDate() &&
      today.getMonth() === eventDateObj.getMonth() &&
      today.getFullYear() === eventDateObj.getFullYear()
    );
  };

  const hasEventPassed = (event) => {
    const now = new Date();
    const eventDate = event.date?.toDate
      ? event.date.toDate()
      : new Date(event.date);
    const eventEndTime = event.endTime
      ? new Date(
        eventDate.getTime() +
        (parseInt(event.endTime.split(":")[0]) * 60 +
          parseInt(event.endTime.split(":")[1]) -
          parseInt(event.startTime?.split(":")[0] || "0") * 60 -
          parseInt(event.startTime?.split(":")[1] || "0")) *
        60000
      )
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

  const buildGoogleCalendarUrl = (event) => {
    const baseDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
    const pad = (n) => String(n).padStart(2, "0");

    const toGCalDate = (date, timeStr) => {
      const d = new Date(date);
      if (timeStr) {
        const [h, m] = timeStr.split(":");
        d.setHours(Number(h), Number(m), 0, 0);
      }
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    };

    const start = toGCalDate(baseDate, event.startTime);
    const end = toGCalDate(baseDate, event.endTime || event.startTime);

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: event.name || "",
      dates: `${start}/${end}`,
      details: event.description || "",
      location: event.location || "",
    });

    return `https://calendar.google.com/calendar/render?${params}`;
  };

  const showAlreadySignedInMessage = () => {
    setPopup({
      isOpen: true,
      message: "You have already signed into this event.",
      toast: true,
    });
  };

  const handleSignUpClick = (eventId) => {
    const event = events.find((e) => e.id === eventId);
    setSignInPopup({ isOpen: true, event, code: "", responses: {}, error: "" });
  };

  const handleCancelRegistration = async (eventId, points) => {
    setPopup({
      isOpen: true,
      message: `Are you sure you want to cancel your RSVP?`,
      toast: false,
      confirm: true,
      onConfirm: () => {
        setPopup((prev) => ({
          ...prev,
          isOpen: false,
        }));
        performCancelRegistration(eventId, points);
      },
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
        // Remove from user doc
        await updateDoc(userRef, {
          rsvpEvents: arrayRemove(eventId),
          attendedEvents: arrayRemove(eventId),
          swePoints: updatedSWEPoints,
        });

        // Remove from event doc
        const eventData = eventSnap.data();
        const wasInRsvp = (eventData.rsvpAttendees || []).includes(userId);
        const wasInAttendees = (eventData.attendees || []).includes(userId);
        await updateDoc(eventRef, {
          attendees: arrayRemove(userId),
          rsvpAttendees: arrayRemove(userId),
          ...(wasInRsvp && { rsvpCount: increment(-1) }),
          ...(wasInAttendees && { attendeeCount: increment(-1) }),
        });

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
      ? new Date(
        eventDate.getTime() +
        (parseInt(event.endTime.split(":")[0]) * 60 +
          parseInt(event.endTime.split(":")[1]) -
          parseInt(event.startTime?.split(":")[0] || "0") * 60 -
          parseInt(event.startTime?.split(":")[1] || "0")) *
        60000
      )
      : new Date(eventDate.getTime() + 2 * 3600000); // Default 2 hours if no end time

    return now >= signInOpens && now <= eventEndTime;
  };

  const getHoursLeftToSignIn = (event) => {
    const now = new Date();
    const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);

    const eventEndTime = new Date(
      eventDate.getTime() +
      (parseInt(event.endTime.split(":")[0]) * 60 +
        parseInt(event.endTime.split(":")[1]) -
        parseInt(event.startTime?.split(":")[0] || "0") * 60 -
        parseInt(event.startTime?.split(":")[1] || "0")) *
      60000
    );

    const diffInMs = eventEndTime - now;
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInMinutes = Math.ceil((diffInMs % 3600000) / 60000);

    return diffInHours >= 1
      ? `${diffInHours} Hour${diffInHours !== 1 ? "s" : ""} Left to Sign In`
      : `${diffInMinutes} Minute${diffInMinutes !== 1 ? "s" : ""} Left to Sign In`;
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
      // Add event to user's RSVP list
      await updateDoc(userRef, {
        rsvpEvents: arrayUnion(eventId),
      });

      // Add user to event's rsvpAttendees
      await updateDoc(eventRef, {
        rsvpAttendees: arrayUnion(userId),
        rsvpCount: increment(1),
      });

      setRsvpEvents((prev) => [...prev, eventId]);
      setPopup({ isOpen: true, message: "RSVP successful!", toast: true });
    } catch (error) {
      console.error("Error RSVPing:", error);
      setPopup({ isOpen: true, message: "Failed to RSVP.", toast: true });
    }
  };

  const handleMoreInfo = (event) => {
    setEventDetailsPopup({ isOpen: true, event });
  };

  const closeEventDetailsPopup = () => {
    setEventDetailsPopup({ isOpen: false, event: null });
  };

  const formatEventDate = (timestamp) => {
    if (!timestamp) return "";
    const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatEventTime = (timeStr) => {
    if (!timeStr) return "";
    const [hour, minute] = timeStr.split(":");
    const date = new Date();
    date.setHours(Number(hour), Number(minute));
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatEventTimeRange = (event) => {
    if (event.startTime && event.endTime) {
      return `${formatEventTime(event.startTime)} - ${formatEventTime(event.endTime)}`;
    } else if (event.startTime) {
      return formatEventTime(event.startTime);
    }
    return "";
  };

  const hasMissingRequiredResponses = (questions = [], responses = {}) => {
    return questions.some((q, index) => {
      if (!q.required) return false;
      const response = responses[index];

      if (q.type === "checkboxes") {
        return !Array.isArray(response) || response.length === 0;
      }

      return !response || (typeof response === "string" && response.trim() === "");
    });
  };

  const handleSignInSubmit = async () => {
    const { event, code, responses } = signInPopup;
    if (!event || !code) return;

    if (hasMissingRequiredResponses(event.questions || [], responses || {})) {
      setPopup({
        isOpen: true,
        message: "Please answer all required questions",
        toast: true,
      });
      return;
    }

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

          // Update user document
          const userUpdateData = {
            attendedEvents: arrayUnion(event.id),
            swePoints: currentPoints + (Number(event.points) || 0),
            [`eventResponses.${event.id}`]: responses || {},
          };
          await updateDoc(userRef, userUpdateData);

          // Update event document
          const eventUpdateData = {
            attendees: arrayUnion(userId),
            attendeeCount: increment(1),
            responses: {
              ...(event.responses || {}),
              [userId]: responses || {},
            },
          };
          await updateDoc(eventRef, eventUpdateData);

          setIsSignedIn([...attendedEvents, event.id]);
          setSignInPopup({ isOpen: false, event: null, code: "" });
          setPopup({
            isOpen: true,
            message: "Successfully signed in!",
            toast: true,
          });
        }
      } catch (error) {
        console.error("Error signing in:", error);
        setPopup({ isOpen: true, message: "Failed to sign in", toast: true });
      }
    } else {
      setSignInPopup((prev) => ({ ...prev, error: "Invalid attendance code" }));
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
    document.documentElement.classList.add("events-page");
    document.body.classList.add("events-page");
    return () => {
      document.documentElement.classList.remove("events-page");
      document.body.classList.remove("events-page");
    };
  }, [fetchEvents, fetchUserData]);

  useEffect(() => {
    let result = events;
    if (selectedEventType !== "") {
      result = result.filter(
        (event) => getEventType(event) === selectedEventType
      );
    }
    if (selectedCommittee !== "") {
      result = result.filter(
        (event) => getCommittee(event) === selectedCommittee
      );
    }
    setFilteredEvents(result);
    setCurrentPage(1);
  }, [selectedEventType, selectedCommittee, events]);

  return (
    <>
      <div className="events-container" ref={eventsContainerRef}>
        <div className="events-header">
          <h2 className="events-title">Upcoming Events</h2>
          <div className="events-filters">
            <div className="event-type-filter">
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="form-select"
              >
                <option value="">All Event Types</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="committee-filter">
              <select
                value={selectedCommittee}
                onChange={(e) => setSelectedCommittee(e.target.value)}
                className="form-select"
              >
                <option value="">All Committees</option>
                {COMMITTEES.map((committee) => (
                  <option key={committee} value={committee}>
                    {committee}
                  </option>
                ))}
              </select>
            </div>
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
                className={`event-card ${isToday(event.date) ? "today-event" : ""
                  }`}
              >
                <div className="event-card-photo-area">
                  <div className="event-card-photo">
                    <img
                      src={
                        event.photo
                          ? event.photo
                          : placeholderImage
                      }
                      alt={event.name + " event"}
                    />
                  </div>
                </div>

                <div className="event-points-badge">{event.points} pts</div>

                {isToday(event.date) && !hasEventPassed(event) && (
                  <div className="today-badge">HAPPENING TODAY</div>
                )}

                {!hasEventPassed(event) && isSignInOpen(event) && (
                  <div className="sign-in-hours-badge">{getHoursLeftToSignIn(event)}</div>
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
                          className="btn btn-cancel-rsvp"
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
                          className="btn btn-cancel-rsvp"
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
                      className="btn btn-more-info"
                    >
                      MORE INFO
                    </button>
                    <a
                      href={buildGoogleCalendarUrl(event)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-gcal"
                      title="Add to Google Calendar"
                    >
                      <MaterialSymbol icon="calendar_add_on" size={24} />
                    </a>
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
      </div>
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
      <Popup
        isOpen={eventDetailsPopup.isOpen}
        onClose={closeEventDetailsPopup}
        title={eventDetailsPopup.event?.name}
        className="popup-wide"
      >
          {eventDetailsPopup.event && (
            <div className="event-details-content">
              <div className="event-info-grid">
                <div className="event-info-item">
                  <svg className="event-info-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 8H19V6H5V8ZM5 22C4.45 22 3.97917 21.8042 3.5875 21.4125C3.19583 21.0208 3 20.55 3 20V6C3 5.45 3.19583 4.97917 3.5875 4.5875C3.97917 4.19583 4.45 4 5 4H6V2H8V4H16V2H18V4H19C19.55 4 20.0208 4.19583 20.4125 4.5875C20.8042 4.97917 21 5.45 21 6V11.675C20.6833 11.525 20.3583 11.4 20.025 11.3C19.6917 11.2 19.35 11.125 19 11.075V10H5V20H11.3C11.4167 20.3667 11.5542 20.7167 11.7125 21.05C11.8708 21.3833 12.0583 21.7 12.275 22H5ZM18 23C16.6167 23 15.4375 22.5125 14.4625 21.5375C13.4875 20.5625 13 19.3833 13 18C13 16.6167 13.4875 15.4375 14.4625 14.4625C15.4375 13.4875 16.6167 13 18 13C19.3833 13 20.5625 13.4875 21.5375 14.4625C22.5125 15.4375 23 16.6167 23 18C23 19.3833 22.5125 20.5625 21.5375 21.5375C20.5625 22.5125 19.3833 23 18 23ZM19.675 20.375L20.375 19.675L18.5 17.8V15H17.5V18.2L19.675 20.375Z" fill="black" fillOpacity="0.7"/>
                  </svg>
                  <span className="event-info-text">
                    {formatEventDate(eventDetailsPopup.event.date)} | {formatEventTimeRange(eventDetailsPopup.event)}
                  </span>
                </div>

                <div className="event-info-item">
                  <svg className="event-info-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 12C12.55 12 13.0208 11.8042 13.4125 11.4125C13.8042 11.0208 14 10.55 14 10C14 9.45 13.8042 8.97917 13.4125 8.5875C13.0208 8.19583 12.55 8 12 8C11.45 8 10.9792 8.19583 10.5875 8.5875C10.1958 8.97917 10 9.45 10 10C10 10.55 10.1958 11.0208 10.5875 11.4125C10.9792 11.8042 11.45 12 12 12ZM12 19.35C14.0333 17.4833 15.5417 15.7875 16.525 14.2625C17.5083 12.7375 18 11.3833 18 10.2C18 8.38333 17.4208 6.89583 16.2625 5.7375C15.1042 4.57917 13.6833 4 12 4C10.3167 4 8.89583 4.57917 7.7375 5.7375C6.57917 6.89583 6 8.38333 6 10.2C6 11.3833 6.49167 12.7375 7.475 14.2625C8.45833 15.7875 9.96667 17.4833 12 19.35ZM12 22C9.31667 19.7167 7.3125 17.5958 5.9875 15.6375C4.6625 13.6792 4 11.8667 4 10.2C4 7.7 4.80417 5.70833 6.4125 4.225C8.02083 2.74167 9.88333 2 12 2C14.1167 2 15.9792 2.74167 17.5875 4.225C19.1958 5.70833 20 7.7 20 10.2C20 11.8667 19.3375 13.6792 18.0125 15.6375C16.6875 17.5958 14.6833 19.7167 12 22Z" fill="black" fillOpacity="0.7"/>
                  </svg>
                  <span className="event-info-text">{eventDetailsPopup.event.location}</span>
                </div>

                <div className="event-info-item">
                  <svg className="event-info-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M1 20V17.2C1 16.6333 1.14583 16.1125 1.4375 15.6375C1.72917 15.1625 2.11667 14.8 2.6 14.55C3.63333 14.0333 4.68333 13.6458 5.75 13.3875C6.81667 13.1292 7.9 13 9 13C10.1 13 11.1833 13.1292 12.25 13.3875C13.3167 13.6458 14.3667 14.0333 15.4 14.55C15.8833 14.8 16.2708 15.1625 16.5625 15.6375C16.8542 16.1125 17 16.6333 17 17.2V20H1ZM19 20V17C19 16.2667 18.7958 15.5625 18.3875 14.8875C17.9792 14.2125 17.4 13.6333 16.65 13.15C17.5 13.25 18.3 13.4208 19.05 13.6625C19.8 13.9042 20.5 14.2 21.15 14.55C21.75 14.8833 22.2083 15.2542 22.525 15.6625C22.8417 16.0708 23 16.5167 23 17V20H19ZM9 12C7.9 12 6.95833 11.6083 6.175 10.825C5.39167 10.0417 5 9.1 5 8C5 6.9 5.39167 5.95833 6.175 5.175C6.95833 4.39167 7.9 4 9 4C10.1 4 11.0417 4.39167 11.825 5.175C12.6083 5.95833 13 6.9 13 8C13 9.1 12.6083 10.0417 11.825 10.825C11.0417 11.6083 10.1 12 9 12ZM19 8C19 9.1 18.6083 10.0417 17.825 10.825C17.0417 11.6083 16.1 12 15 12C14.8167 12 14.5833 11.9792 14.3 11.9375C14.0167 11.8958 13.7833 11.85 13.6 11.8C14.05 11.2667 14.3958 10.675 14.6375 10.025C14.8792 9.375 15 8.7 15 8C15 7.3 14.8792 6.625 14.6375 5.975C14.3958 5.325 14.05 4.73333 13.6 4.2C13.8333 4.11667 14.0667 4.0625 14.3 4.0375C14.5333 4.0125 14.7667 4 15 4C16.1 4 17.0417 4.39167 17.825 5.175C18.6083 5.95833 19 6.9 19 8ZM3 18H15V17.2C15 17.0167 14.9542 16.85 14.8625 16.7C14.7708 16.55 14.65 16.4333 14.5 16.35C13.6 15.9 12.6917 15.5625 11.775 15.3375C10.8583 15.1125 9.93333 15 9 15C8.06667 15 7.14167 15.1125 6.225 15.3375C5.30833 15.5625 4.4 15.9 3.5 16.35C3.35 16.4333 3.22917 16.55 3.1375 16.7C3.04583 16.85 3 17.0167 3 17.2V18ZM9 10C9.55 10 10.0208 9.80417 10.4125 9.4125C10.8042 9.02083 11 8.55 11 8C11 7.45 10.8042 6.97917 10.4125 6.5875C10.0208 6.19583 9.55 6 9 6C8.45 6 7.97917 6.19583 7.5875 6.5875C7.19583 6.97917 7 7.45 7 8C7 8.55 7.19583 9.02083 7.5875 9.4125C7.97917 9.80417 8.45 10 9 10Z" fill="black" fillOpacity="0.7"/>
                  </svg>
                  <span className="event-info-text">
                    {getEventType(eventDetailsPopup.event) || "—"}
                  </span>
                </div>

                {getCommittee(eventDetailsPopup.event) && (
                  <div className="event-info-item">
                    <svg className="event-info-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M1 20V17.2C1 16.6333 1.14583 16.1125 1.4375 15.6375C1.72917 15.1625 2.11667 14.8 2.6 14.55C3.63333 14.0333 4.68333 13.6458 5.75 13.3875C6.81667 13.1292 7.9 13 9 13C10.1 13 11.1833 13.1292 12.25 13.3875C13.3167 13.6458 14.3667 14.0333 15.4 14.55C15.8833 14.8 16.2708 15.1625 16.5625 15.6375C16.8542 16.1125 17 16.6333 17 17.2V20H1ZM19 20V17C19 16.2667 18.7958 15.5625 18.3875 14.8875C17.9792 14.2125 17.4 13.6333 16.65 13.15C17.5 13.25 18.3 13.4208 19.05 13.6625C19.8 13.9042 20.5 14.2 21.15 14.55C21.75 14.8833 22.2083 15.2542 22.525 15.6625C22.8417 16.0708 23 16.5167 23 17V20H19ZM9 12C7.9 12 6.95833 11.6083 6.175 10.825C5.39167 10.0417 5 9.1 5 8C5 6.9 5.39167 5.95833 6.175 5.175C6.95833 4.39167 7.9 4 9 4C10.1 4 11.0417 4.39167 11.825 5.175C12.6083 5.95833 13 6.9 13 8C13 9.1 12.6083 10.0417 11.825 10.825C11.0417 11.6083 10.1 12 9 12ZM19 8C19 9.1 18.6083 10.0417 17.825 10.825C17.0417 11.6083 16.1 12 15 12C14.8167 12 14.5833 11.9792 14.3 11.9375C14.0167 11.8958 13.7833 11.85 13.6 11.8C14.05 11.2667 14.3958 10.675 14.6375 10.025C14.8792 9.375 15 8.7 15 8C15 7.3 14.8792 6.625 14.6375 5.975C14.3958 5.325 14.05 4.73333 13.6 4.2C13.8333 4.11667 14.0667 4.0625 14.3 4.0375C14.5333 4.0125 14.7667 4 15 4C16.1 4 17.0417 4.39167 17.825 5.175C18.6083 5.95833 19 6.9 19 8ZM3 18H15V17.2C15 17.0167 14.9542 16.85 14.8625 16.7C14.7708 16.55 14.65 16.4333 14.5 16.35C13.6 15.9 12.6917 15.5625 11.775 15.3375C10.8583 15.1125 9.93333 15 9 15C8.06667 15 7.14167 15.1125 6.225 15.3375C5.30833 15.5625 4.4 15.9 3.5 16.35C3.35 16.4333 3.22917 16.55 3.1375 16.7C3.04583 16.85 3 17.0167 3 17.2V18ZM9 10C9.55 10 10.0208 9.80417 10.4125 9.4125C10.8042 9.02083 11 8.55 11 8C11 7.45 10.8042 6.97917 10.4125 6.5875C10.0208 6.19583 9.55 6 9 6C8.45 6 7.97917 6.19583 7.5875 6.5875C7.19583 6.97917 7 7.45 7 8C7 8.55 7.19583 9.02083 7.5875 9.4125C7.97917 9.80417 8.45 10 9 10Z" fill="black" fillOpacity="0.7"/>
                    </svg>
                    <span className="event-info-text">
                      {getCommittee(eventDetailsPopup.event)} Committee
                    </span>
                  </div>
                )}
              </div>

              {eventDetailsPopup.event.attendanceCode && isAdmin && (
                <div className="event-detail-row">
                  <strong>Attendance Code:</strong> {eventDetailsPopup.event.attendanceCode}
                </div>
              )}
              {eventDetailsPopup.event.points && (
                <div className="event-detail-row">
                  <strong>Points:</strong> {eventDetailsPopup.event.points}
                </div>
              )}
              {eventDetailsPopup.event.description && (
                <div className="event-description">
                  <p>
                    <strong>Description:</strong> {eventDetailsPopup.event.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </Popup>

        {/* Sign In Popup */}
        <Popup
          isOpen={signInPopup.isOpen}
          onClose={() =>
            setSignInPopup({ isOpen: false, event: null, code: "", responses: {} })
          }
        >
          <h3 className="signin-popup-title">Enter the event code:</h3>
          <input
            type="text"
            className="signin-code-input"
            value={signInPopup.code}
            onChange={(e) =>
              setSignInPopup((prev) => ({
                ...prev,
                code: e.target.value.toUpperCase(),
                error: "",
              }))
            }
            placeholder="Enter 6-letter code"
            maxLength={6}
            autoFocus
          />
          {signInPopup.error && (
            <p className="signin-error">{signInPopup.error}</p>
          )}
          <SignInQuestions
            questions={signInPopup.event?.questions || []}
            responses={signInPopup.responses || {}}
            setResponses={(newResponses) =>
              setSignInPopup((prev) => ({
                ...prev,
                responses: newResponses,
              }))
            }
          />
          <div className="popup-buttons">
            <button
              className="btn btn-primary"
              onClick={handleSignInSubmit}
              disabled={!signInPopup.code}
            >
              Sign In
            </button>
          </div>
        </Popup>
    </>
  );
}

export default UpcomingEvents;
