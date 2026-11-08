import React, { useCallback, useState } from "react";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { format } from "date-fns";
import { saveAs } from "file-saver";
import { db } from "../firebase";
import Popup from "../Popup/Popup";
import {
  buildResetCsv,
  calculateResetRows,
  parseCutoffDate,
} from "../../utils/leaderboardReset";
import "./LeaderboardReset.css";

// Firestore allows at most 500 writes in one batch
const BATCH_SIZE = 500;

const fetchResetRows = async (cutoff) => {
  const usersSnapshot = await getDocs(collection(db, "Users"));
  const users = usersSnapshot.docs.map((userDoc) => ({
    id: userDoc.id,
    ...userDoc.data(),
  }));

  let events = [];
  if (cutoff) {
    const eventsSnapshot = await getDocs(collection(db, "events"));
    events = eventsSnapshot.docs.map((eventDoc) => ({
      id: eventDoc.id,
      points: eventDoc.data().points,
      date: eventDoc.data().date?.toDate() || null,
    }));
  }

  return calculateResetRows(users, events, cutoff);
};

const downloadCsv = (rows, name) => {
  const blob = new Blob([buildResetCsv(rows)], {
    type: "text/csv;charset=utf-8;",
  });
  saveAs(blob, `${name}-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`);
};

const LeaderboardReset = () => {
  const [cutoffValue, setCutoffValue] = useState("");
  const [summary, setSummary] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [popup, setPopup] = useState({
    isOpen: false,
    message: "",
    toast: false,
    confirm: false,
    confirmText: "Confirm",
    onConfirm: null,
  });

  const handlePopupClose = useCallback(() => {
    setPopup({
      isOpen: false,
      message: "",
      toast: false,
      confirm: false,
      onConfirm: null,
    });
  }, []);

  const showMessage = (message) => {
    setPopup({ isOpen: true, message, toast: false, confirm: false });
  };

  const summarize = (rows) => ({
    members: rows.length,
    currentPoints: rows.reduce((total, row) => total + row.currentPoints, 0),
    newPoints: rows.reduce((total, row) => total + row.newPoints, 0),
  });

  const handleCutoffChange = (e) => {
    setCutoffValue(e.target.value);
    setSummary(null);
  };

  const performReset = async () => {
    handlePopupClose();
    setIsWorking(true);

    let updated = 0;
    let total = 0;
    try {
      // Read again so the reset and its backup use the latest points, not the confirm popup's
      const rows = await fetchResetRows(parseCutoffDate(cutoffValue));
      total = rows.length;
      downloadCsv(rows, "leaderboard-reset-backup");

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((row) => {
          batch.update(doc(db, "Users", row.id), {
            swePoints: row.newPoints,
            rank: row.newRank,
          });
        });
        await batch.commit();
        updated += chunk.length;
      }

      setSummary(null);
      showMessage(`Leaderboard reset. Updated ${updated} members.`);
    } catch (error) {
      console.error("Error resetting leaderboard:", error);
      showMessage(
        `The reset stopped after updating ${updated} of ${total} members. ` +
          "You can run it again with the same date, but keep the first backup " +
          "CSV, because it is the only one with everyone's original points."
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleResetClick = async () => {
    setIsWorking(true);
    try {
      const rows = await fetchResetRows(parseCutoffDate(cutoffValue));
      setSummary(summarize(rows));
      const outcome = cutoffValue
        ? `recalculate points from events since ${cutoffValue} for`
        : "set points to 0 for";
      setPopup({
        isOpen: true,
        message:
          `This will ${outcome} all ${rows.length} members in ` +
          `${db.app.options.projectId}. A backup CSV downloads first, ` +
          "but this can't be undone from the portal.",
        toast: false,
        confirm: true,
        confirmText: "Reset Leaderboard",
        onConfirm: performReset,
      });
    } catch (error) {
      console.error("Error preparing leaderboard reset:", error);
      showMessage("Failed to load members. Nothing was changed.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="leaderboard-reset">
      <h3 className="leaderboard-reset-title">Yearly Leaderboard Reset</h3>
      <p className="leaderboard-reset-text">
        Resets SWE points for every member. Attendance history is kept, so
        members can't sign in to the same event twice.
      </p>

      <label className="leaderboard-reset-label" htmlFor="reset-cutoff">
        Keep points from events since (optional)
      </label>
      <input
        id="reset-cutoff"
        type="date"
        className="leaderboard-reset-date"
        value={cutoffValue}
        max={format(new Date(), "yyyy-MM-dd")}
        onChange={handleCutoffChange}
        disabled={isWorking}
      />
      <p className="leaderboard-reset-hint">
        {cutoffValue
          ? "Points are recalculated from attended events on or after this date. Welcome points and deleted events aren't counted."
          : "With no date, everyone goes to 0."}
      </p>

      {summary && (
        <p className="leaderboard-reset-summary">
          {summary.members} members: {summary.currentPoints} total points now,{" "}
          {summary.newPoints} after the reset.
        </p>
      )}

      <div className="leaderboard-reset-actions">
        <button
          className="leaderboard-reset-submit"
          onClick={handleResetClick}
          disabled={isWorking}
        >
          {isWorking ? "Working..." : "Reset Leaderboard"}
        </button>
      </div>

      <Popup
        isOpen={popup.isOpen}
        message={popup.message}
        toast={popup.toast}
        confirm={popup.confirm}
        confirmText={popup.confirmText}
        onConfirm={popup.onConfirm}
        onClose={handlePopupClose}
        className={popup.confirm ? "manage-events-confirm-popup" : ""}
      />
    </div>
  );
};

export default LeaderboardReset;
