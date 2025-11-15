import React, { useEffect, useState, useCallback, useRef } from "react";
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
import Popup from "../Popup/Popup";
import "./ManageEvents.css";

const ManageEvents = () => {
  const [pastEvents, setPastEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [committeeFilter, setCommitteeFilter] = useState("All Committees");
  const [popup, setPopup] = useState({
    isOpen: false,
    message: "",
    toast: false,
    confirm: false,
    onConfirm: null,
  });

  // Page navigation state
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 12;
  const eventsContainerRef = useRef(null);

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

  // Extract all unique committees
  /*
  const committees = [
    "All Committees",
    ...Array.from(
      new Set(
        [...pastEvents, ...upcomingEvents]
          .map((e) =>
            typeof e.createdBy === "string" ? e.createdBy.trim() : e.createdBy
          )
          .filter(Boolean)
      )
    ).sort(),
  ];
  */

  const committees = [
    "All Committees",
    "Advocacy",
    "Dev",
    "Evening with Industry",
    "General",
    "Internal Affairs",
    "Lobbying",
    "Outreach",
    "Technical",
  ];

  // Apply committee filter
  const filterEvents = (events) => {
    if (committeeFilter === "All Committees") return events;
    return events.filter((e) => e.createdBy === committeeFilter);
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

  const renderTable = (events) => {
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
              <th>Event Name</th>
              <th>Date</th>
              <th>Committee</th>
              <th>Location</th>
              <th>Attendance Code</th>
              <th>RSVP'd</th>
              <th>Attendees</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentEvents.map((event) => (
              <tr key={event.id}>
                <td>{event.name}</td>
                <td>
                  {event.date.toDate().toLocaleDateString()}
                  <br />
                  {event.date.toDate().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </td>
                <td>{event.createdBy}</td>
                <td>{event.location}</td>
                <td>{event.attendanceCode || 'N/A'}</td>
                <td>{event.rsvpAttendees ? event.rsvpAttendees.length : 0}</td>
                <td>{event.attendees ? event.attendees.length : 0}</td>
                <td className="event-actions">
                  <div className="actions-top">
                    <button
                      className="btn-edit"
                      onClick={() => handleEditEvent(event)}
                      title="Edit"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M3.33333 12.6667H4.28333L10.8 6.15L9.85 5.2L3.33333 11.7167V12.6667ZM2 14V11.1667L10.8 2.38333C10.9333 2.26111 11.0806 2.16667 11.2417 2.1C11.4028 2.03333 11.5722 2 11.75 2C11.9678 2 12.1 2.03333 12.2667 2.1C12.4333 2.16667 12.5778 2.26667 12.7 2.4L13.6167 3.33333C13.75 3.45556 13.8472 3.6 13.9083 3.76667C13.9694 3.93333 14 4.1 14 4.26667C14 4.44444 13.9694 4.61389 13.9083 4.775C13.8472 4.93611 13.75 5.08333 13.6167 5.21667L4.83333 14H2ZM10.3167 5.68333L9.85 5.2L10.8 6.15L10.3167 5.68333Z"
                          fill="white"
                        />
                      </svg>
                      Edit
                    </button>
                    {auth.currentUser?.uid === event.createdByUser ? (
                      <button
                        className="btn-delete"
                        onClick={() => deleteEvent(event)}
                        disabled={deleteLoading}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                        >
                          <path
                            d="M5.25 15.75C4.8375 15.75 4.48438 15.6031 4.19063 15.3094C3.89688 15.0156 3.75 14.6625 3.75 14.25V4.5H3V3H6.75V2.25H11.25V3H15V4.5H14.25V14.25C14.25 14.6625 14.1031 15.0156 13.8094 15.3094C13.5156 15.6031 13.1625 15.75 12.75 15.75H5.25ZM12.75 4.5H5.25V14.25H12.75V4.5ZM6.75 12.75H8.25V6H6.75V12.75ZM9.75 12.75H11.25V6H9.75V12.75Z"
                            fill="white"
                          />
                        </svg>
                        {deleteLoading ? "Deleting..." : "Delete"}
                      </button>
                    ) : (
                      <button disabled className="btn-delete">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                        >
                          <path
                            d="M5.25 15.75C4.8375 15.75 4.48438 15.6031 4.19063 15.3094C3.89688 15.0156 3.75 14.6625 3.75 14.25V4.5H3V3H6.75V2.25H11.25V3H15V4.5H14.25V14.25C14.25 14.6625 14.1031 15.0156 13.8094 15.3094C13.5156 15.6031 13.1625 15.75 12.75 15.75H5.25ZM12.75 4.5H5.25V14.25H12.75V4.5ZM6.75 12.75H8.25V6H6.75V12.75ZM9.75 12.75H11.25V6H9.75V12.75Z"
                            fill="white"
                          />
                        </svg>
                        Delete
                      </button>
                    )}
                    <button
                      className="btn-export"
                      onClick={() => exportToCSV(event)}
                      disabled={
                        (!event.attendees || event.attendees.length === 0) && 
                        (!event.rsvpAttendees || event.rsvpAttendees.length === 0)
                      }
                      title="Export CSV"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="11"
                        height="14"
                        viewBox="0 0 11 14"
                        fill="none"
                      >
                        <path
                          d="M0.941896 14L0 13.0209L1.98471 10.9939H0.470948V9.61963H4.27217V13.5018H2.92661V11.973L0.941896 14ZM5.61774 13.7423V12.3681H9.65443V4.80982H6.29052V1.37423H1.58104V8.2454H0.235474V1.37423C0.235474 0.996319 0.367227 0.672802 0.630734 0.403681C0.894241 0.13456 1.21101 0 1.58104 0H6.9633L11 4.1227V12.3681C11 12.746 10.8682 13.0695 10.6047 13.3386C10.3412 13.6078 10.0245 13.7423 9.65443 13.7423H5.61774Z"
                          fill="white"
                        />
                      </svg>
                      Export CSV
                    </button>
                  </div>
                  <div className="actions-bottom">
                    <button
                      className="btn-copy"
                      onClick={() => copyEmailsToClipboard(event, 'attendees')}
                      disabled={
                        !event.attendees || event.attendees.length === 0
                      }
                      title="Copy Attendee Emails"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="14"
                        viewBox="0 0 12 14"
                        fill="none"
                      >
                        <path
                          d="M4.23529 11.2C3.84706 11.2 3.51471 11.0629 3.23824 10.7887C2.96176 10.5146 2.82353 10.185 2.82353 9.8V1.4C2.82353 1.015 2.96176 0.685417 3.23824 0.41125C3.51471 0.137083 3.84706 0 4.23529 0H10.5882C10.9765 0 11.3088 0.137083 11.5853 0.41125C11.8618 0.685417 12 1.015 12 1.4V9.8C12 10.185 11.8618 10.5146 11.5853 10.7887C11.3088 11.0629 10.9765 11.2 10.5882 11.2H4.23529ZM4.23529 9.8H10.5882V1.4H4.23529V9.8ZM1.41176 14C1.02353 14 0.691177 13.8629 0.414706 13.5887C0.138235 13.3146 0 12.985 0 12.6V2.8H1.41176V12.6H9.17647V14H1.41176Z"
                          fill="white"
                        />
                      </svg>
                      Copy Attendee Emails
                    </button>
                  </div>
                  <div className="actions-third">
                    <button
                      className="btn-copy"
                      onClick={() => copyEmailsToClipboard(event, 'rsvp')}
                      disabled={
                        !event.rsvpAttendees || event.rsvpAttendees.length === 0
                      }
                      title="Copy RSVP Emails"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="14"
                        viewBox="0 0 12 14"
                        fill="none"
                      >
                        <path
                          d="M4.23529 11.2C3.84706 11.2 3.51471 11.0629 3.23824 10.7887C2.96176 10.5146 2.82353 10.185 2.82353 9.8V1.4C2.82353 1.015 2.96176 0.685417 3.23824 0.41125C3.51471 0.137083 3.84706 0 4.23529 0H10.5882C10.9765 0 11.3088 0.137083 11.5853 0.41125C11.8618 0.685417 12 1.015 12 1.4V9.8C12 10.185 11.8618 10.5146 11.5853 10.7887C11.3088 11.0629 10.9765 11.2 10.5882 11.2H4.23529ZM4.23529 9.8H10.5882V1.4H4.23529V9.8ZM1.41176 14C1.02353 14 0.691177 13.8629 0.414706 13.5887C0.138235 13.3146 0 12.985 0 12.6V2.8H1.41176V12.6H9.17647V14H1.41176Z"
                          fill="white"
                        />
                      </svg>
                      Copy RSVP Emails
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Page navigation buttons - always show if there are events */}
        {events.length > 0 && (
          <div className="page-nav-container">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="btn btn-page-nav"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M15.8333 10H4.16667M4.16667 10L10 15.8333M4.16667 10L10 4.16667"
                  stroke="currentColor"
                  strokeWidth="1.67"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              PREVIOUS PAGE
            </button>

            <span className="page-nav-info">
              PAGE {currentPage} OF {totalPages} ({events.length} total events)
            </span>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="btn btn-page-nav"
            >
              NEXT PAGE
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M4.16667 10H15.8333M15.8333 10L10 4.16667M15.8333 10L10 15.8333"
                  stroke="currentColor"
                  strokeWidth="1.67"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
          <div className="committee-filter-admin">
            <select
              value={committeeFilter}
              onChange={(e) => setCommitteeFilter(e.target.value)}
              className="form-select-admin"
            >
              {committees.map((committee) => (
                <option key={committee} value={committee}>
                  {committee}
                </option>
              ))}
            </select>
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
            renderTable(filteredPast)
          )}
        </div>
      </div>

      <Popup
        isOpen={popup.isOpen}
        message={popup.message}
        toast={popup.toast}
        confirm={popup.confirm}
        onConfirm={popup.onConfirm}
        onClose={handlePopupClose}
      />
    </div>
  );
};

export default ManageEvents;
