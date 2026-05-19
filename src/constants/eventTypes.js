export const EVENT_TYPES = [
  "Professional Development",
  "Industry and Career",
  "Academic",
  "Community and Outreach",
  "Advocacy and Leadership",
];

/** Supports legacy events that only have `createdBy` (committee name). */
export const getEventType = (event) =>
  event?.eventType || event?.createdBy || "";
