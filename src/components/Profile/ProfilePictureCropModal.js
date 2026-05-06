import React, { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "../../utils/cropImage";
import { MaterialSymbol } from "react-material-symbols";
import "react-material-symbols/rounded";

const ASPECT = 1;

function ProfilePictureCropModal({ imageSrc, onCancel, onApply }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleApply = async () => {
    if (!croppedAreaPixels) {
      setError("Adjust the photo, then try again.");
      return;
    }
    setError("");
    setApplying(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      await onApply(blob);
    } catch (err) {
      console.error(err);
      setError("Could not process this image. Try a different file.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="profile-crop-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-crop-title"
    >
      <div className="profile-crop-modal">
        <h3 id="profile-crop-title" className="profile-crop-modal-title">
          Move and zoom
        </h3>
        <p className="profile-crop-modal-hint">
          Drag to reposition. Use the slider to zoom in or out.
        </p>

        <div className="profile-crop-stage">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            minZoom={1}
            maxZoom={3}
            zoomSpeed={0.4}
          />
        </div>

        <div className="profile-crop-zoom-row">
          <MaterialSymbol icon="zoom_out" size={22} className="profile-crop-zoom-icon" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="profile-crop-zoom-slider"
            aria-label="Zoom"
          />
          <MaterialSymbol icon="zoom_in" size={22} className="profile-crop-zoom-icon" />
        </div>

        {error ? (
          <p className="profile-crop-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="profile-crop-actions">
          <button
            type="button"
            className="btn profile-crop-btn-cancel"
            onClick={onCancel}
            disabled={applying}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn profile-crop-btn-apply"
            onClick={handleApply}
            disabled={applying}
          >
            {applying ? "Saving…" : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePictureCropModal;
