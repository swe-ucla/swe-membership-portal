import React, { useEffect, useState, useCallback } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Popup from "../Popup/Popup";

const PastEvents = () => {
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [popup, setPopup] = useState({ isOpen: false, message: "", toast: false, confirm: false, onConfirm: null });
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
    if (!user || !isAdmin) return; // Ensure only admins fetch events

    const fetchPastEvents = async () => {
      try {
        const eventsRef = collection(db, "events");
        const snapshot = await getDocs(eventsRef);
        const today = new Date();

        const pastEventsData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((event) => event.date && event.date.toDate() < today); // Ensure event.date exists

        setPastEvents(pastEventsData);
      } catch (error) {
        console.error("Error fetching past events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPastEvents();
  }, [user, isAdmin]);

  if (loading) {
    return <p>Loading past events...</p>;
  }

  if (!isAdmin) {
    return <p>You do not have permission to view this page.</p>; // Hide page for non-admins
  }

  // Fetch detailed user info for given attendee IDs
  const fetchUserDetails = async (attendeeIds) => {
    if (!attendeeIds || attendeeIds.length === 0) return [];

    try {
      const userPromises = attendeeIds.map(async (userId) => {
        const userRef = doc(db, "Users", userId);
        const userSnap = await getDoc(userRef);
        return userSnap.exists()
          ? { id: userId, ...userSnap.data() }
          : null;
      });

      const userDetails = await Promise.all(userPromises);
      return userDetails.filter((user) => user !== null); // Remove any null users
    } catch (error) {
      console.error("Error fetching user details:", error);
      return [];
    }
  };

  // Export full attendee details for an event
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
  
    // Get event question headers
    const questionHeaders = event.questions ? event.questions.map((q) => q.text) : [];
    const headers = [
      "Email",
      "Full Name",
      "Major",
      "Year",
      "Member ID",
      ...questionHeaders, // Append question titles as headers
    ];
  
    // Ensure proper CSV formatting (enclose fields with commas in quotes)
    const escapeCSVValue = (value) => {
      if (!value) return "";
      const strValue = value.toString();
      return strValue.includes(",") ? `"${strValue}"` : strValue;
    };
  
    // Generate CSV rows
    const csvRows = [headers.map(escapeCSVValue).join(",")]; // Header row
  
    users.forEach((user) => {
      const userId = user.id;
      const responses = event.responses?.[userId] || {}; // Fetch responses for this user
  
      const responseValues = questionHeaders.map((question, index) => {
        // Get response for this question, default to empty string if missing
        return escapeCSVValue(responses[index] || "");
      });
  
      const row = [
        escapeCSVValue(user.email),
        escapeCSVValue(`${user.firstName} ${user.lastName}`),
        escapeCSVValue(user.major),
        escapeCSVValue(user.year),
        escapeCSVValue(user.memberId),
        ...responseValues,
      ];
      csvRows.push(row.join(",")); // Add to CSV
    });
  
    // Convert to CSV format
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

    navigator.clipboard.writeText(emails).then(() => {
      setPopup({ isOpen: true, message: "Emails copied to clipboard!", toast: true });
    }).catch((err) => {
      console.error("Failed to copy emails:", err);
      setPopup({ isOpen: true, message: "Failed to copy emails. Try again later.", toast: false });
    });
  };

  if (loading) {
    return <p>Loading past events...</p>;
  }

  return (
    <div>
      <h2>Past Events</h2>
      <button onClick={() => navigate("/addevent")} className="btn btn-primary">
        Create New Event
      </button>
      {pastEvents.length === 0 ? (
        <p>No past events found.</p>
      ) : (
        <table border="1">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Committee</th>
              <th>Total Attendees</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pastEvents.map((event) => (
              <tr key={event.id}>
                <td>{event.name}</td>
                <td>{event.date.toDate().toLocaleDateString()}</td>
                <td>{event.createdBy}</td>
                <td>{event.attendees ? event.attendees.length : 0}</td>
                <td>
                  <button onClick={() => exportToCSV(event)}>Export CSV</button>
                  <button onClick={() => copyEmailsToClipboard(event)}>Copy Emails</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
              <Popup 
          isOpen={popup.isOpen} 
          message={popup.message} 
          toast={popup.toast}
          confirm={popup.confirm}
          onConfirm={popup.onConfirm}
          onClose={() => setPopup({ isOpen: false, message: "", toast: false, confirm: false, onConfirm: null })}
        />
    </div>
  );
};

export default PastEvents;
