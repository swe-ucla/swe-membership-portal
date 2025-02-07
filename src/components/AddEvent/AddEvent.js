import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Timestamp } from "firebase/firestore"; // Import Timestamp

function AddEvent() {
  const [userDetails, setUserDetails] = useState(null);
  const [eventData, setEventData] = useState({
    name: "",
    date: "",
    location: "",
    committee: "",
    description: "",
    points: 1, //default points to 1
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

  useEffect(() => {
    fetchUserData();
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
      alert("Please fill in all fields.");
      return;
    }

    try {
      const eventDate = new Date(eventData.date);
      eventDate.setHours(0, 0, 0, 0);  // Set the time to 00:00:00 for the selected date
      eventDate.setTime(eventDate.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
      const timestamp = Timestamp.fromDate(eventDate);

      const eventId = `${Date.now()}`; // Unique ID for the event
      const eventRef = doc(db, "events", eventId);
      await setDoc(eventRef, {
        ...eventData,
        date: timestamp, // Store the date as a Timestamp
        createdBy: eventData.committee,
        createdAt: new Date().toISOString(),
        points: Number(eventData.points),
      });

      alert("Event created successfully!");
      setEventData({
        name: "",
        date: "",
        location: "",
        committee: "",
        description: "",
        points: 1,
      });
      navigate("/upcoming");
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create the event. Try again later.");
    }
  };


  return (
    <div>
      <h2>Add Event</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Event Name:</label>
          <input
            type="text"
            name="name"
            value={eventData.name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label>Event Date:</label>
          <input
            type="date"
            name="date"
            value={eventData.date}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label>Location:</label>
          <input
            type="text"
            name="location"
            value={eventData.location}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label>Committee:</label>
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
        <div>
          <label>Points:</label>
          <input
            type="range"
            name="points"
            min="1"
            max="5"
            value={eventData.points}
            onChange={handleInputChange}
          />
          <span>{eventData.points} points</span>
        </div>
        <div>
          <label>Description:</label>
          <textarea
            name="description"
            value={eventData.description}
            onChange={handleInputChange}
          />
        </div>
        <button type="submit" className="btn btn-success">
          Add Event
        </button>
      </form>
    </div>
  );
}

export default AddEvent;
