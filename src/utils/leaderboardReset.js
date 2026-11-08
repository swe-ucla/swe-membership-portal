// Parse a YYYY-MM-DD date input as local midnight (new Date(string) would use UTC)
export const parseCutoffDate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Work out each member's new points and rank without changing anything.
// With no cutoff everyone goes to 0, otherwise points are rebuilt from the
// attended events on or after the cutoff. Events are { id, date, points }.
export const calculateResetRows = (users, events, cutoff) => {
  const eventsById = new Map(events.map((event) => [event.id, event]));

  const rows = users.map((user) => {
    const newPoints = cutoff
      ? (user.attendedEvents || []).reduce((total, eventId) => {
          const event = eventsById.get(eventId);
          if (!event || !event.date || event.date < cutoff) return total;
          return total + (Number(event.points) || 0);
        }, 0)
      : 0;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      currentPoints: Number(user.swePoints) || 0,
      currentRank: user.rank,
      newPoints,
    };
  });

  rows.sort((a, b) => b.newPoints - a.newPoints);

  // Ties share a rank and the next rank continues without skipping, like Leaderboard.js
  let newRank = 0;
  let prevPoints = null;
  return rows.map((row) => {
    if (row.newPoints !== prevPoints) {
      newRank++;
      prevPoints = row.newPoints;
    }
    return { ...row, newRank };
  });
};

const escapeCSVValue = (value) => {
  if (value === undefined || value === null) return "";
  let strValue = value.toString();
  // Stop spreadsheets from running names and emails as formulas
  if (/^[=+\-@]/.test(strValue)) strValue = `'${strValue}`;
  return /[",\n]/.test(strValue)
    ? `"${strValue.replace(/"/g, '""')}"`
    : strValue;
};

export const buildResetCsv = (rows) => {
  const headers = [
    "User ID",
    "Email",
    "First Name",
    "Last Name",
    "Current Points",
    "Current Rank",
    "New Points",
    "New Rank",
  ];

  const csvRows = rows.map((row) =>
    [
      row.id,
      row.email,
      row.firstName,
      row.lastName,
      row.currentPoints,
      row.currentRank,
      row.newPoints,
      row.newRank,
    ]
      .map(escapeCSVValue)
      .join(",")
  );

  return [headers.join(","), ...csvRows].join("\n");
};
