import React, { useRef } from "react";
import emailjs from "emailjs-com";
import './ContactUs.css';

// TODO: in sendEmail, replace service, template, and API key with the SWE webmaster email account
const ContactUs = () => {
    const form = useRef();
    const sendEmail = (e) => {
        e.preventDefault();
        emailjs.sendForm('SERVICE', 'TEMPLATE', form.current, 'APIKEY')
        .then(response => {
            console.log("Success:", response);
            alert("Thank you for your feedback!");
        })
        .catch(error => {
            console.error("Failed to send email:", JSON.stringify(error, null, 2));
        });
        e.target.reset();
    };

    return (
    <div>
        <h1> Contact Us </h1>
        <div className="emailus-container">
            <a href="mailto:webmaster.swe.ucla@gmail.com">
                <div className="emailus">
                    Email
                    <p>webmaster.swe.ucla@gmail.com</p>
                    <p>Send a Message</p>
                </div>
            </a>
        </div>
        <div>
            <h2> Issues with the portal? Fill out the form below! </h2>
            <form ref={form} onSubmit={sendEmail}>
                <input type="text" name='name' placeholder='Your Full Name' required/>
                <input type="email" name='email' placeholder='Your Email' required/>
                <textarea name="message"  rows="7" placeholder='Description of your bug' required></textarea>
                <button type='submit' className='btn btn-primary'>Send Message</button>
            </form>
        </div>
    </div>
    )
}

export default ContactUs;