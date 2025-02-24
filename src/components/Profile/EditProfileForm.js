import React, { useState } from "react";
import { auth, db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./Profile.css";

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
    customYear: "",
    customMajor: "",
  });

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    year: "",
    major: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [showCustomYear, setShowCustomYear] = useState(false);
  const [showCustomMajor, setShowCustomMajor] = useState(false);
  const storage = getStorage();

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

  const validateField = (name, value) => {
    if (!value.trim()) {
      const words = name.split(/(?=[A-Z])/).join(' '); // Split on capital letters
      return `${words} is required`;
    }
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "year") {
      setShowCustomYear(value === "Other");
      if (value !== "Other") {
        setFormData(prev => ({ ...prev, year: value, customYear: "" }));
      }
    } else if (name === "major") {
      setShowCustomMajor(value === "Other");
      if (value !== "Other") {
        setFormData(prev => ({ ...prev, major: value, customMajor: "" }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleCustomChange = (e) => {
    const { name, value } = e.target;
    if (name === "customYear") {
      setFormData(prev => ({ ...prev, year: value, customYear: value }));
    } else if (name === "customMajor") {
      setFormData(prev => ({ ...prev, major: value, customMajor: value }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (["firstName", "lastName", "year", "major"].includes(name)) {
      setErrors({
        ...errors,
        [name]: validateField(name, value)
      });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all required fields
    const newErrors = {
      firstName: validateField("firstName", formData.firstName),
      lastName: validateField("lastName", formData.lastName),
      year: validateField("year", formData.year),
      major: validateField("major", formData.major),
    };

    setErrors(newErrors);

    // Check if there are any errors
    if (Object.values(newErrors).some(error => error !== "")) {
      return;
    }

    const user = auth.currentUser;
    if (user) {
      try {
        if (imageFile) {
          const imageRef = ref(storage, `profilePictures/${user.uid}/${imageFile.name}`);
          const snapshot = await uploadBytes(imageRef, imageFile);
          const downloadURL = await getDownloadURL(snapshot.ref);
          formData.profilePicture = downloadURL;
        }

        const userRef = doc(db, "Users", user.uid);
        await updateDoc(userRef, formData);
        onUpdate(formData);
      } catch (error) {
        console.error("Error updating profile:", error);
      }
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
        <label className="required-field">
          First Name <span style={{ color: "red" }}>*</span>:
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            className={errors.firstName ? "input-error" : ""}
            required
          />
        </label>
        {errors.firstName && <span className="error-message">{errors.firstName}</span>}
      </div>

      <div className="form-group">
        <label className="required-field">
          Last Name <span style={{ color: "red" }}>*</span>:
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            className={errors.lastName ? "input-error" : ""}
            required
          />
        </label>
        {errors.lastName && <span className="error-message">{errors.lastName}</span>}
      </div>

      <div className="form-group">
        <label className="required-field">
          Year <span style={{ color: "red" }}>*</span>:
          <select
            name="year"
            value={showCustomYear ? "Other" : formData.year}
            onChange={handleChange}
            onBlur={handleBlur}
            className={errors.year ? "input-error" : ""}
            required
          >
            <option value="">Select Year</option>
            {yearOptions.map((option, index) => (
              option.includes(":") ? (
                <option key={index} disabled style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                  {option}
                </option>
              ) : (
                <option key={index} value={option}>
                  {option}
                </option>
              )
            ))}
          </select>
          {showCustomYear && (
            <input
              type="text"
              name="customYear"
              value={formData.customYear}
              onChange={handleCustomChange}
              placeholder="Enter your year"
              className={errors.year ? "input-error" : ""}
            />
          )}
        </label>
        {errors.year && <span className="error-message">{errors.year}</span>}
      </div>

      <div className="form-group">
        <label className="required-field">
          Major <span style={{ color: "red" }}>*</span>:
          <select
            name="major"
            value={showCustomMajor ? "Other" : formData.major}
            onChange={handleChange}
            onBlur={handleBlur}
            className={errors.major ? "input-error" : ""}
            required
          >
            <option value="">Select Major</option>
            {majorOptions.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
          {showCustomMajor && (
            <input
              type="text"
              name="customMajor"
              value={formData.customMajor}
              onChange={handleCustomChange}
              placeholder="Enter your major"
              className={errors.major ? "input-error" : ""}
            />
          )}
        </label>
        {errors.major && <span className="error-message">{errors.major}</span>}
      </div>

      <div className="form-group">
        <label>
          Member ID:
          <input
            type="text"
            name="memberId"
            value={formData.memberId}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="form-group">
        <label>
          Bio:
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="form-group">
        <label>
          #SWE Points:
          <input
            type="text"
            name="swePoints"
            value={formData.swePoints}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="button-group">
        <button type="submit" className="btn btn-primary">
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default EditProfileForm;