import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./Leaderboard.css";

function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

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
        if (!uniqueUsers.has(userKey) || userData.swePoints > uniqueUsers.get(userKey).swePoints) {
          uniqueUsers.set(userKey, {
            id: doc.id,
            ...userData
          });
        }
      });
      
      // Convert the Map to an array and assign ranks
      let currentRank = 1;
      let prevPoints = null;
      let offset = 0;

      const usersList = Array.from(uniqueUsers.values())
        .sort((a, b) => b.swePoints - a.swePoints)
        .map((user, index, arr) => {
          if (user.swePoints !== prevPoints) {
            currentRank = index + 1;
          } else {
            offset++;
          }
          prevPoints = user.swePoints;
          return {
            ...user,
            rank: currentRank
          };
        });


      
      // Slice to get top 10
      setUsers(usersList.slice(0, 10));
      
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

  return (
    <div className="leaderboard-container">
      <h1 className="leaderboard-title">SWE Points Leaderboard</h1>
      
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
            <div className="points-column"># Points</div>
          </div>
          
          {users.map((user) => (
            <div 
              key={user.id} 
              className={`leaderboard-row ${currentUser && user.id === currentUser.uid ? 'highlighted-row' : ''}`}
            >
              <div className="rank-column">
                <span className="rank-number">{user.rank}</span>
              </div>
              <div className="name-column">
                <div className="user-avatar">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt={`${user.firstName}'s avatar`} />
                  ) : (
                    <span className="avatar-initials">
                      {user.firstName?.charAt(0) || ''}
                      {user.lastName?.charAt(0) || ''}
                    </span>
                  )}
                </div>
                <div className="user-details">
                  <span className="user-name">{user.firstName} {user.lastName}</span>
                  {user.major && <span className="user-major">{user.major}</span>}
                </div>
              </div>
              <div className="points-column">
                <span className="points-value">{user.swePoints || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Leaderboard;