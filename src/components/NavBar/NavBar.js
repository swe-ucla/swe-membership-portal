import { NavLink } from "react-router-dom";
import "./NavBar.css"; // Import the CSS file for styling


const NavBar = ({ isAdmin }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="logo">Logo</div>

        <div className="nav-links">
          <NavLink
            to="/home"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Home
          </NavLink>
          <NavLink
            to="/eventsignin/:eventId"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Event Sign-in
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