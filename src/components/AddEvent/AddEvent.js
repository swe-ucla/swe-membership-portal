import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import "./AddEvent.css";

function AddEvent() {
  const [userDetails, setUserDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [eventData, setEventData] = useState({
    name: "",
    date: "",
    time: "",
    location: "",
    committee: "",
    description: "",
  });

  const [committees, setCommittees] = useState([
    "Evening with Industry",
    "Dev",
    "Technical",
    "Lobbying",
    "Outreach",
    "Internal Affairs",
    "Advocacy",
    "General",
  ]);

  const navigate = useNavigate();

  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserDetails(docSnap.data());
        }
      } else {
        navigate("/login");
        setUserDetails(null);
      }
    });
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const eventsRef = collection(db, "events");
      const q = query(eventsRef, orderBy("date", "asc"));
      const querySnapshot = await getDocs(q);

      const eventsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
      }));
      
      setEvents(eventsData);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
    setLoadingEvents(false);
  };

  useEffect(() => {
    fetchUserData();
    fetchEvents();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEventData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !eventData.name ||
      !eventData.date ||
      !eventData.location ||
      !eventData.committee
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      const eventDate = new Date(eventData.date);
      eventDate.setHours(0, 0, 0, 0);
      eventDate.setTime(eventDate.getTime() + 24 * 60 * 60 * 1000);
      const timestamp = Timestamp.fromDate(eventDate);

      const eventId = `${Date.now()}`;
      const eventRef = doc(db, "events", eventId);
      await setDoc(eventRef, {
        ...eventData,
        id: eventId,
        date: timestamp,
        createdBy: eventData.committee,
        createdAt: new Date().toISOString(),
      });

      alert("Event created successfully!");
      setEventData({
        name: "",
        date: "",
        time: "",
        location: "",
        committee: "",
        description: "",
      });
      
      // Refresh the events list
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create the event. Try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/upcoming");
  };

  const handleDeleteClick = (event) => {
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    
    try {
      await deleteDoc(doc(db, "events", eventToDelete.id));
      setEvents(events.filter(event => event.id !== eventToDelete.id));
      setShowDeleteModal(false);
      setEventToDelete(null);
      alert("Event deleted successfully!");
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete the event. Try again later.");
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setEventToDelete(null);
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="add-event-container">
      <div className="add-event-card">
        <button className="btn-back" onClick={handleBack}>
          ← Back to Events
        </button>
        <h2 className="add-event-title">Add Event</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Event Name*</label>
            <input
              type="text"
              name="name"
              value={eventData.name}
              onChange={handleInputChange}
              placeholder="Enter event name"
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-col">
              <label className="form-label">Event Date*</label>
              <input
                type="date"
                name="date"
                value={eventData.date}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-col">
              <label className="form-label">Event Time</label>
              <input
                type="time"
                name="time"
                value={eventData.time}
                onChange={handleInputChange}
                placeholder="e.g., 3:00 PM"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Location*</label>
            <input
              type="text"
              name="location"
              value={eventData.location}
              onChange={handleInputChange}
              placeholder="Enter event location"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Committee*</label>
            <select
              name="committee"
              value={eventData.committee}
              onChange={handleInputChange}
              required
            >
              <option value="" disabled>
                Select a committee
              </option>
              {committees.map((committee, index) => (
                <option key={index} value={committee}>
                  {committee}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={eventData.description}
              onChange={handleInputChange}
              placeholder="Provide details about the event..."
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-success"
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Add Event"}
          </button>
        </form>
        
        {/* Events Management Section */}
        <div className="event-management-section">
          <h3 className="section-title">Manage Events</h3>
          
          {loadingEvents ? (
            <div className="loading-indicator">Loading events...</div>
          ) : events.length > 0 ? (
            <div className="events-list">
              {events.map((event) => (
                <div key={event.id} className="event-item">
                  <div className="event-info">
                    <div className="event-name">{event.name}</div>
                    <div className="event-meta">
                      {formatDate(event.date)}
                      {event.time && ` • ${event.time}`}
                      {` • ${event.createdBy}`}
                    </div>
                  </div>
                  <button 
                    className="btn-delete-event"
                    onClick={() => handleDeleteClick(event)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-events-message">No events found. Create your first event above.</p>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Delete</h3>
              <button className="btn-close" onClick={handleCancelDelete}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="modal-message">
                Are you sure you want to delete the event "{eventToDelete?.name}"? 
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCancelDelete}>Cancel</button>
              <button className="btn-confirm" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddEvent;