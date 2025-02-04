import React, { useState } from "react";
import { auth, db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";

const EditProfileForm = ({ userDetails, onUpdate }) => {
  const [formData, setFormData] = useState({
    firstName: userDetails?.firstName || "",
    lastName: userDetails?.lastName || "",
    year: userDetails?.year || "",
    major: userDetails?.major || "",
    memberId: userDetails?.memberId || "",
    bio: userDetails?.bio || "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "Users", user.uid);
        await updateDoc(userRef, formData);
        onUpdate(formData); // Update profile details in the Profile component
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="edit-profile-form">
      <label>
        First Name:
        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
      </label>

      <label>
        Last Name:
        <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
      </label>

      <label>
        Year*:
        <input type="text" name="year" value={formData.year} onChange={handleChange} required />
      </label>

      <label>
        Major*:
        <input type="text" name="major" value={formData.major} onChange={handleChange} required />
      </label>

      <label>
        Member ID:
        <input type="text" name="memberId" value={formData.memberId} onChange={handleChange} />
      </label>

      <label>
        Bio:
        <textarea name="bio" value={formData.bio} onChange={handleChange} />
      </label>

      <button type="submit">Save Changes</button>
    </form>
  );
};

export default EditProfileForm;
