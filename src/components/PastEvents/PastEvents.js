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

  const fetchUserDetails = async (userIds) => {
    if (!userIds || userIds.length === 0) return [];

    try {
      const userPromises = userIds.map(async (userId) => {
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
    const rsvpIds = event.rsvpAttendees || [];
    const attendeeIds = event.attendees || [];
    const allUserIds = [...new Set([...rsvpIds, ...attendeeIds])];

    if (allUserIds.length === 0) {
      setPopup({ isOpen: true, message: "No users to export.", toast: false });
      return;
    }

    const users = await fetchUserDetails(allUserIds);

    if (users.length === 0) {
      setPopup({ isOpen: true, message: "No valid users to export.", toast: false });
      return;
    }

    const questionHeaders = event.questions ? event.questions.map((q) => q.text) : [];
    const headers = ["Email", "Full Name", "Major", "Year", "Member ID", "RSVP'ed", "Attended", ...questionHeaders];

    const escapeCSVValue = (value) => {
      if (value === undefined || value === null) return "";
      const strValue = value.toString();
      return strValue.includes(",") ? `"${strValue}"` : strValue;
    };

    const rsvpedAndAttended = [];
    const notRsvpedButAttended = [];
    const rsvpedButDidNotAttend = [];

    users.forEach((user) => {
      const didRSVP = rsvpIds.includes(user.id);
      const didAttend = attendeeIds.includes(user.id);
      if (didRSVP && didAttend) rsvpedAndAttended.push(user);
      else if (!didRSVP && didAttend) notRsvpedButAttended.push(user);
      else if (didRSVP && !didAttend) rsvpedButDidNotAttend.push(user);
    });

    const csvRows = [headers.map(escapeCSVValue).join(",")];
    const orderedUsers = [...rsvpedAndAttended, ...notRsvpedButAttended, ...rsvpedButDidNotAttend];

    orderedUsers.forEach((user) => {
      const userId = user.id;
      const responses = event.responses?.[userId] || {};
      const responseValues = questionHeaders.map((_, index) => escapeCSVValue(responses[index] || ""));
      const row = [
        escapeCSVValue(user.email),
        escapeCSVValue(`${user.firstName || ""} ${user.lastName || ""}`),
        escapeCSVValue(user.major),
        escapeCSVValue(user.year),
        escapeCSVValue(user.memberId),
        escapeCSVValue(rsvpIds.includes(userId) ? "Yes" : "No"),
        escapeCSVValue(attendeeIds.includes(userId) ? "Yes" : "No"),
        ...responseValues,
      ];
      csvRows.push(row.join(","));
    });

    csvRows.push("");
    csvRows.push(`RSVP + Attended,${rsvpedAndAttended.length}`);
    csvRows.push(`No RSVP + Attended,${notRsvpedButAttended.length}`);
    csvRows.push(`RSVP + No-show,${rsvpedButDidNotAttend.length}`);
    csvRows.push("");
    csvRows.push(`Total Attendees,${rsvpedAndAttended.length + notRsvpedButAttended.length}`);
    csvRows.push(`Total RSVPs,${rsvpedAndAttended.length + rsvpedButDidNotAttend.length}`);

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${event.name}-All-Users.csv`);
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
              <th>RSVP'd</th>
              <th>Attendees</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pastEvents.map((event) => (
              <tr key={event.id}>
                <td>{event.name}</td>
                <td>{event.date.toDate().toLocaleDateString()}</td>
                <td>{event.createdBy}</td>
                <td>{event.rsvpCount ?? (event.rsvpAttendees ? event.rsvpAttendees.length : 0)}</td>
                <td>{event.attendeeCount ?? (event.attendees ? event.attendees.length : 0)}</td>
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
