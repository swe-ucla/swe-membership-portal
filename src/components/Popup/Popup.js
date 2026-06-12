import React, { useEffect, useState, useRef } from "react";
import "./Popup.css";

const Popup = ({
  isOpen,
  onClose,
  message,
  title,
  children,
  toast = false,
  duration = 999999,
  confirm = false,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  input = false,
  inputValue = "",
  className = "",
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [inputText] = useState(inputValue);
  const onCloseRef = useRef(onClose);
  const timersRef = useRef({ fadeOutTimer: null, closeTimer: null });

  // Update the ref when onClose changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Clear any existing timers
    if (timersRef.current.fadeOutTimer) {
      clearTimeout(timersRef.current.fadeOutTimer);
      timersRef.current.fadeOutTimer = null;
    }
    if (timersRef.current.closeTimer) {
      clearTimeout(timersRef.current.closeTimer);
      timersRef.current.closeTimer = null;
    }

    if (isOpen && toast && !confirm) {
      setIsFadingOut(false);
      timersRef.current.fadeOutTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, duration); // Start fade out
      timersRef.current.closeTimer = setTimeout(() => {
        onCloseRef.current();
      }, duration + 300); // Close popup after fade out
    }
  }, [confirm, duration, isOpen, toast]);

  useEffect(() => {
    if (!isOpen) {
      setIsFadingOut(false); // Reset fade-out state when popup is closed

      // Clear timers when popup is closed
      if (timersRef.current.fadeOutTimer) {
        clearTimeout(timersRef.current.fadeOutTimer);
        timersRef.current.fadeOutTimer = null;
      }
      if (timersRef.current.closeTimer) {
        clearTimeout(timersRef.current.closeTimer);
        timersRef.current.closeTimer = null;
      }
    }
  }, [isOpen]);


  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      if (timers.fadeOutTimer) {
        clearTimeout(timers.fadeOutTimer);
      }
      if (timers.closeTimer) {
        clearTimeout(timers.closeTimer);
      }
    };
  }, []);

  const handleClose = () => {
    setIsFadingOut(true); // Start fade out
    setTimeout(() => {
      onCloseRef.current();
    }, 300); // Close popup after fade out
  };

  const handleConfirm = () => {
    if (onConfirm) {
      if (input) {
        onConfirm(inputText);
      } else {
        onConfirm();
      }
    } else {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`popup-overlay ${isFadingOut ? "fade-out" : "fade-in"}`}
      onClick={toast ? undefined : handleClose}
    >
      <div
        className={`popup ${toast ? "popup-toast" : ""} ${isFadingOut ? "fade-out" : "fade-in"} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="popup-header">
          <button className="popup-close" onClick={handleClose}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1.4 14L0 12.6L5.6 7L0 1.4L1.4 0L7 5.6L12.6 0L14 1.4L8.4 7L14 12.6L12.6 14L7 8.4L1.4 14Z"
                fill="#1F1F1F"
              />
            </svg>
          </button>
        </div>
        {title && <h2 className="popup-title">{title}</h2>}
        <div className="popup-content">
          {children ? (
            children
          ) : (
            <>
              <p className="popup-message">{message}</p>
              {confirm && (
                <div className="popup-actions">
                  <button
                    className="popup-btn popup-btn-confirm"
                    onClick={handleConfirm}
                  >
                    {confirmText}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Popup;
