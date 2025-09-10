import React from "react";
import styles from "./SignInQuestions.css";

function SignInQuestions({ questions = [], responses = {}, setResponses }) {
  const updateResponse = (index, value) => {
    // Always create a new object so React re-renders
    const newResponses = { ...responses, [index]: value };
    setResponses(newResponses);
  };

  if (questions.length === 0) return null;

  return (
    <div className="sign-in-questions">
      {questions.map((q, index) => (
        <div key={index} className="question">
          <label>
            {q.text} {q.required && <span style={{ color: "red" }}>*</span>}
          </label>

          {q.type === "shortAnswer" && (
            <input
              type="text"
              className="sign-in-questions-text"
              value={responses[index] || ""}
              onChange={(e) => updateResponse(index, e.target.value)}
            />
          )}

          {q.type === "multipleChoice" && (
            <div>
              {q.options?.map((opt, i) => (
                <div key={i} className="sign-in-questions-mcq">
                  <input
                    type="radio"
                    name={`q-${index}`}
                    value={opt}
                    checked={responses[index] === opt}
                    onChange={(e) => updateResponse(index, e.target.value)}
                    className="sign-in-questions-mcq-button"
                  />
                  <label>{opt}</label>
                </div>
              ))}
            </div>
          )}

          {q.type === "checkboxes" && (
            <div>
              {q.options?.map((opt, i) => (
                <div key={i}>
                  <input
                    type="checkbox"
                    value={opt}
                    checked={responses[index]?.includes(opt) || false}
                    onChange={(e) => {
                      let newVals = responses[index] || [];
                      if (e.target.checked) {
                        newVals = [...newVals, opt];
                      } else {
                        newVals = newVals.filter((val) => val !== opt);
                      }
                      updateResponse(index, newVals);
                    }}
                  />
                  <label>{opt}</label>
                </div>
              ))}
            </div>
          )}

          {q.type === "trueFalse" && (
            <div className="sign-in-question-tf">
              <label>
                <input
                  className="sign-in-question-checkbox"
                  type="checkbox"
                  name={`q-${index}`}
                  value="true"
                  checked={responses[index] === "true"}
                  onChange={(e) => updateResponse(index, e.target.value)}
                />
                True
              </label>
              <label>
                <input
                  className="sign-in-question-checkbox"
                  type="checkbox"
                  name={`q-${index}`}
                  value="false"
                  checked={responses[index] === "false"}
                  onChange={(e) => updateResponse(index, e.target.value)}
                />
                False
              </label>
            </div>
          )}

          {q.type === "dropdown" && (
            <select
              className="sign-in-questions-dropdown"
              value={responses[index] || ""}
              onChange={(e) => updateResponse(index, e.target.value)}
            >
              <option value="">Select an option</option>
              {q.options?.map((opt, i) => (
                <option key={i} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}

export default SignInQuestions;
