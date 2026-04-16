import React, { useEffect, useState, useRef } from "react";
import "./Popup.css";

const Popup = ({
  isOpen,
  onClose,
  message,
  toast = false,
  duration = 999999,
  confirm = false,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  input = false,
  inputValue = "",
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [inputText] = useState(inputValue);
  const onCloseRef = useRef(onClose);
  const timersRef = useRef({ fadeOutTimer: null, closeTimer: null });
  const popupRef = useRef(null);

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

  // Auto-scroll popup into view when it opens
  useEffect(() => {
    if (isOpen && popupRef.current) {
      // Small delay to ensure the popup is rendered
      setTimeout(() => {
        popupRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }, 100);
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
      ref={popupRef}
      className={`popup-overlay ${isFadingOut ? "fade-out" : "fade-in"}`}
      onClick={toast ? undefined : handleClose}
    >
      <div
        className={`popup ${toast ? "popup-toast" : ""} ${
          confirm ? "popup-confirm" : ""
        } ${isFadingOut ? "fade-out" : "fade-in"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="popup-header">
          <button className="popup-close" onClick={handleClose}>
            ×
          </button>
        </div>
        <div className="popup-content">
          <p className="popup-message">{message}</p>
          {confirm && (
            <div className="popup-actions">
              {/*
              <button
                className="popup-btn popup-btn-cancel"
                onClick={handleClose}
              >
                {cancelText}
              </button>
              */}
              <button
                className="popup-btn popup-btn-confirm"
                onClick={handleConfirm}
              >
                {confirmText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Popup;
