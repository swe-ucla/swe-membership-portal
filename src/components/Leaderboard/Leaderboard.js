import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./Leaderboard.css";
import goldMedal from "../../assets/leaderboard-gold-medal.svg";
import silverMedal from "../../assets/leaderboard-silver-medal.svg";
import bronzeMedal from "../../assets/leaderboard-bronze-medal.svg";

function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const rankLimit = 8;

  // Fetch authenticated user
  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
      } else {
        setCurrentUser(user);
      }
    });
  };

  // Fetch users ordered by SWE points
  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, "Users");
      const q = query(usersRef, orderBy("swePoints", "desc"));
      const querySnapshot = await getDocs(q);

      // Process users to eliminate duplicates - keep only highest score entry for each user
      const uniqueUsers = new Map();

      querySnapshot.docs.forEach((doc) => {
        const userData = doc.data();
        const userKey = `${userData.firstName}-${userData.lastName}`;

        // Only add the user if they haven't been added yet or if they have a higher score
        if (
          !uniqueUsers.has(userKey) ||
          userData.swePoints > uniqueUsers.get(userKey).swePoints
        ) {
          uniqueUsers.set(userKey, {
            id: doc.id,
            ...userData,
          });
        }
      });

      // Convert the Map to an array and assign ranks based on points
      const usersList = Array.from(uniqueUsers.values())
        .sort((a, b) => b.swePoints - a.swePoints);

      // Assign ranks sequentially - ties get same rank, next rank continues without skipping
      let currentRank = 1;
      let prevPoints = null;
      let rankCounter = 1;

      const rankedUsersList = usersList.map((user, index) => {
        // If this is a new point value, assign the next sequential rank
        if (prevPoints === null || user.swePoints !== prevPoints) {
          currentRank = rankCounter;
          rankCounter++;
          prevPoints = user.swePoints;
        }
        // If same points as previous user, keep the same rank (tie)

        // Update user rank in Firestore if changed
        if (user.rank !== currentRank) {
          updateDoc(doc(db, "Users", user.id), { rank: currentRank }).catch(
            console.error
          );
        }

        return {
          ...user,
          rank: currentRank,
        };
      });

      // Store all users for reference
      setAllUsers(rankedUsersList);

      // Find current user's rank
      const currentUserData = rankedUsersList.find(
        (user) => user.id === currentUser.uid
      );
      if (currentUserData) {
        setCurrentUserRank(currentUserData.rank);
      }

      // Get top users
      // Render top 6 + your rank, else top 8 if within top 8
      let topUsers;
      if (currentUserData && currentUserData.rank <= 8) {
        topUsers = usersList.slice(0, 8);
      } else {
        // Otherwise, show top 6
        topUsers = usersList.slice(0, 6);
      }
      setUsers(topUsers);
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchLeaderboardData();
    }
  }, [currentUser]);

  // Render medal or rank number
  const renderRank = (rank) => {
    if (rank === 1) {
      return <img src={goldMedal} alt="Gold Medal" className="medal-icon" />;
    } else if (rank === 2) {
      return (
        <img src={silverMedal} alt="Silver Medal" className="medal-icon" />
      );
    } else if (rank === 3) {
      return (
        <img src={bronzeMedal} alt="Bronze Medal" className="medal-icon" />
      );
    } else {
      return <span className="rank-number">{rank}</span>;
    }
  };

  // Render user row
  const renderUserRow = (user) => (
    <div
      key={user.id}
      className={`leaderboard-row ${
        currentUser && user.id === currentUser.uid ? "highlighted-row" : ""
      }`}
    >
      <div className="rank-column">{renderRank(user.rank)}</div>
      <div className="name-column">
        <div className="user-avatar">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={`${user.firstName}'s avatar`} />
          ) : (
            <span className="avatar-initials">
              {user.firstName?.charAt(0) || ""}
              {user.lastName?.charAt(0) || ""}
            </span>
          )}
        </div>
        <div className="user-details">
          <span className="user-name">
            {user.firstName} {user.lastName}
          </span>
          {user.major && <span className="user-major">{user.major}</span>}
        </div>
      </div>
      <div className="points-column">
        <span className="points-value">{user.swePoints || 0}</span>
      </div>
    </div>
  );

  return (
    <div className="leaderboard-background-container">
      <div className="leaderboard-container">
        {/*<h1 className="leaderboard-title">SWE Points Leaderboard</h1>*/}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        ) : (
          <div className="leaderboard-table">
            <div className="leaderboard-header">
              <div className="rank-column">Rank</div>
              <div className="name-column"></div>
              <div className="points-column">Points</div>
            </div>
            <div className="leaderboard-header-divider"></div>

            {/* Render top 6-8 users */}
            {users.map((user) => renderUserRow(user))}

            {/* Show current user's position if not within displayed users */}
            {currentUserRank && !users.find(user => user.id === currentUser.uid) && (
              <>
                {/* Only show ellipsis if there's more than 1 person between last displayed and current user */}
                {(() => {
                  const lastDisplayedRank = users[users.length - 1]?.rank;
                  const currentUserData = allUsers.find(user => user.id === currentUser.uid);
                  
                  if (currentUserData) {
                    // Count how many people are between the last displayed user and current user
                    const peopleInBetween = allUsers.filter(user => 
                      user.rank > lastDisplayedRank && user.rank < currentUserRank
                    ).length;
                    
                    if (peopleInBetween > 1) {
                      return (
                        <div className="leaderboard-row ellipsis-row">
                          <div className="ellipsis-container">
                            <span className="ellipsis">•••••</span>
                          </div>
                        </div>
                      );
                    }
                  }
                  return null;
                })()}
                {(() => {
                  // Find current user data from all users
                  const currentUserData = allUsers.find(
                    (user) => user.id === currentUser.uid
                  );
                  if (currentUserData) {
                    return renderUserRow(currentUserData);
                  }
                  return null;
                })()}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
