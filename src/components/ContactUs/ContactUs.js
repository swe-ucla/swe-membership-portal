import React, { useRef, useState, useEffect } from "react";
import emailjs from "emailjs-com";
import styles from "./ContactUs.css";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import Popup from "../Popup/Popup";

const ContactSection = () => {
  const form = useRef();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popup, setPopup] = useState({
    isOpen: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    document.body.classList.add("contact-page");

    return () => {
      document.body.classList.remove("contact-page");
    };
  }, []);

  const sendEmail = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

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
          form.current.reset();
          setPopup({
            isOpen: true,
            message: "Message sent successfully!",
            type: "success",
          });
        },
        (error) => {
          console.error("Error sending email:", error.text);
          setPopup({
            isOpen: true,
            message:
              "Failed to send message. Please try again or contact us directly.",
            type: "error",
          });
        }
      )
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const closePopup = () => {
    setPopup({
      isOpen: false,
      message: "",
      type: "success",
    });
  };

  return (
    <>
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
            </form>
            <div className="social-links">
              <a
                href="mailto:webmaster.swe.ucla@gmail.com"
                className="social-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MailOutlineIcon style={{ fontSize: 30 }} />
              </a>
              <a
                href="https://www.instagram.com/swe.ucla/?hl=en"
                className="social-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <InstagramIcon style={{ fontSize: 30 }} />
              </a>
              <a
                href="https://www.linkedin.com/company/swe-ucla/"
                className="social-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <LinkedInIcon style={{ fontSize: 30 }} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <Popup
        isOpen={popup.isOpen}
        onClose={closePopup}
        message={popup.message}
        toast={true}
        duration={4000}
      />
    </>
  );
};

export default ContactSection;
