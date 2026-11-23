export function buildRsvpPath(eventId) {
  return `/upcoming?rsvp=${encodeURIComponent(eventId)}`;
}

export function buildRsvpUrl(eventId) {
  return `${window.location.origin}${buildRsvpPath(eventId)}`;
}
