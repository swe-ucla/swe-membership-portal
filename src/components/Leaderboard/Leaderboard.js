import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Leaderboard() {
  const navigate = useNavigate();
  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
      }
    });
  };
  useEffect(() => {
    fetchUserData();
  }, []);

  return (
    <div>
      <h1>Leaderboard</h1>
    </div>
  );
};

export default Leaderboard;