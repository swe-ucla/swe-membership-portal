import { NavLink } from "react-router-dom";
import "./NavBar.css";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const NavBar = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const auth = getAuth();

  useEffect(() => {
    const fetchUserData = async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const userRef = doc(db, "Users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setIsAdmin(userData.isAdmin || false);
      }

      setUser(currentUser);
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      fetchUserData(currentUser);
    });

    return () => unsubscribe();
  }, [auth]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const closeMenu = (e) => {
      if (
        !e.target.closest(".navbar-container") &&
        !e.target.closest(".hamburger")
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  if (loading || !user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="logo">
          <NavLink to="/upcoming">
            <img
              src={process.env.PUBLIC_URL + "/assets/SWE Logo SVG.svg"}
              alt="SWE UCLA Logo"
              className="logo-image"
            />
          </NavLink>
        </div>

        {/* Hamburger */}
        <div className="hamburger" onClick={toggleMenu}>
          <span className={`bar ${isMenuOpen ? "open" : ""}`}></span>
          <span className={`bar ${isMenuOpen ? "open" : ""}`}></span>
          <span className={`bar ${isMenuOpen ? "open" : ""}`}></span>
        </div>

        {/* Nav Links */}
        <div className={`nav-links ${isMenuOpen ? "active" : ""}`}>
          <NavLink
            to="/upcoming"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setIsMenuOpen(false)}
          >
            Upcoming Events
          </NavLink>
          <NavLink
            to="/leaderboard"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setIsMenuOpen(false)}
          >
            Leaderboard
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setIsMenuOpen(false)}
          >
            Profile
          </NavLink>
          <NavLink
            to="/contactus"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setIsMenuOpen(false)}
          >
            Contact Us
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/manageevents"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setIsMenuOpen(false)}
            >
              Admin Only
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
