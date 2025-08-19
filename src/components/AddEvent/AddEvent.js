import React, { useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import Popup from "../Popup/Popup";
import "./AddEvent.css";

// Add Cloudinary constants
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dgtsekxga/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "SWE Membership Portal";

function AddEvent() {
  const [, setUserDetails] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [eventId, setEventId] = useState("");
  const [popup, setPopup] = useState({
    isOpen: false,
    message: "",
    toast: false,
    confirm: false,
    onConfirm: null,
  });

  const handlePopupClose = useCallback(() => {
    setPopup({
      isOpen: false,
      message: "",
      toast: false,
      confirm: false,
      onConfirm: null,
    });
  }, []);

  const pad = (n) => n.toString().padStart(2, "0");
  const now = new Date(Date.now());
  const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;

  const [eventData, setEventData] = useState({
    name: "",
    date: "", // This will be just the date (YYYY-MM-DD)
    startTime: "",
    endTime: "",
    location: "",
    committee: "",
    description: "",
    attendanceCode: "",
    points: 1,
    questions: [],
    signInOpensHoursBefore: 1, // default 1 hour before
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
  const [errors, setErrors] = useState({});

  const committees = [
    "Evening with Industry",
    "Dev",
    "Technical",
    "Lobbying",
    "Outreach",
    "Internal Affairs",
    "Advocacy",
    "General",
  ];

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
          author: parsedData.createdByUser || "",
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

        // Format date and time separately
        let formattedDate = "";
        let extractedStartTime = "";
        let extractedEndTime = "";

        if (data.date) {
          const date = data.date.toDate();
          // Extract just the date part
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          formattedDate = `${year}-${month}-${day}`;

          // Extract time from the stored date if startTime isn't separate
          if (!data.startTime) {
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            extractedStartTime = `${hours}:${minutes}`;
          }
        }

        setEventData({
          name: data.name || "",
          date: formattedDate,
          startTime: data.startTime || extractedStartTime,
          endTime: data.endTime || extractedEndTime,
          location: data.location || "",
          committee: data.createdBy || "",
          author: data.createdByUser || "",
          description: data.description || "",
          attendanceCode: data.attendanceCode || "",
          points: data.points || 1,
          questions: data.questions || [],
          signInOpensHoursBefore: data.signInOpensHoursBefore || 1,
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
        setPopup({ isOpen: true, message: "Event not found!", toast: true });
        setTimeout(() => navigate("/manageevents"), 3000);
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
      setPopup({
        isOpen: true,
        message: "Failed to load event data.",
        toast: true,
      });
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

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }

    // Set word limit on event description to 180
    if (name === "description") {
      const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount > 180) {
        setPopup({
          isOpen: true,
          message: "Description cannot exceed 180 words.",
          toast: true,
        });
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
      setPopup({
        isOpen: true,
        message: "Please fill in at least one option.",
        toast: true,
      });
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

    const newErrors = {};
    if (!eventData.name.trim()) newErrors.name = "This field is required";
    if (!eventData.date) newErrors.date = "This field is required";
    if (!eventData.startTime) newErrors.startTime = "This field is required";
    if (!eventData.endTime) newErrors.endTime = "This field is required";
    if (!eventData.location.trim()) newErrors.location = "This field is required";
    if (!eventData.committee) newErrors.committee = "This field is required";
    if (!eventData.description.trim()) newErrors.description = "This field is required";
    if (!eventData.points || eventData.points < 1) newErrors.points = "This field is required";
    if (!eventData.signInOpensHoursBefore || eventData.signInOpensHoursBefore < 1) newErrors.signInOpensHoursBefore = "This field is required";

    if (useCustomCode && eventData.attendanceCode.length !== 6) {
      newErrors.attendanceCode = "Attendance code must be exactly 6 letters";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
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
        setPopup({
          isOpen: true,
          message: "Custom attendance code must be exactly 6 letters.",
          toast: true,
        });
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
          setPopup({
            isOpen: true,
            message: "Failed to upload event photo.",
            toast: true,
          });
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
          createdByUser: auth.currentUser.uid,
          description: eventData.description,
          attendanceCode: attendanceCode,
          points: Number(eventData.points),
          signInOpensHoursBefore: eventData.signInOpensHoursBefore,
          questions: eventData.questions,
          photo: photoURL,
          lastUpdated: new Date().toISOString(),
        });

        setPopup({
          isOpen: true,
          message: "Event updated successfully!",
          toast: true,
        });
        setTimeout(() => {
          navigate("/manageevents");
        }, 3000);
      } else {
        // Create new event
        const newEventId = `${Date.now()}`;
        const eventRef = doc(db, "events", newEventId);

        await setDoc(eventRef, {
          name: eventData.name,
          date: timestamp,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          location: eventData.location,
          createdBy: eventData.committee,
          createdByUser: auth.currentUser.uid,
          description: eventData.description,
          createdAt: new Date().toISOString(),
          attendanceCode: attendanceCode,
          points: Number(eventData.points),
          signInOpensHoursBefore: eventData.signInOpensHoursBefore,
          questions: eventData.questions,
          photo: photoURL,
        });

        setPopup({
          isOpen: true,
          message: "Event created successfully!",
          toast: true,
        });
        setTimeout(() => {
          navigate("/manageevents");
        }, 3000);
      }

      // Reset form
      setEventData({
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
        signInOpensHoursBefore: 1,
        photo: null,
        author: "",
      });
      setPhotoPreview(null);
      setUseCustomCode(false);
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} event:`,
        error
      );
      setPopup({
        isOpen: true,
        message: `Failed to ${
          isEditMode ? "update" : "create"
        } the event. Try again later.`,
        toast: true,
      });
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
      <Popup
        isOpen={popup.isOpen}
        onClose={handlePopupClose}
        message={popup.message}
        toast={popup.toast}
        confirm={popup.confirm}
        onConfirm={popup.onConfirm}
      />
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
          />
          {errors.name && <p className="error-text">{errors.name}</p>}
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
            min={todayDate} // Restrict selecting past dates
          />
          {errors.date && <p className="error-text">{errors.date}</p>}
        </div>

        <div
          className="form-group"
          style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}
        >
          <div style={{ flex: 1 }}>
            <label className="form-label">Start Time:</label>
            <input
              type="time"
              style={{ minWidth: "0" }}
              name="startTime"
              value={eventData.startTime}
              onChange={handleInputChange}
              className="form-control"
            />
            {errors.startTime && <p className="error-text">{errors.startTime}</p>}
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">End Time:</label>
            <input
              style={{ minWidth: "0" }}
              type="time"
              name="endTime"
              value={eventData.endTime}
              onChange={handleInputChange}
              className="form-control"
            />
            {errors.endTime && <p className="error-text">{errors.endTime}</p>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Location:</label>
          <input
            type="text"
            name="location"
            value={eventData.location}
            onChange={handleInputChange}
          />
          {errors.location && <p className="error-text">{errors.location}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Committee:</label>
          <select
            name="committee"
            value={eventData.committee}
            onChange={handleInputChange}
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
          {errors.committee && <p className="error-text">{errors.committee}</p>}
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
          <span className="slider-display">{eventData.points} points</span>
          {errors.points && <p className="error-text">{errors.points}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Sign In Opens:</label>
          <input
            type="range"
            name="signInOpensHoursBefore"
            min="1"
            max="24"
            value={eventData.signInOpensHoursBefore}
            onChange={(e) =>
              setEventData((prev) => ({
                ...prev,
                signInOpensHoursBefore: Number(e.target.value),
              }))
            }
          />
          <span className="slider-display">
            {eventData.signInOpensHoursBefore} hour(s) before event
          </span>
          {errors.signInOpensHoursBefore && <p className="error-text">{errors.signInOpensHoursBefore}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Description:</label>
          <textarea
            name="description"
            value={eventData.description}
            onChange={handleInputChange}
          />
          {errors.description && <p className="error-text">{errors.description}</p>}
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
            <>
              <input
                type="text"
                className="form-control"
                placeholder="Enter 6-letter code"
                value={eventData.attendanceCode}
                onChange={handleCodeChange}
                maxLength={6}
              />
              {errors.attendanceCode && <p className="error-text">{errors.attendanceCode}</p>}
            </>
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
              /*className="form-control"*/
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
                type="text"
                style={{ width: "100%", minWidth: "0", maxWidth: "none" }}
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
