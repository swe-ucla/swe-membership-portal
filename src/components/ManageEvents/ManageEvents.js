import React, { useEffect, useState } from "react";
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
  const [popup, setPopup] = useState({ isOpen: false, message: "", toast: false });

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

    return () => unsubscribe();
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
    if (!event.attendees || event.attendees.length === 0) {
      setPopup({ isOpen: true, message: "No attendees to export.", toast: false });
      return;
    }

    const users = await fetchUserDetails(event.attendees);

    if (users.length === 0) {
      setPopup({ isOpen: true, message: "No valid users to export.", toast: false });
      return;
    }

    const questionHeaders = event.questions
      ? event.questions.map((q) => q.text)
      : [];
    const headers = [
      "Email",
      "Full Name",
      "Major",
      "Year",
      "Member ID",
      ...questionHeaders,
    ];

    const escapeCSVValue = (value) => {
      if (value === undefined || value === null) return "";
      const strValue = value.toString();
      return strValue.includes(",") ? `"${strValue}"` : strValue;
    };

    const csvRows = [headers.map(escapeCSVValue).join(",")];

    users.forEach((user) => {
      const userId = user.id;
      const responses = event.responses?.[userId] || {};
      const responseValues = questionHeaders.map((_, index) =>
        escapeCSVValue(responses[index] || "")
      );

      const row = [
        escapeCSVValue(user.email),
        escapeCSVValue(`${user.firstName || ""} ${user.lastName || ""}`),
        escapeCSVValue(user.major),
        escapeCSVValue(user.year),
        escapeCSVValue(user.memberId),
        ...responseValues,
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${event.name}-Attendees.csv`);
  };

  const copyEmailsToClipboard = async (event) => {
    if (!event.attendees || event.attendees.length === 0) {
      setPopup({ isOpen: true, message: "No attendees to copy.", toast: false });
      return;
    }

    const users = await fetchUserDetails(event.attendees);
    const emails = users.map((user) => user.email).join(", ");

    if (emails.length === 0) {
      setPopup({ isOpen: true, message: "No valid emails to copy.", toast: false });
      return;
    }

    navigator.clipboard
      .writeText(emails)
      .then(() => setPopup({ isOpen: true, message: "Emails copied to clipboard!", toast: true }))
      .catch((err) => {
        console.error("Failed to copy emails:", err);
        setPopup({ isOpen: true, message: "Failed to copy emails. Please try again.", toast: false });
      });
  };

  const handleEditEvent = (event) => {
    // Convert Firestore timestamp to format for date input (YYYY-MM-DDTHH:MM)
    const eventDate = event.date.toDate();
    // Convert to local timezone string for datetime-local input
    const year = eventDate.getFullYear();
    const month = String(eventDate.getMonth() + 1).padStart(2, '0');
    const day = String(eventDate.getDate()).padStart(2, '0');
    const hours = String(eventDate.getHours()).padStart(2, '0');
    const minutes = String(eventDate.getMinutes()).padStart(2, '0');
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

    if (
      !window.confirm(
        `Are you sure you want to delete "${event.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeleteLoading(true);

    try {
      // Remove event ID from all attendees' attendedEvents list
      if (event.attendees && event.attendees.length > 0) {
        const updates = event.attendees.map(async (userId) => {
          const userRef = doc(db, "Users", userId);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            const updatedEvents = (userData.attendedEvents || []).filter(id => id !== event.id);
            const updatedRsvpEvents = (userData.rsvpEvents || []).filter(id => id !== event.id);
            await setDoc(userRef, { 
              ...userData, 
              attendedEvents: updatedEvents,
              rsvpEvents: updatedRsvpEvents
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

      setPopup({ isOpen: true, message: `"${event.name}" has been successfully deleted.`, toast: true });
    } catch (error) {
      console.error("Error deleting event:", error);
      setPopup({ isOpen: true, message: `Error deleting event: ${error.message}`, toast: false });
    } finally {
      setDeleteLoading(false);
    }
  };

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

  const renderTable = (events) => (
    <table className="events-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Date</th>
          <th>Committee</th>
          <th>Location</th>
          <th>Total Attendees</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id}>
            <td>{event.name}</td>
            <td>
              {event.date.toDate().toLocaleDateString()}<br />
              {event.date.toDate().toLocaleTimeString('en-US', { 
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </td>
            <td>{event.createdBy}</td>
            <td>{event.location}</td>
            <td>{event.attendees ? event.attendees.length : 0}</td>
            <td className="event-actions">
              <button
                className="btn-edit"
                onClick={() => handleEditEvent(event)}
              >
                Edit
              </button>
              <button
                className="btn-export"
                onClick={() => exportToCSV(event)}
                disabled={!event.attendees || event.attendees.length === 0}
              >
                Export CSV
              </button>
              <button
                className="btn-copy"
                onClick={() => copyEmailsToClipboard(event)}
                disabled={!event.attendees || event.attendees.length === 0}
              >
                Copy Emails
              </button>

              {auth.currentUser?.uid === event.createdBy ? (
                <button
                  className="btn-delete"
                  onClick={() => deleteEvent(event)}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
                </button>
              ) : (
                <button disabled className="btn-delete">
                  Delete
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="manage-events-container">
      <div className="header-section">
        <h2 className="manage-events-title">Event Management</h2>
        <button
          onClick={() => navigate("/addevent")}
          className="btn-create-event"
        >
          Create New Event
        </button>
      </div>

      <div className="tabs-container">
        <div className="tabs-header">
          <button
            className={`tab-button ${activeTab === "upcoming" ? "active" : ""}`}
            onClick={() => setActiveTab("upcoming")}
          >
            Upcoming Events ({upcomingEvents.length})
          </button>
          <button
            className={`tab-button ${activeTab === "past" ? "active" : ""}`}
            onClick={() => setActiveTab("past")}
          >
            Past Events ({pastEvents.length})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "upcoming" ? (
            upcomingEvents.length === 0 ? (
              <p className="no-events-message">No upcoming events found.</p>
            ) : (
              renderTable(upcomingEvents)
            )
          ) : pastEvents.length === 0 ? (
            <p className="no-events-message">No past events found.</p>
          ) : (
            renderTable(pastEvents)
          )}
        </div>
      </div>

      <Popup
        isOpen={popup.isOpen}
        message={popup.message}
        toast={popup.toast}
        onClose={() => setPopup({ isOpen: false, message: "", toast: false })}
      />
    </div>
  );
};

export default ManageEvents;
