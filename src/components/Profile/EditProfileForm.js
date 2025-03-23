import React, { useState } from "react";
import { auth, db } from "../firebase"; 
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { deleteUser, signOut } from "firebase/auth";
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
  "Other"
];

const yearOptions = [
  { label: "Undergraduate Students:", value: "", disabled: true },
  { label: "Freshman", value: "Freshman", disabled: false },
  { label: "Sophomore", value: "Sophomore", disabled: false },
  { label: "Junior", value: "Junior", disabled: false },
  { label: "Senior", value: "Senior", disabled: false },
  { label: "Graduate Students:", value: "", disabled: true },
  { label: "First-year graduate student", value: "First-year graduate student", disabled: false },
  { label: "Second-year graduate student", value: "Second-year graduate student", disabled: false },
  { label: "Third-year graduate student", value: "Third-year graduate student", disabled: false },
  { label: "Fourth-year graduate student and beyond", value: "Fourth-year graduate student and beyond", disabled: false },
  { label: "Other", value: "Other", disabled: false }
];

const EditProfileForm = ({ userDetails, onUpdate }) => {
  const [formData, setFormData] = useState({
    profilePicture: userDetails?.profilePicture || "",
    firstName: userDetails?.firstName || "",
    lastName: userDetails?.lastName || "",
    year: userDetails?.year || "",
    major: userDetails?.major || "",
    otherMajor: "",
    memberId: userDetails?.memberId || "",
    bio: userDetails?.bio || "",
    swePoints: userDetails?.swePoints || 0,
  });

  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [bioWordCount, setBioWordCount] = useState(
    userDetails?.bio ? userDetails.bio.trim().split(/\s+/).length : 0
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "bio") {
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount <= 100) {
        setFormData((prev) => ({ ...prev, bio: value }));
        setBioWordCount(wordCount);
        setErrors((prev) => ({ ...prev, bio: "" })); // Remove error if valid
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
    setFormData((prev) => ({
      ...prev,
      major: selectedMajor,
      otherMajor: selectedMajor === "Other" ? prev.otherMajor : "",
    }));
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
      otherMajor: formData.major === "Other" && !formData.otherMajor.trim() ? "Please specify your major." : "",
    };

    setErrors(newErrors);
    if (Object.values(newErrors).some((error) => error)) return;

    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

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
      }

      const userRef = doc(db, "Users", user.uid);
      await updateDoc(userRef, updatedFormData);
      console.log("Profile updated successfully.");
      onUpdate(updatedFormData);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

    try {
      await deleteDoc(doc(db, "Users", user.uid));
      await deleteUser(user);
      await signOut(auth);
      console.log("User account deleted successfully and logged out.");
      alert("Your account has been deleted. You will be redirected to the homepage.");
      window.location.href = "/"; // Redirect to homepage after logout
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="edit-profile-form">
      <div className="form-group">
        <label>
          Upload Profile Picture:
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>
      </div>

      <div className="form-group">
        <label>First Name <span style={{ color: "red" }}>*</span>:</label>
        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Last Name <span style={{ color: "red" }}>*</span>:</label>
        <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Year <span style={{ color: "red" }}>*</span>:</label>
        <select name="year" value={formData.year} onChange={handleChange}>
          {yearOptions.map((option, index) => (
            <option key={index} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Major <span style={{ color: "red" }}>*</span>:</label>
        <select name="major" value={formData.major} onChange={handleMajorChange}>
          {majorOptions.map((option, index) => (
            <option key={index} value={option}>{option}</option>
          ))}
        </select>
        {formData.major === "Other" && (
          <input type="text" name="otherMajor" placeholder="Enter your major" value={formData.otherMajor} onChange={handleChange} />
        )}
      </div>

      <div className="form-group">
        <label>Bio (Max 100 words):</label>
        <textarea name="bio" value={formData.bio} onChange={handleChange} />
        <div className="word-counter">{100 - bioWordCount} words left</div>
        {errors.bio && <span className="error-message">{errors.bio}</span>}
      </div>

      <div className="button-group">
        <button type="submit" className="btn btn-primary">Save Changes</button>
        <button type="button" className="btn btn-danger" onClick={handleDeleteAccount}>Delete Account</button>
      </div>
    </form>
  );
};

export default EditProfileForm;
