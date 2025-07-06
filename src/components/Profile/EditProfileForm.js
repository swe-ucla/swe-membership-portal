import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { deleteUser, signOut } from "firebase/auth";
import Popup from "../Popup/Popup";
import "./Profile.css";

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
    };
  });

  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [bioWordCount, setBioWordCount] = useState(
    userDetails?.bio ? userDetails.bio.trim().split(/\s+/).length : 0
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popup, setPopup] = useState({ isOpen: false, message: "", toast: false });
  const formRef = useRef(null);

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
      });
      setBioWordCount(
        userDetails?.bio ? userDetails.bio.trim().split(/\s+/).length : 0
      );
    }
  }, [userDetails]);

  useEffect(() => {
    localStorage.setItem("editProfileForm", JSON.stringify(formData));
  }, [formData]);

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

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
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
      // Removed memberId validation since it's now optional
      otherMajor:
        formData.major === "Other" && !formData.otherMajor.trim()
          ? "Please specify your major."
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
      onUpdate(updatedFormData);
      setPopup({ isOpen: true, message: "Profile updated successfully.", toast: true });
    } catch (error) {
      console.error("Error updating profile:", error);
      setPopup({ isOpen: true, message: "Failed to update profile. Please try again later.", toast: false });
    } finally {
      setIsSubmitting(false);
    }
    localStorage.removeItem("editProfileForm");
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

    // Double confirmation for account deletion
    const firstConfirm = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "This will permanently delete all your data. Are you absolutely sure?"
    );
    if (!secondConfirm) return;

    try {
      // First delete the Firestore document
      await deleteDoc(doc(db, "Users", user.uid));
      console.log("User document deleted from Firestore.");

      // Then delete the Firebase Auth user
      await deleteUser(user);
      console.log("User account deleted from Firebase Auth.");

      // Clear any local storage
      localStorage.removeItem("editProfileForm");
      
      setPopup({ isOpen: true, message: "Your account has been deleted successfully. You will be redirected to the homepage.", toast: true });
      
      // Redirect to homepage
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting account:", error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/requires-recent-login') {
        setPopup({ isOpen: true, message: "For security reasons, you need to log in again before deleting your account. Please log out, log back in, and try again.", toast: false });
      } else if (error.code === 'auth/user-not-found') {
        setPopup({ isOpen: true, message: "User account not found. You may have already been logged out.", toast: false });
        window.location.href = "/";
      } else {
        setPopup({ isOpen: true, message: "Failed to delete account. Please try logging out and logging back in, then try again. Error: " + (error.message || "Unknown error"), toast: false });
      }
    }
  };

  return (
    <>
      <Popup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ isOpen: false, message: "", toast: false })}
        message={popup.message}
        toast={popup.toast}
      />
      <form onSubmit={handleSubmit} className="edit-profile-form" ref={formRef}>
      <div className="form-group">
        <label>
          Upload Profile Picture:
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>
      </div>

      <div className="form-group">
        <label>
          First Name <span style={{ color: "red" }}>*</span>:
        </label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
        />
        {errors.firstName && (
          <span className="error-message">{errors.firstName}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Last Name <span style={{ color: "red" }}>*</span>:
        </label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
        />
        {errors.lastName && (
          <span className="error-message">{errors.lastName}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Year <span style={{ color: "red" }}>*</span>:
        </label>
        <select name="year" value={formData.year} onChange={handleChange}>
          {yearOptions.map((option, index) => (
            <option key={index} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.year && <span className="error-message">{errors.year}</span>}
      </div>

      <div className="form-group">
        <label>
          Major <span style={{ color: "red" }}>*</span>:
        </label>
        <select
          name="major"
          value={formData.major}
          onChange={handleMajorChange}
        >
          {majorOptions.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>

        {formData.major === "Other" && (
          <input
            type="text"
            name="otherMajor"
            placeholder="Enter your major"
            value={formData.otherMajor}
            onChange={handleChange}
          />
        )}

        {errors.major && <span className="error-message">{errors.major}</span>}
        {errors.otherMajor && (
          <span className="error-message">{errors.otherMajor}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Member ID:
        </label>
        <input
          type="number"
          inputmode="numeric"
          name="memberId"
          value={formData.memberId}
          onChange={handleChange}
        />
        {errors.memberId && (
          <span className="error-message">{errors.memberId}</span>
        )}
      </div>

      <div className="form-group">
        <label>Bio (Max 100 words):</label>
        <textarea name="bio" value={formData.bio} onChange={handleChange} />
        <div className="word-counter">{100 - bioWordCount} words left</div>
        {errors.bio && <span className="error-message">{errors.bio}</span>}
      </div>

      <div className="button-group">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleDeleteAccount}
        >
          Delete Account
        </button>
      </div>
    </form>
    </>
  );
};

export default EditProfileForm;