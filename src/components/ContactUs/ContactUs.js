import React, { useRef, useState, useEffect } from "react";
import emailjs from "emailjs-com";
import "./ContactUs.css";
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const ContactSection = () => {
  const form = useRef();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    document.body.classList.add("contact-page");

    return () => {
      document.body.classList.remove("contact-page");
    };
  }, []);

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

      <div className="contact-content">

        <div className="contact-form">
          <h1>Report an Issue</h1>
          <form ref={form} onSubmit={sendEmail}>
            <div className="form-group">
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="Name"
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
              className="send-btn"
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

        <div className="social-links">
            <a
              href="mailto:webmaster.swe.ucla@gmail.com"
              className="social-link"
            >
              <MailOutlineIcon style={{ fontSize: 30 }}/>
            </a>
            <a
              href="https://www.instagram.com/swe.ucla/?hl=en"
              className="social-link"
            >
              <InstagramIcon style={{ fontSize: 30 }}/>
            </a>
            <a
              href="https://www.linkedin.com/company/swe-ucla/"
              className="social-link"
            >
              <LinkedInIcon style={{ fontSize: 30 }}/>
            </a>
          </div>
        </div>

      </div>
    
  );
};

export default ContactSection;
