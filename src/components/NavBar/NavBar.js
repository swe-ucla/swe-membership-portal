import { NavLink } from "react-router-dom";
import "./NavBar.css";
import SWELogo from "./SWE_Logo.png"; // Import the SWE logo
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
      if (!e.target.closest(".navbar-container")) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  // checking authentication state
  if (loading || !user) return null;
  // if no user is logged in, redirect to login page
  // if (!user) {
  //   return <Navigate to="/login" />;
  // }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="logo">
          <NavLink to="/upcoming">
            <img src={SWELogo} alt="SWE UCLA Logo" className="logo-image" />
          </NavLink>
        </div>

        <div className={`nav-links ${isMenuOpen ? "active" : ""}`}>
          {/* <NavLink
            to="/home"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setIsMenuOpen(false)}
          >
            Home
          </NavLink> */}
          <div className="nav-links">
            {/* <NavLink
              to="/home"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Home
            </NavLink> */}
            <NavLink
              to="/upcoming"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Upcoming Events
            </NavLink>
            <NavLink
              to="/leaderboard"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Leaderboard
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Profile
            </NavLink>
            <NavLink
              to="/contactus"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Contact Us
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/manageevents"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Admin Only
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};


export default NavBar;