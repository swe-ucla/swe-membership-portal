import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./AddEvent.css";

function AddEvent() {
  const [userDetails, setUserDetails] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true); // ✅ Loading state

  const [eventData, setEventData] = useState({
    name: "",
    date: "",
    location: "",
    committee: "",
    description: "",
    attendanceCode: "",
    points: 1,
    questions: [],
  });

  const [useCustomCode, setUseCustomCode] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: "", required: true });

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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.uid) {
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserDetails(docSnap.data());
          setIsAdmin(docSnap.data().isAdmin || false);
        }
      } else {
        navigate("/login");
        setUserDetails(null);
      }
      setLoading(false); // ✅ Ensure this is set after user data is fetched
    });

    return () => unsubscribe();
  }, [navigate]);

  // ✅ Handle loading state
  if (loading) {
    return (
      <div className="add-event-container">
        <div className="loading-message">
          <div className="loading-spinner"></div>
          <p>Checking permissions...</p>
        </div>
      </div>
    );
  }

  // ✅ Handle unauthorized access AFTER loading
  if (!isAdmin) {
    return (
      <div className="unauthorized-message">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEventData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const generateAttendanceCode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
  };

  const handleCodeChange = (e) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (value.length <= 6) {
      setEventData(prev => ({ ...prev, attendanceCode: value }));
    }
  };

  const handleAddQuestion = () => {
    if (newQuestion.text.trim()) {
      setEventData(prev => ({
        ...prev,
        questions: [...prev.questions, { ...newQuestion }]
      }));
      setNewQuestion({ text: "", required: true });
    }
  };

  const handleRemoveQuestion = (indexToRemove) => {
    setEventData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleQuestionRequiredChange = (index) => {
    setEventData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, required: !q.required } : q
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eventData.name || !eventData.date || !eventData.location || !eventData.committee) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const eventDate = new Date(eventData.date);
      eventDate.setHours(0, 0, 0, 0);
      eventDate.setTime(eventDate.getTime() + 24 * 60 * 60 * 1000);
      const timestamp = Timestamp.fromDate(eventDate);

      const eventId = `${Date.now()}`;
      const eventRef = doc(db, "events", eventId);

      const attendanceCode = useCustomCode
        ? eventData.attendanceCode
        : generateAttendanceCode();

      if (useCustomCode && attendanceCode.length !== 6) {
        alert("Custom attendance code must be exactly 6 letters.");
        return;
      }

      await setDoc(eventRef, {
        ...eventData,
        date: timestamp,
        createdBy: eventData.committee,
        createdAt: new Date().toISOString(),
        attendanceCode: attendanceCode,
      });

      alert("Event created successfully!");
      setEventData({
        name: "",
        date: "",
        location: "",
        committee: "",
        description: "",
        attendanceCode: "",
        points: 1,
        questions: [],
      });
      setUseCustomCode(false);
      navigate("/upcoming");
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create the event. Try again later.");
    }
  };

  return (
    <div className="add-event-container">
      <h2 className="add-event-title">Add Event</h2>
      <form className="add-event-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Event Name:</label>
          <input
            type="text"
            name="name"
            value={eventData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Event Date:</label>
          <input
            type="date"
            name="date"
            value={eventData.date}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Location:</label>
          <input
            type="text"
            name="location"
            value={eventData.location}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Committee:</label>
          <select
            name="committee"
            value={eventData.committee}
            onChange={handleInputChange}
            required
          >
            <option value="" disabled>Select a committee</option>
            {committees.map((committee, index) => (
              <option key={index} value={committee}>
                {committee}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Points:</label>
          <input
            type="range"
            name="points"
            min="1"
            max="5"
            value={eventData.points}
            onChange={handleInputChange}
          />
          <span className="points-display">{eventData.points} points</span>
        </div>

        <div className="form-group">
          <label className="form-label">Description:</label>
          <textarea
            name="description"
            value={eventData.description}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Attendance Code:</label>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="useCustomCode"
              checked={useCustomCode}
              onChange={(e) => {
                setUseCustomCode(e.target.checked);
                if (!e.target.checked) {
                  setEventData(prev => ({ ...prev, attendanceCode: '' }));
                }
              }}
            />
            <label className="form-check-label" htmlFor="useCustomCode">
              Use custom attendance code
            </label>
          </div>

          {useCustomCode ? (
            <input
              type="text"
              className="form-control"
              placeholder="Enter 6-letter code"
              value={eventData.attendanceCode}
              onChange={handleCodeChange}
              maxLength={6}
              required={useCustomCode}
            />
          ) : (
            <p className="text-muted">
              A random 6-letter code will be generated when the event is created.
            </p>
          )}
        </div>

        {/* Questions Section */}
        <div className="questions-section">
          <h3 className="questions-title">Event Questions</h3>

          {eventData.questions.map((question, index) => (
            <div key={index} className="question-item">
              <div className="question-header">
                <p className="question-title"><strong>Question {index + 1}:</strong> {question.text}</p>
                <div className="question-actions">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveQuestion(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={question.required}
                  onChange={() => handleQuestionRequiredChange(index)}
                />
                <label className="form-check-label">Required</label>
              </div>
            </div>
          ))}

          <div className="add-question-form">
            <input
              type="text"
              className="form-control"
              placeholder="Enter new question"
              value={newQuestion.text}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, text: e.target.value }))}
            />
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={newQuestion.required}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, required: e.target.checked }))}
              />
              <label className="form-check-label">Required</label>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddQuestion}
            >
              Add Question
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-success">
          Add Event
        </button>
      </form>
    </div>
  );
}

export default AddEvent;
