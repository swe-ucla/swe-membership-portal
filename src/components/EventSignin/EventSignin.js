import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";
import Popup from "../Popup/Popup";

const EventSignin = () => {
  const { eventID } = useParams();
  const [event, setEvent] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [responses, setResponses] = useState({}); // Store question responses
  const [popup, setPopup] = useState({ isOpen: false, message: "", toast: false, confirm: false, onConfirm: null });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventID) return;

      try {
        const docRef = doc(db, "events", eventID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setEvent(docSnap.data());
        } else {
          setError("Event not found!");
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
        setError("Error loading event details");
      }
    };

    fetchEventDetails();
  }, [eventID, navigate]);

  const handleResponseChange = (questionIndex, value) => {
    setResponses(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate required questions
    const missingRequired = event.questions?.some((q, index) => {
      const response = responses[index];
      if (!q.required) return false;
    
      if (q.type === "checkboxes") {
        return !Array.isArray(response) || response.length === 0;
      }
    
      return !response || (typeof response === "string" && response.trim() === "");
    });
    

    if (missingRequired) {
      setError("Please answer all required questions");
      return;
    }

    if (code.toUpperCase() === event.attendanceCode) {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError("You must be logged in to sign in to an event");
          return;
        }

        // Update event attendance in Firebase
        const eventRef = doc(db, "events", eventID);
        await updateDoc(eventRef, {
          attendees: arrayUnion(user.uid),
          [`responses.${user.uid}`]: responses
        });

        // Also update user's attended events
        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentPoints = Number(userData.swePoints) || 0;
          const attendedEvents = userData.attendedEvents || [];
          const rsvpEvents = userData.rsvpEvents || [];

          if (!userData.firstName || !userData.lastName || !userData.year || !userData.major) {
            setPopup({ isOpen: true, message: "Please complete your profile before signing in.", toast: false });
            navigate("/profile");
            return;
          }

          if (attendedEvents.includes(eventID)) {
            setError("You have already signed into this event.");
            return;
          }

          // Check if user RSVP'd and remove from RSVP list
          const wasRSVPd = rsvpEvents.includes(eventID);
          const updatedRsvpEvents = wasRSVPd 
            ? rsvpEvents.filter(id => id !== eventID)
            : rsvpEvents;

          await updateDoc(userRef, {
            attendedEvents: arrayUnion(eventID),
            rsvpEvents: updatedRsvpEvents,
            [`eventResponses.${eventID}`]: responses,
            swePoints: currentPoints + (Number(event.points) || 0),
            // lastEventSignIn: new Date().toISOString(),
          });

          setSuccess(true);
          setTimeout(() => {
            navigate("/upcoming");
          }, 2000);
        }
      } catch (error) {
        console.error("Error recording attendance:", error);
        setError("Failed to record attendance");
      }
    } else {
      setError("Invalid attendance code");
    }
  };

  return (
    <>
      <div className="container mt-4">
      <h1>Event Signin</h1>
      {event ? (
        <div>
          <p><strong>Title:</strong> {event.name}</p>
          <p><strong>Location:</strong> {event.location}</p>
          <p><strong>Created By:</strong> {event.createdBy} Committee</p>
          
          {success ? (
            <div className="alert alert-success">
              Attendance recorded successfully! Redirecting...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
                            {/* Attendance Code Section */}
              <div className="form-group">
                <label>Enter Attendance Code:</label>
                <input
                  type="text"
                  className="form-control"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-letter code"
                  maxLength={6}
                  required
                />
              
              {/* Questions Section */}
              {event.questions && event.questions.length > 0 && (
                <div className="mb-4">
                  <h3>Event Questions</h3>
                  {[...event.questions]
                    .sort((a, b) => a.text.toLowerCase().includes("attendance code") ? -1 : 1)
                    .map((question, index) => (
                      <div key={index} className="mb-3">
                        <label className="form-label">
                          {question.text}
                          {question.required && <span className="text-danger">*</span>}
                        </label>

                        {question.type === "shortAnswer" && (
                          <input
                            type="text"
                            className="form-control"
                            value={responses[index] || ""}
                            onChange={(e) => handleResponseChange(index, e.target.value)}
                            required={question.required}
                          />
                        )}

                        {question.type === "multipleChoice" && (
                          <div>
                            {question.options.map((option, i) => (
                              <div className="form-check" key={i}>
                                <input
                                  type="radio"
                                  className="form-check-input"
                                  name={`question-${index}`}
                                  value={option}
                                  checked={responses[index] === option}
                                  onChange={() => handleResponseChange(index, option)}
                                  required={question.required}
                                />
                                <label className="form-check-label">{option}</label>
                              </div>
                            ))}
                          </div>
                        )}

                        {question.type === "checkboxes" && (
                          <div>
                            {question.options.map((option, i) => (
                              <div className="form-check" key={i}>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  name={`question-${index}-${i}`}
                                  value={option}
                                  checked={Array.isArray(responses[index]) && responses[index].includes(option)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setResponses((prev) => {
                                      const current = Array.isArray(prev[index]) ? [...prev[index]] : [];
                                      if (checked) {
                                        return { ...prev, [index]: [...current, option] };
                                      } else {
                                        return {
                                          ...prev,
                                          [index]: current.filter((item) => item !== option),
                                        };
                                      }
                                    });
                                  }}
                                />
                                <label className="form-check-label">{option}</label>
                              </div>
                            ))}
                          </div>
                        )}

                        {question.type === "trueFalse" && (
                          <div>
                            {["True", "False"].map((option, i) => (
                              <div className="form-check" key={i}>
                                <input
                                  type="radio"
                                  className="form-check-input"
                                  name={`question-${index}`}
                                  value={option}
                                  checked={responses[index] === option}
                                  onChange={() => handleResponseChange(index, option)}
                                  required={question.required}
                                />
                                <label className="form-check-label">{option}</label>
                              </div>
                            ))}
                          </div>
                        )}

                        {question.type === "dropdown" && (
                          <select
                            className="form-select"
                            value={responses[index] || ""}
                            onChange={(e) => handleResponseChange(index, e.target.value)}
                            required={question.required}
                          >
                            <option value="" disabled>Select an option</option>
                            {question.options.map((option, i) => (
                              <option key={i} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                        
                      </div>
                  ))}

                </div>
              )}
              </div>


              {error && <div className="alert alert-danger">{error}</div>}
              <button type="submit" className="btn btn-primary mt-3">
                Sign In
              </button>
            </form>
          )}
        </div>
      ) : (
        <p>Loading event...</p>
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
    </>
  );
};

export default EventSignin;
