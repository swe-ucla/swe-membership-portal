import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import "./AddEvent.css";

// Add Cloudinary constants
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dgtsekxga/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "SWE Membership Portal";

function AddEvent() {
  const [userDetails, setUserDetails] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [eventId, setEventId] = useState("");
  const [eventData, setEventData] = useState({
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    committee: "",
    description: "",
    attendanceCode: "",
    points: 1,
    questions: [],
    photo: null,
  });
  const [useCustomCode, setUseCustomCode] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    required: true,
    type: "shortAnswer",
    options: [""],
  });
  const [loading, setLoading] = useState(true);
  const [photoPreview, setPhotoPreview] = useState(null);

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
  const location = useLocation();

  useEffect(() => {
    // Check if we're in edit mode by looking at the URL query params
    const params = new URLSearchParams(location.search);
    const editId = params.get("edit");

    if (editId) {
      setIsEditMode(true);
      setEventId(editId);

      // Try to get event data from localStorage first (it was set in ManageEvents.js)
      const storedEventData = localStorage.getItem("editEventData");
      if (storedEventData) {
        const parsedData = JSON.parse(storedEventData);

        // Initialize form with the event data
        setEventData({
          name: parsedData.name || "",
          date: parsedData.date || "",
          startTime: parsedData.startTime || "",
          endTime: parsedData.endTime || "",
          location: parsedData.location || "",
          committee: parsedData.createdBy || "",
          description: parsedData.description || "",
          attendanceCode: parsedData.attendanceCode || "",
          points: parsedData.points || 1,
          questions: parsedData.questions || [],
          photo: parsedData.photo || null,
        });

        // Show preview if photo is a URL
        if (parsedData.photo && typeof parsedData.photo === "string") {
          setPhotoPreview(parsedData.photo);
        } else {
          setPhotoPreview(null);
        }

        // Set custom code checkbox
        setUseCustomCode(!!parsedData.attendanceCode);

        // Clear localStorage after using it
        localStorage.removeItem("editEventData");
      } else {
        // If not in localStorage, fetch from Firestore
        fetchEventData(editId);
      }
    }

    fetchUserData();
  }, [location.search]);

  const fetchEventData = async (id) => {
    try {
      const eventRef = doc(db, "events", id);
      const eventSnap = await getDoc(eventRef);

      if (eventSnap.exists()) {
        const data = eventSnap.data();

        // Format date for HTML date input
        let formattedDate = "";
        if (data.date) {
          const date = data.date.toDate();
          formattedDate = date.toISOString().split("T")[0];
        }

        setEventData({
          name: data.name || "",
          date: formattedDate,
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          location: data.location || "",
          committee: data.createdBy || "",
          description: data.description || "",
          attendanceCode: data.attendanceCode || "",
          points: data.points || 1,
          questions: data.questions || [],
          photo: data.photo || null,
        });

        // Show preview if photo is a URL
        if (data.photo && typeof data.photo === "string") {
          setPhotoPreview(data.photo);
        } else {
          setPhotoPreview(null);
        }

        setUseCustomCode(!!data.attendanceCode);
      } else {
        alert("Event not found!");
        navigate("/manageevents");
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
      alert("Failed to load event data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    auth.onAuthStateChanged(async (user) => {
      if (user && user.uid) {
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserDetails(docSnap.data());
          const userData = docSnap.data();
          setIsAdmin(userData.isAdmin || false);
        }
      } else {
        navigate("/login");
        setUserDetails(null);
      }
      setLoading(false);
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Set word limit on event description to 180
    if (name === "description") {
      const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount > 180) {
        alert("Description cannot exceed 180 words.");
        return;
      }
    }

    setEventData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const generateAttendanceCode = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
  };

  const handleCodeChange = (e) => {
    let value = e.target.value.toUpperCase();
    value = value.replace(/[^A-Z]/g, "");
    if (value.length <= 6) {
      setEventData((prev) => ({
        ...prev,
        attendanceCode: value,
      }));
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestion.text.trim()) return;

    const { type, options } = newQuestion;

    // Check that at least one option is filled if it's multiple choice or checkboxes
    if (
      (type === "multipleChoice" ||
        type === "checkboxes" ||
        type === "dropdown") &&
      options.every((opt) => opt.trim() === "")
    ) {
      alert("Please fill in at least one option.");
      return;
    }

    setEventData((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...newQuestion }],
    }));

    setNewQuestion({
      text: "",
      required: true,
      type: "shortAnswer",
      options: [""],
    });
  };

  const handleRemoveQuestion = (indexToRemove) => {
    setEventData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleQuestionRequiredChange = (index) => {
    setEventData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, required: !q.required } : q
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !eventData.name ||
      !eventData.date ||
      !eventData.startTime ||
      !eventData.location ||
      !eventData.committee
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      // Combine date and startTime for event timestamp
      const [year, month, day] = eventData.date.split("-");
      const [startHours = 0, startMinutes = 0] = eventData.startTime.split(":");
      const eventStartDate = new Date(
        year,
        month - 1,
        day,
        startHours,
        startMinutes,
        0,
        0
      );
      const timestamp = Timestamp.fromDate(eventStartDate);

      let attendanceCode = useCustomCode
        ? eventData.attendanceCode
        : (isEditMode && eventData.attendanceCode) || generateAttendanceCode();

      if (useCustomCode && attendanceCode.length !== 6) {
        alert("Custom attendance code must be exactly 6 letters.");
        return;
      }

      // --- Cloudinary upload logic ---
      let photoURL = eventData.photo;
      if (eventData.photo && eventData.photo instanceof File) {
        const formData = new FormData();
        formData.append("file", eventData.photo);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        const response = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          alert("Failed to upload event photo.");
          return;
        }
        const data = await response.json();
        photoURL = data.secure_url;
      }
      // --- End Cloudinary upload logic ---

      if (isEditMode) {
        // Update existing event
        const eventRef = doc(db, "events", eventId);

        await updateDoc(eventRef, {
          name: eventData.name,
          date: timestamp,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          location: eventData.location,
          createdBy: eventData.committee,
          description: eventData.description,
          attendanceCode: attendanceCode,
          points: Number(eventData.points),
          questions: eventData.questions,
          photo: photoURL,
          lastUpdated: new Date().toISOString(),
        });

        alert("Event updated successfully!");
      } else {
        // Create new event
        const newEventId = `${Date.now()}`;
        const eventRef = doc(db, "events", newEventId);

        await setDoc(eventRef, {
          ...eventData,
          date: timestamp,
          createdBy: eventData.committee,
          createdAt: new Date().toISOString(),
          attendanceCode: attendanceCode,
          points: Number(eventData.points),
          photo: photoURL,
        });

        alert("Event created successfully!");
      }

      // Reset form and navigate back
      setEventData({
        name: "",
        date: "",
        startTime: "00:00",
        endTime: "",
        location: "",
        committee: "",
        description: "",
        attendanceCode: "",
        points: 1,
        questions: [],
        photo: null,
      });
      setPhotoPreview(null);
      setUseCustomCode(false);
      navigate("/manageevents");
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} event:`,
        error
      );
      alert(
        `Failed to ${
          isEditMode ? "update" : "create"
        } the event. Try again later.`
      );
    }
  };

  const updateNewQuestionOption = (index, value) => {
    const updatedOptions = [...newQuestion.options];
    updatedOptions[index] = value;
    setNewQuestion((prev) => ({ ...prev, options: updatedOptions }));
  };

  const addNewOptionField = () => {
    setNewQuestion((prev) => ({ ...prev, options: [...prev.options, ""] }));
  };

  const handleDeleteOption = (indexToRemove) => {
    setNewQuestion((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== indexToRemove),
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEventData((prev) => ({ ...prev, photo: file }));
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setEventData((prev) => ({ ...prev, photo: null }));
      setPhotoPreview(null);
    }
  };

  if (loading) {
    return (
      <div className="add-event-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="unauthorized-message">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="add-event-container">
      <h2 className="add-event-title">
        {isEditMode ? "Edit Event" : "Add Event"}
      </h2>
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

        <div className="form-group event-photo-upload">
          <label
            className="form-label"
            style={{ marginBottom: "0.4rem", display: "block" }}
          >
            Event Photo:
          </label>
          <label htmlFor="event-photo-input" className="upload-label">
            Choose Photo
          </label>
          <input
            id="event-photo-input"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
          />
          {eventData.photo && (
            <span className="file-name">{eventData.photo.name}</span>
          )}
          {photoPreview && (
            <div className="event-photo-preview">
              <img src={photoPreview} alt="Event Preview" />
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Event Date:</label>
          <input
            type="date"
            name="date"
            value={eventData.date}
            onChange={handleInputChange}
            min={new Date().toISOString().split("T")[0]} // Restrict selecting past dates
            required
          />
        </div>

        <div
          className="form-group"
          style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}
        >
          <div style={{ flex: 1 }}>
            <label className="form-label">Start Time:</label>
            <input
              type="time"
              name="startTime"
              value={eventData.startTime}
              onChange={handleInputChange}
              required
              className="form-control"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">End Time:</label>
            <input
              type="time"
              name="endTime"
              value={eventData.endTime}
              onChange={handleInputChange}
              className="form-control"
            />
          </div>
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
          <div className="d-flex align-items-center mb-2">
            <input
              type="checkbox"
              className="form-check-input me-2"
              id="useCustomCode"
              checked={useCustomCode}
              onChange={(e) => {
                setUseCustomCode(e.target.checked);
                if (!e.target.checked && !isEditMode) {
                  setEventData((prev) => ({ ...prev, attendanceCode: "" }));
                }
              }}
            />
            <label htmlFor="useCustomCode" className="mb-0">
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
              {isEditMode
                ? "Existing attendance code will be preserved."
                : "A random 6-letter code will be generated when the event is created."}
            </p>
          )}
        </div>

        <div className="questions-section">
          <h3 className="questions-title">Event Questions</h3>
          {eventData.questions.map((question, index) => (
            <div key={index} className="question-item">
              <div className="question-header">
                <p className="question-title">
                  <strong>Question {index + 1}:</strong> {question.text}{" "}
                  <em>({question.type})</em>
                </p>
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
              {question.options && question.type !== "shortAnswer" && (
                <ul className="mb-0 ps-4 text-start">
                  {question.options
                    .filter((opt) => opt.trim() !== "")
                    .map((opt, i) => (
                      <li key={i}>{opt}</li>
                    ))}
                </ul>
              )}
            </div>
          ))}

          <div className="add-question-form">
            <input
              type="text"
              className="form-control"
              placeholder="Enter new question"
              value={newQuestion.text}
              onChange={(e) =>
                setNewQuestion((prev) => ({ ...prev, text: e.target.value }))
              }
            />
            <div className="form-group">
              <label>Question Type:</label>
              <select
                className="form-control"
                value={newQuestion.type}
                onChange={(e) =>
                  setNewQuestion((prev) => ({
                    ...prev,
                    type: e.target.value,
                    options: [""],
                  }))
                }
              >
                <option value="shortAnswer">Short Answer</option>
                <option value="multipleChoice">Multiple Choice</option>
                <option value="checkboxes">Checkboxes</option>
                <option value="trueFalse">True/False</option>
                <option value="dropdown">Dropdown</option>
              </select>
            </div>
            {["multipleChoice", "checkboxes", "dropdown"].includes(
              newQuestion.type
            ) && (
              <div className="form-group">
                <label>Options:</label>
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="d-flex align-items-center mb-1">
                    <input
                      type="text"
                      className="form-control me-2"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) =>
                        updateNewQuestionOption(index, e.target.value)
                      }
                      disabled={newQuestion.type === "trueFalse"}
                    />
                    {newQuestion.options.length > 1 &&
                      newQuestion.type !== "trueFalse" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteOption(index)}
                        >
                          ✕
                        </button>
                      )}
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={addNewOptionField}
                >
                  Add Option
                </button>
              </div>
            )}
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={newQuestion.required}
                onChange={(e) =>
                  setNewQuestion((prev) => ({
                    ...prev,
                    required: e.target.checked,
                  }))
                }
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

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate("/manageevents")}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-success">
            {isEditMode ? "Update Event" : "Add Event"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddEvent;
