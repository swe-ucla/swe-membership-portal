import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc, updateDoc, arrayUnion, increment } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";
import Popup from "../Popup/Popup";
import { getCommittee } from "../../constants/eventTypes";
import "./EventSignin.css";

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

  const sortedQuestions = useMemo(() => {
    if (!event?.questions) return [];
    return [...event.questions].sort((a, b) =>
      a.text.toLowerCase().includes("attendance code") ? -1 : 1
    );
  }, [event]);

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
    const missingRequired = sortedQuestions.some((q, index) => {
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
          attendeeCount: increment(1),
          [`responses.${user.uid}`]: responses
        });

        // Also update user's attended events
        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentPoints = Number(userData.swePoints) || 0;
          const attendedEvents = userData.attendedEvents || [];

          if (!userData.firstName || !userData.lastName || !userData.year || !userData.major) {
            setPopup({ isOpen: true, message: "Please complete your profile before signing in.", toast: false });
            navigate("/profile");
            return;
          }

          if (attendedEvents.includes(eventID)) {
            setError("You have already signed into this event.");
            return;
          }

          await updateDoc(userRef, {
            attendedEvents: arrayUnion(eventID),
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
    <div className="event-signin-page">
      <header className="event-signin-header">
        {event ? (
          <>
            <h1>{event.name}</h1>
            <p className="event-location">
              Location: {event.location}
            </p>

            {getCommittee(event) && (
              <p className="event-committee">
                Hosted by: {getCommittee(event)}
              </p>
            )}
          </>
        ) : (
          <p>Loading event...</p>
        )}
      </header>

      <main className="event-signin-content">
        {event && (
          <>
            {success ? (
              <div className="alert alert-success event-message">
                Attendance recorded successfully! Redirecting...
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="event-signin-form"
              >
                <section className="attendance-code-card">
                  <label
                    htmlFor="attendance-code"
                    className="attendance-code-label"
                  >
                    Enter Attendance Code:
                  </label>

                  <input
                    id="attendance-code"
                    type="text"
                    className="form-control"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </section>

                {sortedQuestions.length > 0 && (
                  <section className="event-questions-card">
                    <h2>Event Questions</h2>

                    <div className="event-question-list">
                      {sortedQuestions.map((question, index) => (
                        <div
                          key={index}
                          className="event-question"
                        >
                          <label className="form-label">
                            {question.text}
                            {question.required && (
                              <span className="text-danger">*</span>
                            )}
                          </label>

                          {question.caption && (
                            <p className="question-caption">
                              {question.caption}
                            </p>
                          )}

                          {question.type === "shortAnswer" && (
                            <input
                              type="text"
                              className="form-control"
                              value={responses[index] || ""}
                              onChange={(e) =>
                                handleResponseChange(
                                  index,
                                  e.target.value
                                )
                              }
                              required={question.required}
                            />
                          )}

                          {question.type === "multipleChoice" && (
                            <div className="question-options">
                              {question.options.map((option, i) => (
                                <div className="form-check" key={i}>
                                  <input
                                    id={`question-${index}-${i}`}
                                    type="radio"
                                    className="form-check-input"
                                    name={`question-${index}`}
                                    value={option}
                                    checked={
                                      responses[index] === option
                                    }
                                    onChange={() =>
                                      handleResponseChange(
                                        index,
                                        option
                                      )
                                    }
                                    required={question.required}
                                  />

                                  <label
                                    htmlFor={`question-${index}-${i}`}
                                    className="form-check-label"
                                  >
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}

                          {question.type === "checkboxes" && (
                            <div className="question-options">
                              {question.options.map((option, i) => (
                                <div className="form-check" key={i}>
                                  <input
                                    id={`question-${index}-${i}`}
                                    type="checkbox"
                                    className="form-check-input"
                                    name={`question-${index}-${i}`}
                                    value={option}
                                    checked={
                                      Array.isArray(
                                        responses[index]
                                      ) &&
                                      responses[index].includes(
                                        option
                                      )
                                    }
                                    onChange={(e) => {
                                      const checked =
                                        e.target.checked;

                                      setResponses((prev) => {
                                        const current =
                                          Array.isArray(
                                            prev[index]
                                          )
                                            ? [...prev[index]]
                                            : [];

                                        return {
                                          ...prev,
                                          [index]: checked
                                            ? [...current, option]
                                            : current.filter(
                                                (item) =>
                                                  item !== option
                                              ),
                                        };
                                      });
                                    }}
                                  />

                                  <label
                                    htmlFor={`question-${index}-${i}`}
                                    className="form-check-label"
                                  >
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}

                          {question.type === "trueFalse" && (
                            <div className="question-options">
                              {["True", "False"].map(
                                (option, i) => (
                                  <div
                                    className="form-check"
                                    key={option}
                                  >
                                    <input
                                      id={`question-${index}-${i}`}
                                      type="radio"
                                      className="form-check-input"
                                      name={`question-${index}`}
                                      value={option}
                                      checked={
                                        responses[index] ===
                                        option
                                      }
                                      onChange={() =>
                                        handleResponseChange(
                                          index,
                                          option
                                        )
                                      }
                                      required={
                                        question.required
                                      }
                                    />

                                    <label
                                      htmlFor={`question-${index}-${i}`}
                                      className="form-check-label"
                                    >
                                      {option}
                                    </label>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          {question.type === "dropdown" && (
                            <select
                              className="form-select"
                              value={responses[index] || ""}
                              onChange={(e) =>
                                handleResponseChange(
                                  index,
                                  e.target.value
                                )
                              }
                              required={question.required}
                            >
                              <option value="" disabled>
                                Select an option
                              </option>

                              {question.options.map(
                                (option, i) => (
                                  <option
                                    key={i}
                                    value={option}
                                  >
                                    {option}
                                  </option>
                                )
                              )}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>

                    {error && (
                      <div className="alert alert-danger">
                        {error}
                      </div>
                    )}

                    <div className="signin-button-row">
                      <button
                        type="submit"
                        className="signin-button"
                      >
                        Sign In
                      </button>
                    </div>
                  </section>
                )}

                {sortedQuestions.length === 0 && (
                  <>
                    {error && (
                      <div className="alert alert-danger">
                        {error}
                      </div>
                    )}

                    <div className="signin-button-row">
                      <button
                        type="submit"
                        className="signin-button"
                      >
                        Sign In
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </>
        )}
      </main>

      <Popup
        isOpen={popup.isOpen}
        message={popup.message}
        toast={popup.toast}
        confirm={popup.confirm}
        onConfirm={popup.onConfirm}
        onClose={() =>
          setPopup({
            isOpen: false,
            message: "",
            toast: false,
            confirm: false,
            onConfirm: null,
          })
        }
      />
    </div>
  );
};

export default EventSignin;
