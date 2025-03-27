import React, { useEffect, useState } from "react";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

import Login from "./components/Login/Login";
import Register from "./components/Login/Register";
import Profile from "./components/Profile/Profile";
import Home from "./components/Home/Home";
import AddEvent from "./components/AddEvent/AddEvent";
import UpcomingEvents from "./components/UpcomingEvents/UpcomingEvents";
import EventSignin from "./components/EventSignin/EventSignin";
import NavBar from "./components/NavBar/NavBar";
import Leaderboard from "./components/Leaderboard/Leaderboard";
import ManageEvents from "./components/ManageEvents/ManageEvents";

function App() {
  // TODO: Fetch this from user authentication logic! Need to implement admin checking logic 
  // this is for admin-only Event Creatioon page

  return (
    <Router>
      <div className="App">
        <NavBar />
        <Routes>
          <Route path="/" element={<UpcomingEvents />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/home" element={<Home />} />
          <Route path="/addevent" element={<AddEvent />} />
          <Route path="/upcoming" element={<UpcomingEvents />} />
          <Route path="/manageevents" element={<ManageEvents />} />
          <Route path="/eventsignin/:eventID" element={<EventSignin />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
        {/* <ToastContainer /> */}
      </div>
    </Router>
  );
}

export default App;
