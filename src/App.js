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
import SignUp from "./components/Login/Register";
import Profile from "./components/Profile/Profile";
import Home from "./components/Home/Home";
import AddEvent from "./components/AddEvent/AddEvent";
import UpcomingEvents from "./components/UpcomingEvents/UpcomingEvents";
import EventSignin from "./components/EventSignin/EventSignin";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SignUp />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/home" element={<Home />} />
          <Route path="/add" element={<AddEvent />} />
          <Route path="/upcoming" element={<UpcomingEvents />} />
          <Route path="/eventsignin/:eventId" element={<EventSignin />} />
        </Routes>
        {/* <ToastContainer /> */}
      </div>
    </Router>
  );
}

export default App;
