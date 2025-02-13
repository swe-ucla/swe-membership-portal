import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";

const EventSignin = () => {
  const { eventID } = useParams();
  const [event, setEvent] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [responses, setResponses] = useState({}); // Store question responses
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
    const missingRequired = event.questions?.some((q, index) => 
      q.required && !responses[index]?.trim()
    );

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
          const currentPoints = userData.totalPoints || 0;
          const attendedEvents = userData.attendedEvents || [];

          if (!userData.name || !userData.year || !userData.major) {
            alert("Please complete your profile before signing in.");
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
            totalPoints: currentPoints + (event.points || 0),
            // lastEventSignIn: new Date().toISOString(),
          });

          setSuccess(true);
          setTimeout(() => {
            navigate("/home");
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
              {/* Questions Section */}
              {event.questions && event.questions.length > 0 && (
                <div className="mb-4">
                  <h3>Event Questions</h3>
                  {event.questions.map((question, index) => (
                    <div key={index} className="mb-3">
                      <label className="form-label">
                        {question.text}
                        {question.required && <span className="text-danger">*</span>}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={responses[index] || ""}
                        onChange={(e) => handleResponseChange(index, e.target.value)}
                        required={question.required}
                      />
                    </div>
                  ))}
                </div>
              )}

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
    </div>
  );
};

export default EventSignin;
