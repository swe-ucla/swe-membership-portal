import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "../firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import Popup from "../Popup/Popup";
import ProfilePictureCropModal from "./ProfilePictureCropModal";
import "./Profile.css";
import { MaterialSymbol } from "react-material-symbols";
import "react-material-symbols/rounded";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dgtsekxga/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "SWE Membership Portal";

const majorOptions = [
  "Aerospace Engineering",
  "Bioengineering",
  "Chemical Engineering",
  "Civil Engineering",
  "Computer Engineering",
  "Computer Science",
  "Computer Science and Engineering",
  "Electrical Engineering",
  "Materials Engineering",
  "Mechanical Engineering",
  "Other",
];

const yearOptions = [
  { label: "Undergraduate Students:", value: "", disabled: true },
  { label: "Freshman", value: "Freshman", disabled: false },
  { label: "Sophomore", value: "Sophomore", disabled: false },
  { label: "Junior", value: "Junior", disabled: false },
  { label: "Senior", value: "Senior", disabled: false },
  { label: "Graduate Students:", value: "", disabled: true },
  {
    label: "First-year graduate student",
    value: "First-year graduate student",
    disabled: false,
  },
  {
    label: "Second-year graduate student",
    value: "Second-year graduate student",
    disabled: false,
  },
  {
    label: "Third-year graduate student",
    value: "Third-year graduate student",
    disabled: false,
  },
  {
    label: "Fourth-year graduate student and beyond",
    value: "Fourth-year graduate student and beyond",
    disabled: false,
  },
  { label: "Other", value: "Other", disabled: false },
];

const committeeOptions = [
  "Evening with Industry",
  "Dev",
  "Technical",
  "Lobbying",
  "Outreach",
  "Internal Affairs",
  "Advocacy",
  "Mentorship",
  "General"
]
const EditProfileForm = ({ userDetails, onUpdate }) => {
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem("editProfileForm");
    if (saved) return JSON.parse(saved);

    return {
      profilePicture: userDetails?.profilePicture || "",
      firstName: userDetails?.firstName || "",
      lastName: userDetails?.lastName || "",
      year: userDetails?.year || "",
      major: majorOptions.includes(userDetails?.major)
        ? userDetails?.major
        : "Other",
      otherMajor:
        userDetails?.major && !majorOptions.includes(userDetails?.major)
          ? userDetails?.major
          : "",
      memberId: userDetails?.memberId || "",
      bio: userDetails?.bio || "",
      swePoints: userDetails?.swePoints || 0,
      committee: userDetails?.committee || "",
      linkedin: userDetails?.linkedin || ""
    };
  });

  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const fileInputRef = useRef(null);
  const [bioWordCount, setBioWordCount] = useState(
    userDetails?.bio ? userDetails.bio.trim().split(/\s+/).length : 0
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popup, setPopup] = useState({ isOpen: false, message: "", toast: false, confirm: false, onConfirm: null, input: false, inputValue: "" });
  const formRef = useRef(null);

  const handlePopupClose = useCallback(() => {
    console.log("handlePopupClose called");
    setPopup({ isOpen: false, message: "", toast: false, confirm: false, onConfirm: null });
  }, []);

  useEffect(() => {
    // Update formData when userDetails changes (on initial load or updates)
    const saved = localStorage.getItem("editProfileForm");
    if (!saved && userDetails) {
      setFormData({
        profilePicture: userDetails?.profilePicture || "",
        firstName: userDetails?.firstName || "",
        lastName: userDetails?.lastName || "",
        year: userDetails?.year || "",
        major: majorOptions.includes(userDetails?.major)
          ? userDetails?.major
          : "Other",
        otherMajor:
          userDetails?.major && !majorOptions.includes(userDetails?.major)
            ? userDetails?.major
            : "",
        memberId: userDetails?.memberId || "",
        bio: userDetails?.bio || "",
        swePoints: userDetails?.swePoints || 0,
        committee: userDetails?.committee || "",
        linkedin: userDetails?.linkedin || ""
      });
      setBioWordCount(
        userDetails?.bio ? userDetails.bio.trim().split(/\s+/).length : 0
      );
    }
  }, [userDetails]);

  useEffect(() => {
    return () => {
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    };
  }, [cropImageSrc]);

  useEffect(() => {
    if (formData.profilePicture && formData.profilePicture.startsWith('data:')) {
      return; // preview URL, don't save to localStorage (so doesn't get overridden)
    }
    localStorage.setItem("editProfileForm", JSON.stringify(formData));
  }, [formData]);

  const isValidLinkedIn = (url) => {
    if (!url || !url.trim()) return true; // optional field
    return (
      url.startsWith("https://linkedin.com/") ||
      url.startsWith("https://www.linkedin.com/")
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "bio") {
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount <= 100) {
        setFormData((prev) => ({ ...prev, bio: value }));
        setBioWordCount(wordCount);
        setErrors((prev) => ({ ...prev, bio: "" }));
      } else {
        setErrors((prev) => ({ ...prev, bio: "Bio cannot exceed 100 words." }));
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleMajorChange = (e) => {
    const selectedMajor = e.target.value;
    if (selectedMajor === "Other") {
      setFormData((prev) => ({
        ...prev,
        major: selectedMajor,
        otherMajor: prev.otherMajor || "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        major: selectedMajor,
        otherMajor: "",
      }));
    }
  };

  const closeCropModal = useCallback(() => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
    setCropModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cropImageSrc]);

  const handleCropApply = useCallback(
    async (blob) => {
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
      setCropModalOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const file = new File([blob], "profile-photo.jpg", {
        type: "image/jpeg",
      });
      setImageFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({
          ...prev,
          profilePicture: event.target.result,
        }));
      };
      reader.onerror = (err) => console.error("FileReader error:", err);
      reader.readAsDataURL(file);
    },
    [cropImageSrc]
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPopup({
        isOpen: true,
        message: "Please choose an image file.",
        toast: true,
        confirm: false,
        onConfirm: null,
      });
      e.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    setCropModalOpen(true);
  };

  const validateField = (name, value) => {
    return value.trim() ? "" : `${name} is required`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (bioWordCount > 100) {
      setErrors((prev) => ({
        ...prev,
        bio: "Bio cannot exceed 100 words.",
      }));

      return;
    }

    const newErrors = {
      firstName: validateField("First Name", formData.firstName),
      lastName: validateField("Last Name", formData.lastName),
      year: validateField("Year", formData.year),
      major: validateField("Major", formData.major),
      committee: validateField("Committee", formData.committee),
      // Removed memberId validation since it's now optional
      otherMajor:
        formData.major === "Other" && !formData.otherMajor.trim()
          ? "Please specify your major."
          : "",
      linkedin:
        formData.linkedin && !isValidLinkedIn(formData.linkedin)
          ? "Please enter a valid LinkedIn URL"
          : "",
    };

    setErrors(newErrors);
    if (Object.values(newErrors).some((error) => error)) return;

    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

    setIsSubmitting(true);

    try {
      let updatedFormData = { ...formData };

      if (imageFile) {
        const formDataToUpload = new FormData();
        formDataToUpload.append("file", imageFile);
        formDataToUpload.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: formDataToUpload,
        });

        if (!response.ok) {
          throw new Error("Cloudinary upload failed");
        }

        const cloudinaryResult = await response.json();
        updatedFormData.profilePicture = cloudinaryResult.secure_url;
      }

      if (formData.major === "Other") {
        updatedFormData.major = formData.otherMajor;
      } else {
        updatedFormData.otherMajor = ""; // Clear otherMajor if major is not "Other"
      }

      const userRef = doc(db, "Users", user.uid);
      await updateDoc(userRef, updatedFormData);
      console.log("Profile updated successfully.");
      console.log("Setting popup to show success message");
      setPopup({ isOpen: true, message: "Profile updated successfully.", toast: true, confirm: false, onConfirm: null });
      
      // Delay the onUpdate call to prevent immediate re-render
      setTimeout(() => {
        onUpdate(updatedFormData);
        localStorage.removeItem("editProfileForm");
      }, 3500); // Wait for popup to close first
    } catch (error) {
      console.error("Error updating profile:", error);
      setPopup({ isOpen: true, message: "Failed to update profile. Please try again later.", toast: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

    setPopup({
      isOpen: true,
      message: "Are you sure you want to delete your account? This action cannot be undone.",
      toast: false,
      confirm: true,
      onConfirm: performDeleteAccount
    });
  };

  const performDeleteAccount = async () => {
    console.log("performDeleteAccount called");
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found.");
      setPopup({ isOpen: true, message: "No user found. Please log in again.", toast: true });
      return;
    }

    try {
      // Delete Firebase Auth user first (this also signs them out)
      await deleteUser(user);
      console.log("Firebase Auth user deleted");
      
      // Then delete Firestore document
      await deleteDoc(doc(db, "Users", user.uid));
      console.log("Firestore document deleted");

      localStorage.removeItem("editProfileForm");
      
      setPopup({ isOpen: true, message: "Account deleted successfully. Redirecting...", toast: true });
      setTimeout(() => { window.location.href = "/"; }, 2000);
    } catch (error) {
      console.error("Delete account error:", error);
      setPopup({ isOpen: true, message: "Failed to delete account: " + error.message, toast: true });
    }
  };

  return (
    <>
      {cropModalOpen && cropImageSrc ? (
        <ProfilePictureCropModal
          imageSrc={cropImageSrc}
          onCancel={closeCropModal}
          onApply={handleCropApply}
        />
      ) : null}
      <Popup
        isOpen={popup.isOpen}
        onClose={handlePopupClose}
        message={popup.message}
        toast={popup.toast}
        confirm={popup.confirm}
        onConfirm={popup.onConfirm}
        cancelText={popup.confirm ? "Cancel" : undefined}
        confirmText={popup.confirm ? (popup.input ? "Confirm" : "Yes, delete my account") : undefined}
        input={popup.input}
        inputValue={popup.inputValue}
      />
      <div className="edit-profile-container">
        <h2 className="edit-profile-header">Edit Profile</h2>
        
        <div className="edit-profile-main-section">
          <div className="edit-profile-top-row">
            <div className="edit-profile-picture-section">
              <div
                className="edit-profile-picture-container"
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.profilePicture ? (
                  <img
                    src={formData.profilePicture}
                    alt="Profile"
                    className="edit-profile-picture"
                  />
                ) : (
                  <div className="edit-no-picture">
                    <span>Upload a photo</span>
                  </div>
                )}
                <div className="edit-picture-overlay">
                  <MaterialSymbol icon="edit" size={20} />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="edit-picture-input"
                id="profile-picture-input"
                aria-label="Upload profile picture"
              />
            </div>

            <div className="edit-name-fields">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <div className="input-container">
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={errors.firstName ? "input-error" : ""}
                    />
                    {errors.firstName && (
                      <MaterialSymbol icon="error" size={24} className="input-error-icon" />
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Last Name</label>
                  <div className="input-container">
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={errors.lastName ? "input-error" : ""}
                    />
                    {errors.lastName && (
                      <MaterialSymbol icon="error" size={24} className="input-error-icon" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {Object.values(errors).some((e) => e) && (
            <div className="alert-banner">
              <MaterialSymbol icon="error" size={24} className="alert-icon" />
              <span>Your profile is missing information!</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="edit-profile-form" ref={formRef}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={userDetails?.email || ""}
                disabled
                className="disabled-input"
              />
            </div>

            <div className="form-group">
              <label>Year</label>
              <div className="input-container">
                <select 
                  name="year" 
                  value={formData.year} 
                  onChange={handleChange}
                  className={errors.year ? "input-error" : ""}
                >
                  {yearOptions.map((option, index) => (
                    <option key={index} value={option.value} disabled={option.disabled}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.year && (
                  <MaterialSymbol icon="error" size={24} className="input-error-icon" />
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Major</label>
              <div className="input-container">
                <select
                  name="major"
                  value={formData.major}
                  onChange={handleMajorChange}
                  className={errors.major ? "input-error" : ""}
                >
                  {majorOptions.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.major && (
                  <MaterialSymbol icon="error" size={24} className="input-error-icon" />
                )}
              </div>

              {formData.major === "Other" && (
                <div className="input-container">
                  <input
                    type="text"
                    name="otherMajor"
                    placeholder="Enter your major"
                    value={formData.otherMajor}
                    onChange={handleChange}
                    className={errors.otherMajor ? "input-error" : ""}
                  />
                  {errors.otherMajor && (
                    <MaterialSymbol icon="error" size={20} className="input-error-icon" />
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Committee</label>
              <div className="input-container">
                <select
                  name="committee"
                  value={formData.committee}
                  onChange={handleChange}
                  className={errors.committee ? "input-error" : ""}
                >
                  {committeeOptions.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.major && (
                  <MaterialSymbol icon="error" size={24} className="input-error-icon" />
                )}
              </div>
            </div>

            <div className="form-group">
              <label>LinkedIn</label>
              <div className="input-container">
                <input
                  type="text"
                  name="linkedin"
                  placeholder="https://linkedin.com/in/yourname"
                  value={formData.linkedin}
                  onChange={handleChange}
                  className={errors.linkedin ? "input-error" : ""}
                />
              </div>
              {errors.linkedin && (
                <MaterialSymbol icon="error" size={24} className="input-error-icon" />
              )}
            </div>

            <div className="button-group">
              <button
                type="submit"
                className="btn save-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="btn delete-btn"
                onClick={handleDeleteAccount}
              >
                Delete Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditProfileForm;
