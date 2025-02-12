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
    attendanceCode: "",
    questions: [], // Array to store questions
  });
  const [useCustomCode, setUseCustomCode] = useState(false);
  
  // New state for managing a new question before adding to questions array
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    required: true
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

  // Generate random 6-letter code
  const generateAttendanceCode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
  };

  // Handle custom code input
  const handleCodeChange = (e) => {
    let value = e.target.value.toUpperCase(); // Convert to uppercase
    value = value.replace(/[^A-Z]/g, ''); // Only allow letters
    if (value.length <= 6) { // Limit to 6 characters
      setEventData(prev => ({
        ...prev,
        attendanceCode: value
      }));
    }
  };

  // Add a new question to the questions array
  const handleAddQuestion = () => {
    if (newQuestion.text.trim()) {
      setEventData(prev => ({
        ...prev,
        questions: [...prev.questions, { ...newQuestion }]
      }));
      setNewQuestion({ text: "", required: true }); // Reset new question form
    }
  };

  // Remove a question from the array
  const handleRemoveQuestion = (indexToRemove) => {
    setEventData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, index) => index !== indexToRemove)
    }));
  };

  // Update question requirement status
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
      
      // Use custom code or generate one
      const attendanceCode = useCustomCode 
        ? eventData.attendanceCode 
        : generateAttendanceCode();

      // Validate custom code if being used
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
        responses: {}, // Initialize empty responses object
      });

      alert("Event created successfully!");
      setEventData({
        name: "",
        date: "",
        location: "",
        committee: "",
        description: "",
        attendanceCode: "",
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
          <label>Description:</label>
          <textarea
            name="description"
            value={eventData.description}
            onChange={handleInputChange}
          />
        </div>
        <div className="mb-3">
          <label>Attendance Code:</label>
          <div className="form-check mb-2">
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
        <div className="mb-4">
          <h3>Event Questions</h3>
          
          {/* Display existing questions */}
          {eventData.questions.map((question, index) => (
            <div key={index} className="mb-3 p-3 border rounded">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="mb-2"><strong>Question {index + 1}:</strong> {question.text}</p>
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
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRemoveQuestion(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Add new question form */}
          <div className="mb-3">
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Enter new question"
              value={newQuestion.text}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, text: e.target.value }))}
            />
            <div className="form-check mb-2">
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
