# SWE Membership Portal

A web app for [Society of Women Engineers (SWE) at UCLA](https://ucla.swe.org/) members to browse events, RSVP, check in, earn SWE points, and compete on a leaderboard. Admins can create and manage events, generate sign-in QR codes, and export attendance data.

Built with React and Firebase by the Dev Committee.

## Features

### For members

- **Sign in / register** with a UCLA email (`@ucla.edu` or `@g.ucla.edu`) via email/password or Google
- **Browse upcoming events** with filters by event type and committee
- **RSVP** to events and view event details
- Add events to your **Google Calendar**
- **Check in** at events using an attendance code or QR sign-in link
- **Earn SWE points** for attending events and rise in the **Leaderboard**
- **Profile** with editable info, profile photo, and social links
- **Contact us** form for any concerns

### For admins

- **Create and edit events** (date, time, location, description, image, sign-in questions, attendance code)
- **Manage events** — view upcoming and past events, delete events, and export attendee/RSVP CSVs
- **Generate QR codes** for event sign-in pages
- **Google Calendar integration** when creating events

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, React Router, Bootstrap, MUI |
| Backend | Firebase Authentication, Cloud Firestore |
| Media | Cloudinary (event images) |
| Email | EmailJS (contact form) |
| Build | Create React App + CRACO |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- Access to the `swe-membership-portal` Firebase project (for local development)
- A UCLA email for signing in

## Getting started

1. **Clone the repository**

   ```bash
   git clone https://github.com/<org>/swe-membership-portal.git
   cd swe-membership-portal
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm start
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

4. **Sign in** with a UCLA account to access member features.

## Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Run the app in development mode |
| `npm run build` | Create a production build (via CRACO) |
| `npm test` | Run the test runner in watch mode |
| `npm run lint` | Lint `src/` with ESLint |
| `npm run lint:fix` | Lint and auto-fix where possible |

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

## Routes

| Path | Page | Access |
| --- | --- | --- |
| `/` | Upcoming Events | Authenticated |
| `/upcoming` | Upcoming Events | Authenticated |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/profile` | Profile | Authenticated |
| `/leaderboard` | Leaderboard | Authenticated |
| `/contactus` | Contact Us | Authenticated |
| `/addevent` | Add / Edit Event | Admin |
| `/manageevents` | Manage Events | Admin |
| `/eventsignin/:eventID` | Event Sign-In | Authenticated |

## Project structure

```
src/
├── components/
│   ├── AddEvent/          # Create and edit events
│   ├── ContactUs/         # Contact form
│   ├── EventSignin/       # Attendance check-in
│   ├── Leaderboard/       # SWE points rankings
│   ├── ManageEvents/      # Admin event management
│   ├── NavBar/            # Top navigation
│   ├── Onboarding/        # Login, register, password reset
│   ├── Profile/           # User profile and editing
│   ├── UpcomingEvents/    # Event listing, RSVP, filters
│   └── firebase.js        # Firebase initialization
├── constants/
│   └── eventTypes.js      # Event types and committees
├── styles/                # Shared CSS (variables, buttons, forms)
└── App.js                 # Route definitions
```

## Firebase data model

The app uses two main Firestore collections:

- **`Users`** — profile info, `swePoints`, `attendedEvents`, `rsvpEvents`, `isAdmin`
- **`events`** — event details, `attendees`, `rsvpAttendees`, `attendanceCode`, sign-in `questions`

Authentication is handled through Firebase Auth. Firebase config lives in `src/components/firebase.js`.

## Event types and committees

Event types and committees are defined in `src/constants/eventTypes.js`:

- **Event types:** Professional Development, Industry and Career, Academic, Community and Outreach, Advocacy and Leadership, Social, Other
- **Committees:** Evening with Industry, Dev, Technical, Lobbying, Outreach, Internal Affairs, Advocacy, Mentorship, General

## Contributing

1. Create a branch from `main`
2. Make your changes
3. Run `npm run lint` and `npm run build`
4. Open a pull request using the [PR template](.github/pull_request_template.md)

Link your PR to the relevant issue and confirm there are no merge conflicts with `main`.

## Acknowledgments

Authentication patterns were adapted from [Login-Auth-Firebase-ReactJS](https://github.com/the-debug-arena/Login-Auth-Firebase-ReactJS).
