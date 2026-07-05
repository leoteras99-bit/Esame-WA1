import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { randomBytes } from 'node:crypto';
import {
  createStoredMatch,
  createTournament,
  getMatch,
  getPublicStats,
  getTournament,
  getUserById,
  getUserByUsername,
  initializeDatabase,
  updateMatch,
  verifyPassword,
} from './dao.js';
import {
  createMatchState,
  getDifficulties,
  launchTorpedo,
  normalizeDifficulty,
  publicMatch,
} from './game.js';
//import {match} from './models.js';

const app = express();
const PORT = 3001;
const CLIENT_ORIGIN = 'http://localhost:5173';

initializeDatabase();

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(session({
  secret: 'battleship-exam-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy((username, password, done) => {
  try {
    const user = getUserByUsername(username);
    if (!user || !verifyPassword(password, user)) {
      return done(null, false, { message: 'Invalid username or password' });
    }
    return done(null, { id: user.id, username: user.username, name: user.name });
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = getUserById(id);
  done(null, user ?? false);
});

function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Login required' });
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function makeCode() {
  return randomBytes(3).toString('hex').toUpperCase();
}

function rememberMatch(req, match) {
  req.session.matches ??= {};
  req.session.matches[match.id] = match;
}

function loadMatchForRequest(req, id) {
  /*if (String(id).startsWith('anon-')) {
    return req.session.anonymousMatches?.[id] ?? null;
  }*/
  //completare la gestione del match in sessione e non più in db
 /*const match = getMatch(id);
  if (!match) return null;
  if (match.user_id && (!req.user || match.user_id !== req.user.id)) return 'forbidden';
  return match;*/
    return req.session.matches?.[id] ?? null;
}

function saveMatchForRequest(req, match) {
  /*if (String(match.id).startsWith('anon-')) {
    rememberAnonymousMatch(req, match);
  } else {
    //completare la gestione del match in sessione e non più in db
    //updateMatch(match.id, match.state);
  }*/
  rememberMatch(req, match);
}

app.get('/api/session', (req, res) => {
  res.json({ user: req.user ?? null });
});

app.post('/api/login', passport.authenticate('local'), (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/logout', (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy(() => res.status(204).end());
  });
});

app.get('/api/difficulties', (req, res) => {
  res.json(getDifficulties());
});

app.get('/api/stats', (req, res) => {
  res.json(getPublicStats());
});

app.post('/api/matches', asyncHandler(async (req, res) => {
  const { difficulty, mode = 'casual', tournamentCode } = req.body;
  const validDifficulty = normalizeDifficulty(difficulty);

  if (!['casual', 'tournament'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid match mode' });
  }

  if (mode === 'tournament' && !req.user) {
    return res.status(401).json({ error: 'Tournament mode requires login' });
  }

  let state;
  let code = null;

  if (mode === 'tournament') {
    if (tournamentCode) {
      const tournament = getTournament(String(tournamentCode).trim().toUpperCase());
      if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
      state = createMatchState(tournament.difficulty, tournament.seed);
      code = tournament.code;
    } else {
      code = makeCode();
      const seed = randomBytes(8).toString('hex');
      createTournament({ code, difficulty: validDifficulty, seed, createdBy: req.user.id });
      state = createMatchState(validDifficulty, seed);
    }
  } else {
    state = createMatchState(validDifficulty);
  }

  if (req.user) {
      const id = createStoredMatch({
      userId: req.user.id,
      mode,
      difficulty: state.difficulty,
      tournamentCode: code,
      state,
    });
    const match = { id, userId: req.user.id, mode, tournamentCode: code, state };
    rememberMatch(req, match);
    return res.status(201).json(publicMatch(match));
  }

  const match = { id: 'anon-' + randomBytes(8).toString('hex'), mode, tournamentCode: null, state };
  rememberMatch(req, match);
  return res.status(201).json(publicMatch(match));
}));

app.get('/api/matches/:id', (req, res) => {
  const match = loadMatchForRequest(req, req.params.id);
  if (match === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(publicMatch(match));
});

app.post('/api/matches/:id/shots', (req, res) => {
  const match = loadMatchForRequest(req, req.params.id);
  if (match === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const row = Number(req.body.row);
  const col = Number(req.body.col);
  const result = launchTorpedo(match.state, row, col);
  if (result.status != "playing" && req.user){
    updateMatch(match.id, match.state);
  }
  saveMatchForRequest(req, match);
  res.json({ ...result, match: publicMatch(match) });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(400).json({ error: error.message || 'Unexpected error' });
});

app.listen(PORT, () => {
  console.log(`Battleship API listening on http://localhost:${PORT}`);
});
