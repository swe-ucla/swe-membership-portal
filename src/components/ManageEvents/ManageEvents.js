import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { QRCodeCanvas } from "qrcode.react";
import Popup from "../Popup/Popup";
import {
  EVENT_TYPES,
  COMMITTEES,
  getEventType,
  getCommittee,
} from "../../constants/eventTypes";
import "./ManageEvents.css";

const ManageEvents = () => {
  const [pastEvents, setPastEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [eventTypeFilter, setEventTypeFilter] = useState("All Event Types");
  const [committeeFilter, setCommitteeFilter] = useState("All Committees");
  const [popup, setPopup] = useState({
    isOpen: false,
    message: "",
    toast: false,
    confirm: false,
    confirmText: "Confirm",
    onConfirm: null,
  });

  // Page navigation state
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 12;
  const eventsContainerRef = useRef(null);
  const [qrEvent, setQrEvent] = useState(null);
  const qrCanvasRef = useRef(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".action-menu-wrapper")) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const buildEventSigninUrl = (eventId) =>
    `${window.location.origin}/eventsignin/${eventId}`;

  const downloadQrCode = (event) => {
    const canvas = qrCanvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) saveAs(blob, `${event.name}-QR.png`);
    });
  };

  const handlePopupClose = useCallback(() => {
    setPopup({
      isOpen: false,
      message: "",
      toast: false,
      confirm: false,
      onConfirm: null,
    });
  }, []);

  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const fetchUserData = async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      const userRef = doc(db, "Users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setIsAdmin(userData.isAdmin || false);
      }

      setUser(currentUser);
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      fetchUserData(currentUser);
    });

    document.body.classList.add("manage-events-page");
    return () => {
      unsubscribe();
      document.body.classList.remove("manage-events-page");
    };
  }, [auth, navigate]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchEvents = async () => {
      try {
        const eventsRef = collection(db, "events");
        const snapshot = await getDocs(eventsRef);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const eventsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const pastEventsData = eventsData
          .filter((event) => event.date && event.date.toDate() < today)
          .sort((a, b) => b.date.toDate() - a.date.toDate());

        const upcomingEventsData = eventsData
          .filter((event) => event.date && event.date.toDate() >= today)
          .sort((a, b) => a.date.toDate() - b.date.toDate());

        setPastEvents(pastEventsData);
        setUpcomingEvents(upcomingEventsData);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user, isAdmin]);

  const eventTypeOptions = ["All Event Types", ...EVENT_TYPES];
  const committeeOptions = ["All Committees", ...COMMITTEES];

  const filterEvents = (events) => {
    let result = events;
    if (eventTypeFilter !== "All Event Types") {
      result = result.filter((e) => getEventType(e) === eventTypeFilter);
    }
    if (committeeFilter !== "All Committees") {
      result = result.filter((e) => getCommittee(e) === committeeFilter);
    }
    return result;
  };

  const filteredUpcoming = filterEvents(upcomingEvents);
  const filteredPast = filterEvents(pastEvents);

  const fetchUserDetails = async (attendeeIds) => {
    if (!attendeeIds || attendeeIds.length === 0) return [];

    try {
      const userPromises = attendeeIds.map(async (userId) => {
        const userRef = doc(db, "Users", userId);
        const userSnap = await getDoc(userRef);
        return userSnap.exists() ? { id: userId, ...userSnap.data() } : null;
      });

      const userDetails = await Promise.all(userPromises);
      return userDetails.filter((user) => user !== null);
    } catch (error) {
      console.error("Error fetching user details:", error);
      return [];
    }
  };

  const exportToCSV = async (event) => {
    // Get all unique user IDs from both RSVP and attendees
    const rsvpIds = event.rsvpAttendees || [];
    const attendeeIds = event.attendees || [];
    const allUserIds = [...new Set([...rsvpIds, ...attendeeIds])];

    if (allUserIds.length === 0) {
      setPopup({
        isOpen: true,
        message: "No users to export.",
        toast: false,
      });
      return;
    }

    const users = await fetchUserDetails(allUserIds);

    if (users.length === 0) {
      setPopup({
        isOpen: true,
        message: "No valid users to export.",
        toast: false,
      });
      return;
    }

    const questionHeaders = event.questions
      ? event.questions.map((q) => q.text)
      : [];
    const headers = ["Email", "Full Name", "Major", "Year", "RSVP'ed", "Attended", ...questionHeaders];

    const escapeCSVValue = (value) => {
      if (value === undefined || value === null) return "";
      const strValue = value.toString();
      return strValue.includes(",") ? `"${strValue}"` : strValue;
    };

    // Categorize users
    const rsvpedAndAttended = [];
    const notRsvpedButAttended = [];
    const rsvpedButDidNotAttend = [];

    users.forEach((user) => {
      const userId = user.id;
      const didRSVP = rsvpIds.includes(userId);
      const didAttend = attendeeIds.includes(userId);

      if (didRSVP && didAttend) {
        rsvpedAndAttended.push(user);
      } else if (!didRSVP && didAttend) {
        notRsvpedButAttended.push(user);
      } else if (didRSVP && !didAttend) {
        rsvpedButDidNotAttend.push(user);
      }
    });

    const csvRows = [headers.map(escapeCSVValue).join(",")];

    // Add users in order: RSVP'd and attended, not RSVP'd but attended, RSVP'd but didn't attend
    const orderedUsers = [...rsvpedAndAttended, ...notRsvpedButAttended, ...rsvpedButDidNotAttend];

    orderedUsers.forEach((user) => {
      const userId = user.id;
      const responses = event.responses?.[userId] || {};
      const responseValues = questionHeaders.map((_, index) =>
        escapeCSVValue(responses[index] || "")
      );

      const didRSVP = rsvpIds.includes(userId);
      const didAttend = attendeeIds.includes(userId);

      const row = [
        escapeCSVValue(user.email),
        escapeCSVValue(`${user.firstName || ""} ${user.lastName || ""}`),
        escapeCSVValue(user.major),
        escapeCSVValue(user.year),
        escapeCSVValue(didRSVP ? "Yes" : "No"),
        escapeCSVValue(didAttend ? "Yes" : "No"),
        ...responseValues,
      ];
      csvRows.push(row.join(","));
    });

    // Add summary rows
    csvRows.push(""); // Empty row
    csvRows.push(`RSVP + Attended,${rsvpedAndAttended.length}`);
    csvRows.push(`No RSVP + Attended,${notRsvpedButAttended.length}`);
    csvRows.push(`RSVP + No-show,${rsvpedButDidNotAttend.length}`);
    csvRows.push(""); // Empty row
    csvRows.push(`Total Attendees,${rsvpedAndAttended.length + notRsvpedButAttended.length}`);
    csvRows.push(`Total RSVPs,${rsvpedAndAttended.length + rsvpedButDidNotAttend.length}`);

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${event.name}-All-Users.csv`);
  };

  const copyEmailsToClipboard = async (event, type = 'attendees') => {
    const userIds = type === 'rsvp' ? event.rsvpAttendees : event.attendees;
    const listType = type === 'rsvp' ? 'RSVP attendees' : 'attendees';

    if (!userIds || userIds.length === 0) {
      setPopup({
        isOpen: true,
        message: `No ${listType} to copy.`,
        toast: false,
      });
      return;
    }

    const users = await fetchUserDetails(userIds);
    const emails = users.map((user) => user.email).join(", ");

    if (emails.length === 0) {
      setPopup({
        isOpen: true,
        message: "No valid emails to copy.",
        toast: false,
      });
      return;
    }

    navigator.clipboard
      .writeText(emails)
      .then(() => {
        // Show the copy toast notification
        const toast = document.createElement("div");
        toast.className = "copy-toast";
        toast.innerHTML = `
          <div class="copy-toast-content">
            <span class="copy-icon">✓</span>
            <span class="copy-text">Copied to clipboard!</span>
          </div>
        `;
        document.body.appendChild(toast);

        // Remove the toast after 2 seconds
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy emails:", err);
        setPopup({
          isOpen: true,
          message: "Failed to copy emails. Please try again.",
          toast: false,
        });
      });
  };

  const handleEditEvent = (event) => {
    // Convert Firestore timestamp to format for date input (YYYY-MM-DDTHH:MM)
    const eventDate = event.date.toDate();
    // Convert to local timezone string for datetime-local input
    const year = eventDate.getFullYear();
    const month = String(eventDate.getMonth() + 1).padStart(2, "0");
    const day = String(eventDate.getDate()).padStart(2, "0");
    const hours = String(eventDate.getHours()).padStart(2, "0");
    const minutes = String(eventDate.getMinutes()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;
    const formattedTime = `${hours}:${minutes}`;

    // Store the event data in localStorage for the edit page to access
    const eventForEdit = {
      ...event,
      date: formattedDate,
      startTime: formattedTime,
      isEditing: true,
    };

    localStorage.setItem("editEventData", JSON.stringify(eventForEdit));
    navigate(`/addevent?edit=${event.id}`);
  };

  const deleteEvent = async (event) => {
    if (deleteLoading) return;

    setPopup({
      isOpen: true,
      message: `Are you sure you want to delete "${event.name}"? This action cannot be undone.`,
      toast: false,
      confirm: true,
      confirmText: "Delete Event",
      onConfirm: () => performDeleteEvent(event),
    });
  };

  const performDeleteEvent = async (event) => {
    setDeleteLoading(true);

    try {
      // Remove event ID from all attendees' attendedEvents list
      if (event.attendees && event.attendees.length > 0) {
        const updates = event.attendees.map(async (userId) => {
          const userRef = doc(db, "Users", userId);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            const updatedEvents = (userData.attendedEvents || []).filter(
              (id) => id !== event.id
            );
            const updatedRsvpEvents = (userData.rsvpEvents || []).filter(
              (id) => id !== event.id
            );
            await setDoc(userRef, {
              ...userData,
              attendedEvents: updatedEvents,
              rsvpEvents: updatedRsvpEvents,
            });
          }
        });

        await Promise.all(updates);
      }

      // Delete the event document itself
      const eventRef = doc(db, "events", event.id);
      await deleteDoc(eventRef);

      // Remove from state
      setPastEvents((prev) => prev.filter((e) => e.id !== event.id));
      setUpcomingEvents((prev) => prev.filter((e) => e.id !== event.id));

      setPopup({
        isOpen: true,
        message: `"${event.name}" has been successfully deleted.`,
        toast: true,
        confirm: false,
        onConfirm: null,
      });
    } catch (error) {
      console.error("Error deleting event:", error);
      setPopup({
        isOpen: true,
        message: `Error deleting event: ${error.message}`,
        toast: false,
        confirm: false,
        onConfirm: null,
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Page navigation logic
  const getCurrentEvents = (events) => {
    const indexOfLastEvent = currentPage * eventsPerPage;
    const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;

    console.log("getCurrentEvents called with:", {
      eventsLength: events.length,
      currentPage,
      eventsPerPage,
      indexOfFirstEvent,
      indexOfLastEvent,
      sliceResult: events.slice(indexOfFirstEvent, indexOfLastEvent).length,
    });

    const result = events.slice(indexOfFirstEvent, indexOfLastEvent);
    console.log("getCurrentEvents result:", result.length, "events");

    return result;
  };

  const getTotalPages = (events) => {
    return Math.ceil(events.length / eventsPerPage);
  };

  const handleNextPage = () => {
    const totalPages = getTotalPages(
      activeTab === "upcoming" ? upcomingEvents : pastEvents
    );
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

  // Reset to first page when switching tabs
  useEffect(() => {
    console.log("Tab changed to:", activeTab, "Resetting currentPage to 1");
    setCurrentPage(1);
  }, [activeTab]);

  if (loading) {
    return (
      <div className="manage-events-container">
        <div className="loading-message">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="manage-events-container">
        <div className="unauthorized-message">
          <p>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const renderTable = (events, isPast = false) => {
    const currentEvents = getCurrentEvents(events);
    const totalPages = getTotalPages(events);

    // Debug logging
    console.log("renderTable called with:", {
      totalEvents: events.length,
      currentPage,
      eventsPerPage,
      totalPages,
      currentEventsCount: currentEvents.length,
    });

    return (
      <>
        <table className="events-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Event Name</th>
              <th>Event Type</th>
              <th>Committee</th>
              <th>RSVP'd</th>
              <th>Attendees</th>
              <th>Location</th>
              <th>Attendance Code</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {currentEvents.map((event) => (
              <tr key={event.id}>
                <td>
                  {event.date.toDate().toLocaleDateString()}
                  <br />
                  {event.date.toDate().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </td>
                <td>{event.name}</td>
                <td>{getEventType(event)}</td>
                <td>{getCommittee(event)}</td>
                <td>{event.rsvpAttendees ? event.rsvpAttendees.length : 0}</td>
                <td>{event.attendees ? event.attendees.length : 0}</td>
                <td>{event.location}</td>
                <td>{event.attendanceCode || "N/A"}</td>
                <td className="event-actions">
                  <div className="action-menu-wrapper">
                    <button
                      className="btn-three-dots"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (openDropdownId !== event.id) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const estimatedHeight = 280;
                          const openUpward = window.innerHeight - rect.bottom < estimatedHeight;
                          setDropdownPosition({
                            top: rect.bottom + 4,
                            bottom: window.innerHeight - rect.top + 4,
                            left: rect.right,
                            openUpward,
                          });
                        }
                        setOpenDropdownId(
                          openDropdownId === event.id ? null : event.id
                        );
                      }}
                      aria-label="Event actions"
                    >
                      <span className="dot"></span>
                      <span className="dot"></span>
                      <span className="dot"></span>
                    </button>
                    {openDropdownId === event.id && createPortal(
                      <div
                        className="action-dropdown"
                        style={{
                          position: "fixed",
                          ...(dropdownPosition.openUpward
                            ? { bottom: dropdownPosition.bottom }
                            : { top: dropdownPosition.top }),
                          left: dropdownPosition.left,
                          transform: "translateX(-100%)",
                        }}
                      >
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            handleEditEvent(event);
                            setOpenDropdownId(null);
                          }}
                        >
                          Edit Event
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            copyEmailsToClipboard(event, "attendees");
                            setOpenDropdownId(null);
                          }}
                          disabled={
                            !event.attendees || event.attendees.length === 0
                          }
                        >
                          Copy Attendee Emails
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            copyEmailsToClipboard(event, "rsvp");
                            setOpenDropdownId(null);
                          }}
                          disabled={
                            !event.rsvpAttendees ||
                            event.rsvpAttendees.length === 0
                          }
                        >
                          Copy RSVP Emails
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            exportToCSV(event);
                            setOpenDropdownId(null);
                          }}
                          disabled={
                            (!event.attendees || event.attendees.length === 0) &&
                            (!event.rsvpAttendees ||
                              event.rsvpAttendees.length === 0)
                          }
                        >
                          Export CSV
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setQrEvent(event);
                            setOpenDropdownId(null);
                          }}
                        >
                          Show QR Code
                        </button>
                        <button
                          className="dropdown-item dropdown-item-delete"
                          onClick={() => {
                            deleteEvent(event);
                            setOpenDropdownId(null);
                          }}
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? "Deleting..." : "Delete Event"}
                        </button>
                      </div>,
                      document.body
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="page-nav-container">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="btn-page-nav"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M15.8333 10H4.16667M4.16667 10L10 15.8333M4.16667 10L10 4.16667" stroke="#B48FEF" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Previous
            </button>

            <div className="page-numbers">
              {(() => {
                const pages = [];
                const showSet = new Set([1, totalPages]);
                for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) showSet.add(i);
                const sorted = [...showSet].sort((a, b) => a - b);
                sorted.forEach((p, i) => {
                  if (i > 0 && p - sorted[i - 1] > 1) pages.push(<span key={`ellipsis-${p}`} className="page-ellipsis">...</span>);
                  pages.push(
                    <button key={p} className={`btn-page-number${currentPage === p ? " active" : ""}`} onClick={() => { setCurrentPage(p); setTimeout(() => { if (eventsContainerRef.current) eventsContainerRef.current.scrollIntoView({ behavior: "smooth" }); else window.scrollTo(0, 0); }, 100); }}>
                      {p}
                    </button>
                  );
                });
                return pages;
              })()}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="btn-page-nav"
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M4.16667 10H15.8333M15.8333 10L10 4.16667M15.8333 10L10 15.8333" stroke="#B48FEF" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="manage-events-container" ref={eventsContainerRef}>
      <div className="header-section">
        <h2 className="manage-events-title">Event Management</h2>
        <button
          onClick={() => navigate("/addevent")}
          className="btn-create-event"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="21"
            height="21"
            viewBox="0 0 21 21"
            fill="none"
          >
            <path d="M9 12H0V9H9V0H12V9H21V12H12V21H9V12Z" fill="white" />
          </svg>
          Create Event
        </button>
      </div>

      <div className="tabs-container">
        <div className="filters-container">
          <div className="tabs-header">
            <button
              className={`tab-button ${
                activeTab === "upcoming" ? "active" : ""
              }`}
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming ({upcomingEvents.length})
            </button>
            <button
              className={`tab-button ${activeTab === "past" ? "active" : ""}`}
              onClick={() => setActiveTab("past")}
            >
              Past ({pastEvents.length})
            </button>
          </div>
          <div className="admin-filters">
            <div className="event-type-filter-admin">
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="form-select-admin"
              >
                {eventTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="committee-filter-admin">
              <select
                value={committeeFilter}
                onChange={(e) => setCommitteeFilter(e.target.value)}
                className="form-select-admin"
              >
                {committeeOptions.map((committee) => (
                  <option key={committee} value={committee}>
                    {committee}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="tab-content">
          {activeTab === "upcoming" ? (
            upcomingEvents.length === 0 ? (
              <p className="no-events-message">No upcoming events found.</p>
            ) : (
              renderTable(filteredUpcoming)
            )
          ) : pastEvents.length === 0 ? (
            <p className="no-events-message">No past events found.</p>
          ) : (
            renderTable(filteredPast, true)
          )}
        </div>
      </div>

      <Popup
        isOpen={popup.isOpen}
        message={popup.message}
        toast={popup.toast}
        confirm={popup.confirm}
        confirmText={popup.confirmText}
        onConfirm={popup.onConfirm}
        onClose={handlePopupClose}
        className={popup.confirm ? "manage-events-confirm-popup" : ""}
      />

      {qrEvent && (
        <div className="qr-modal-overlay" onClick={() => setQrEvent(null)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="qr-modal-close"
              onClick={() => setQrEvent(null)}
            >
              ×
            </button>
            <h3 className="qr-modal-title">{qrEvent.name}</h3>
            <p className="qr-modal-subtitle">
              Scan to sign in to this event
            </p>
            <div className="qr-modal-canvas" ref={qrCanvasRef}>
              <QRCodeCanvas
                value={buildEventSigninUrl(qrEvent.id)}
                size={256}
                level="M"
                includeMargin
              />
            </div>
            <p className="qr-modal-url">{buildEventSigninUrl(qrEvent.id)}</p>
            <button
              className="qr-modal-download"
              onClick={() => downloadQrCode(qrEvent)}
            >
              Download PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageEvents;
