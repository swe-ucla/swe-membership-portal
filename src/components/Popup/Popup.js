import React, { useEffect, useState, useRef } from 'react';
import './Popup.css';

const Popup = ({ 
  isOpen, 
  onClose, 
  message, 
  toast = false, 
  duration = 3000, 
  confirm = false, 
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  input = false,
  inputValue = ""
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [inputText, setInputText] = useState(inputValue);
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
      timersRef.current.fadeOutTimer = setTimeout(() => { setIsFadingOut(true); }, duration); // Start fade out
      timersRef.current.closeTimer = setTimeout(() => { onCloseRef.current(); }, duration + 300); // Close popup after fade out
    }
  }, [isOpen, toast, confirm]); // Removed duration from dependencies

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
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }, 100);
    }
  }, [isOpen]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timersRef.current.fadeOutTimer) {
        clearTimeout(timersRef.current.fadeOutTimer);
      }
      if (timersRef.current.closeTimer) {
        clearTimeout(timersRef.current.closeTimer);
      }
    };
  }, []);

  const handleClose = () => {
    setIsFadingOut(true); // Start fade out
    setTimeout(() => { onCloseRef.current(); }, 300); // Close popup after fade out
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
      className={`popup-overlay ${isFadingOut ? 'fade-out' : 'fade-in'}`}
      onClick={toast ? undefined : handleClose}
    >
      <div
        className={`popup ${toast ? 'popup-toast' : ''} ${confirm ? 'popup-confirm' : ''} ${isFadingOut ? 'fade-out' : 'fade-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="popup-header">
          <button className="popup-close" onClick={handleClose}>×</button>
        </div>
        <div className="popup-content">
          <p className="popup-message">{message}</p>
          {input && (
            <input 
              type="text" 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type here..."
              style={{
                width: "100%", 
                padding: "10px", 
                margin: "10px 0", 
                border: "1px solid #ddd", 
                borderRadius: "5px",
                fontSize: "16px"
              }}
              autoFocus
            />
          )}
          {confirm && (
            <div className="popup-actions">
              <button className="popup-btn popup-btn-cancel" onClick={handleClose}>{cancelText}</button>
              <button className="popup-btn popup-btn-confirm" onClick={handleConfirm}>{confirmText}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Popup;