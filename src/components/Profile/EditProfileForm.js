import React, { useState } from "react";
import { auth, db } from "../firebase"; 
import { doc, updateDoc } from "firebase/firestore";
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
  "Undergraduate Students:",
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate Students:",
  "First-year graduate student",
  "Second-year graduate student",
  "Third-year graduate student",
  "Fourth-year graduate student and beyond",
  "Other"
];

const EditProfileForm = ({ userDetails, onUpdate }) => {
  const [formData, setFormData] = useState({
    profilePicture: userDetails?.profilePicture || "",
    firstName: userDetails?.firstName || "",
    lastName: userDetails?.lastName || "",
    year: userDetails?.year || "",
    major: userDetails?.major || "",
    memberId: userDetails?.memberId || "",
    bio: userDetails?.bio || "",
    swePoints: userDetails?.swePoints || "",
  });

  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
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

    const newErrors = {
      firstName: validateField("First Name", formData.firstName),
      lastName: validateField("Last Name", formData.lastName),
      year: validateField("Year", formData.year),
      major: validateField("Major", formData.major),
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

      const userRef = doc(db, "Users", user.uid);
      await updateDoc(userRef, updatedFormData);
      console.log("Profile updated successfully.");
      onUpdate(updatedFormData);
    } catch (error) {
      console.error("Error updating profile:", error);
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
        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={errors.firstName ? "input-error" : ""} />
        {errors.firstName && <span className="error-message">{errors.firstName}</span>}
      </div>

      <div className="form-group">
        <label>Last Name <span style={{ color: "red" }}>*</span>:</label>
        <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={errors.lastName ? "input-error" : ""} />
        {errors.lastName && <span className="error-message">{errors.lastName}</span>}
      </div>

      <div className="form-group">
        <label>Year <span style={{ color: "red" }}>*</span>:</label>
        <select name="year" value={formData.year} onChange={handleChange} className={errors.year ? "input-error" : ""}>
          {yearOptions.map((option, index) => (
            <option key={index} value={option}>{option}</option>
          ))}
        </select>
        {errors.year && <span className="error-message">{errors.year}</span>}
      </div>

      <div className="form-group">
        <label>Major <span style={{ color: "red" }}>*</span>:</label>
        <select name="major" value={formData.major} onChange={handleChange} className={errors.major ? "input-error" : ""}>
          {majorOptions.map((option, index) => (
            <option key={index} value={option}>{option}</option>
          ))}
        </select>
        {errors.major && <span className="error-message">{errors.major}</span>}
      </div>

      <div className="form-group">
        <label>Member ID:</label>
        <input type="text" name="memberId" value={formData.memberId} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Bio:</label>
        <textarea name="bio" value={formData.bio} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>#SWE Points:</label>
        <input type="text" name="swePoints" value={formData.swePoints} onChange={handleChange} />
      </div>

      <div className="button-group">
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </div>
    </form>
  );
};

export default EditProfileForm;
