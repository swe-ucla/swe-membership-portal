import React, { useEffect, useState } from 'react';
import './Popup.css';

const Popup = ({ isOpen, onClose, message, toast = false, duration = 3000 }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (isOpen && toast) {
      const fadeOutTimer = setTimeout(() => { setIsFadingOut(true); }, duration); // Start fade out
      const closeTimer = setTimeout(() => { onClose(); }, duration + 300); // Close popup after fade out

      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [isOpen, toast, duration, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setIsFadingOut(false); // Reset fade-out state when popup is closed
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsFadingOut(true); // Start fade out
    setTimeout(() => { onClose(); }, 300); // Close popup after fade out
  };

  if (!isOpen) return null;

  return (
    <div
      className={`popup-overlay ${isFadingOut ? 'fade-out' : 'fade-in'}`}
      onClick={toast ? undefined : handleClose}
    >
      <div
        className={`popup ${toast ? 'popup-toast' : ''} ${isFadingOut ? 'fade-out' : 'fade-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="popup-header">
          <button className="popup-close" onClick={handleClose}>×</button>
        </div>
        <div className="popup-content">
          <p className="popup-message">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default Popup;