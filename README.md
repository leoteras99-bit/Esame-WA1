# Battleship Exam Project

## Server-side

### HTTP APIs
- `POST /api/login`: logs in with Passport local strategy using `username` and `password`.
- `POST /api/logout`: ends the current session.
- `GET /api/session`: returns the current logged-in user or null.
- `GET /api/difficulties`: returns the supported difficulty levels, grid sizes, ship lists, and torpedo counts.
- `POST /api/matches`: creates a new casual or tournament match. Body: `difficulty`, `mode`, optional `tournamentCode`.
- `GET /api/matches/:id`: returns the current public match state.
- `POST /api/matches/:id/shots`: launches a torpedo at `row` and `col`.
- `GET /api/stats`: public leaderboard and per-user statistics.

### Database tables
- `users`: registered users with salted password hashes.
- `tournaments`: tournament codes, difficulty, seed, and creator.
- `matches`: stored matches, current state, result, and timestamps.

## Client-side

### Routes
- `/`: main play screen with match setup and board.
- `/login`: login screen for seeded users.
- `/stats`: public statistics page visible without login.

### Main components
- `App`: top-level shell and route switch.
- `LoginPage`: login form.
- `PlayPage`: match creation and game view.
- `Board`: clickable grid of cells.
- `StatsPage`: public statistics table.

## Overall

### Screenshot
- Match screenshot: add an image from the running app here after capturing a finished or in-progress match.

### Seeded users
- `alice / password`
- `bruno / password`
- `carla / password`

### AI usage
- AI was used to help draft and organize the implementation and documentation. The code was verified by reading the source carefully and checking the app structure against the assignment requirements.