import { NavLink } from "react-router-dom";
import "./NavBar.css";
import SWELogo from "./SWE_Logo.png"; // Import the SWE logo

const NavBar = ({ isAdmin }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="logo">
          <img src={SWELogo} alt="SWE UCLA Logo" className="logo-image" />
        </div>
        
        <div className="nav-links">
          <NavLink
            to="/home"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Home
          </NavLink>
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
          {isAdmin && (
            <NavLink
              to="/add"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Event Creation (admin only)
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;