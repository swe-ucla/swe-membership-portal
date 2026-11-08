export const GRADUATION_QUARTERS = ["Fall", "Winter", "Spring", "Summer"];

// rough estimate of the end of each quarter
const QUARTER_END = {
  Winter: { yearOffset: 0, month: 3 }, // april 1
  Spring: { yearOffset: 0, month: 6 }, // july 1
  Summer: { yearOffset: 0, month: 9 }, // october 1
  Fall: { yearOffset: 1, month: 0 }, // january 1 of the next year
};

// curr year through six years out
export const getGraduationYearOptions = (savedYear) => {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => thisYear + i);
  const saved = Number(savedYear);
  if (saved && !years.includes(saved)) years.unshift(saved);
  return years;
};

// missing info = active
export const isActiveMember = (user, now = new Date()) => {
  const quarterEnd = QUARTER_END[user?.graduationQuarter];
  const year = Number(user?.graduationYear);
  if (!quarterEnd || !year) return true;
  return now < new Date(year + quarterEnd.yearOffset, quarterEnd.month, 1);
};
