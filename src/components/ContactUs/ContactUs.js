import React, { useRef, useState } from "react";
import emailjs from "emailjs-com";
import "./ContactUs.css";

const ContactSection = () => {
  const form = useRef();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const sendEmail = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    emailjs
      .sendForm(
        "service_oa92hy9",
        "template_xschbvb",
        form.current,
        "Z7j812LuDjlbsCsMe"
      )
      .then(
        (result) => {
          console.log("Email sent successfully!", result.text);
          setSubmitStatus("success");
          form.current.reset();
        },
        (error) => {
          console.error("Error sending email:", error.text);
          setSubmitStatus("error");
        }
      )
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (

    <div className="contact-container">
      <div className="section-heading">
        <h2>Contact Us</h2>
        <div className="heading-underline"></div>
      </div>

      <div className="contact-content">
        <div className="contact-info">
          <h3>Get in Touch</h3>

          {/* Transparent email card */}
          <div className="email-card">
            <div className="email-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <div className="email-content">
              <h4>Email Us</h4>
              <p>webmaster.swe.ucla@gmail.com</p>
            </div>
          </div>

          <div className="social-links">
            <a
              href="https://www.instagram.com/swe.ucla/?hl=en"
              className="social-link"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/company/swe-ucla/"
              className="social-link"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
            </a>
          </div>
        </div>

        <div className="contact-form">
          <h3>Report an Issue</h3>
          <form ref={form} onSubmit={sendEmail}>
            <div className="form-group">
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="Your Full Name"
                required
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="Your Email"
                required
              />
            </div>
            <div className="form-group">
              <textarea
                name="message"
                className="form-control"
                rows="4"
                placeholder="Description of your issue"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </button>

            {submitStatus === "success" && (
              <div className="submit-message success">
                Message sent successfully!
              </div>
            )}

            {submitStatus === "error" && (
              <div className="submit-message error">
                Failed to send message. Please try again.
              </div>
            )}
          </form>
        </div>
      </div>

      
    </div>
    
  );
};

export default ContactSection;
