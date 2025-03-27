import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./Leaderboard.css"; 

function Leaderboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
      }
    });
  };

  const fetchLeaderboardData = async () => {
    try {
      // get the top 10 users ordered by swePoints in descending order
      const leaderboardQuery = query(
        collection(db, "Users"),
        orderBy("swePoints", "desc"),
        limit(10)
      );

      const querySnapshot = await getDocs(leaderboardQuery);

      const leaderboardData = querySnapshot.docs.map((doc, index) => {
        const userData = doc.data();
        
        // create full name from firstName and lastName
        let fullName = "";
        if (userData.firstName && userData.lastName) {
          fullName = `${userData.firstName} ${userData.lastName}`;
        } else if (userData.firstName) {
          fullName = userData.firstName;
        } else if (userData.lastName) {
          fullName = userData.lastName;
        } else if (userData.username) {
          fullName = userData.username;
        } else {
          fullName = "Anonymous User";
        }

        return {
          id: doc.id,
          rank: index + 1,
          fullName: fullName,
          points: userData.swePoints || 0,
          ...userData,
        };
      });

      setUsers(leaderboardData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching leaderboard data:", err);
      setError("Failed to load leaderboard data. Please try again later.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchLeaderboardData();
  }, []);

  if (loading) {
    return <div>Loading leaderboard data...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="leaderboard-container">
      <h1 className="leaderboard-title">Leaderboard</h1>

      {users.length === 0 ? (
        <p>
          No users found on the leaderboard yet.
        </p>
      ) : (
        <div className="leaderboard-table-container">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="table-header">Rank</th>
                <th className="table-header">User</th>
                <th className="table-header">Points</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={
                    user.id === auth.currentUser?.uid ? "current-user-row" : ""
                  }
                >
                  <td className="table-cell rank-cell">
                    {user.rank <= 3 ? (
                      <span className={`top-rank rank-${user.rank}`}>
                        {user.rank}
                      </span>
                    ) : (
                      <span className="normal-rank">{user.rank}</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="user-info">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt=""
                          className="user-avatar"
                        />
                      ) : (
                        <div className="default-avatar">
                          <span>
                            {user.firstName?.charAt(0) ||
                              user.lastName?.charAt(0) ||
                              "U"}
                          </span>
                        </div>
                      )}
                      <div className="user-details">
                        <div className="username">
                          {user.fullName}{" "}
                          {user.id === auth.currentUser?.uid && (
                            <span className="current-user-label"> (You)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell points-cell">
                    {user.points.toLocaleString()} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
