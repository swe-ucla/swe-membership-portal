export const EVENT_TYPES = [
  "Professional Development",
  "Industry and Career",
  "Academic",
  "Community and Outreach",
  "Advocacy and Leadership",
  "Social",
  "Other",
];

export const COMMITTEES = [
  "Evening with Industry",
  "Dev",
  "Technical",
  "Lobbying",
  "Outreach",
  "Internal Affairs",
  "Advocacy",
  "Mentorship",
  "General",
];

export const getEventType = (event) => event?.eventType || "";

export const getCommittee = (event) => event?.createdBy || "";
