import React from "react";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// import Login from "./components/Login/Login";
// import Register from "./components/Login/Register";
import Profile from "./components/Profile/Profile";
import Home from "./components/Home/Home";
import AddEvent from "./components/AddEvent/AddEvent";
import UpcomingEvents from "./components/UpcomingEvents/UpcomingEvents";
import EventSignin from "./components/EventSignin/EventSignin";
import NavBar from "./components/NavBar/NavBar";
import Leaderboard from "./components/Leaderboard/Leaderboard";
import ManageEvents from "./components/ManageEvents/ManageEvents";
import ContactUs from "./components/ContactUs/ContactUs"
import Onboarding from "./components/Onboarding/Onboarding";

// 🧠 A wrapper component to access `useLocation`
function AppWrapper() {
  const location = useLocation();
  const hideNavRoutes = ["/login", "/register"];
  const hideNavBar = hideNavRoutes.includes(location.pathname);

  return (
    <div className="App">
      {!hideNavBar && <NavBar />}
      <Routes>
        <Route path="/" element={<UpcomingEvents />} />
        <Route path="/login" element={<Onboarding />} />
        <Route path="/register" element={<Onboarding />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/home" element={<Home />} />
        <Route path="/addevent" element={<AddEvent />} />
        <Route path="/upcoming" element={<UpcomingEvents />} />
        <Route path="/manageevents" element={<ManageEvents />} />
        <Route path="/eventsignin/:eventID" element={<EventSignin />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/contactus" element={<ContactUs />} />
      </Routes>
      {/* <ToastContainer /> */}
    </div>
  );
}

// Wrap the actual router
function App() {
  return (
    <Router>
      <AppWrapper />
    </Router>
  );
}

export default App;
