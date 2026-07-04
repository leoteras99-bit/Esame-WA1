import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'data', 'battleship.sqlite');

mkdirSync(dirname(dbPath), { recursive: true });
const isNewDatabase = !existsSync(dbPath);
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, user) {
  const { hash } = hashPassword(password, user.salt);
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.password_hash, 'hex'));
}

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      code TEXT PRIMARY KEY,
      difficulty TEXT NOT NULL,
      seed TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      mode TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      tournament_code TEXT,
      status TEXT NOT NULL,
      state_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(tournament_code) REFERENCES tournaments(code)
    );
  `);

  const row = db.prepare('SELECT COUNT(*) AS total FROM users').get();
  if (isNewDatabase || row.total === 0) {
    seedDatabase();
  }
}

function seedDatabase() {
  const users = [
    ['alice', 'Alice Blue', 'password'],
    ['bruno', 'Bruno Red', 'password'],
    ['carla', 'Carla Green', 'password'],
  ];

  const insertUser = db.prepare(
    'INSERT INTO users (username, name, password_hash, salt) VALUES (?, ?, ?, ?)'
  );

  users.forEach(([username, name, password]) => {
    const { hash, salt } = hashPassword(password);
    insertUser.run(username, name, hash, salt);
  });

  const alice = getUserByUsername('alice');
  const bruno = getUserByUsername('bruno');

  insertSeedResult(alice.id, 'Easy', 'won');
  insertSeedResult(alice.id, 'Intermediate', 'lost');
  insertSeedResult(bruno.id, 'Easy', 'lost');
  insertSeedResult(bruno.id, 'Hard', 'won');
}

function insertSeedResult(userId, difficulty, status) {
  const state = {
    difficulty,
    size: difficulty === 'Hard' ? 15 : difficulty === 'Intermediate' ? 10 : 5,
    torpedoes: status === 'won' ? 4 : 0,
    initialTorpedoes: difficulty === 'Hard' ? 38 : difficulty === 'Intermediate' ? 25 : 15,
    grid: [],
    ships: [],
    shots: [],
    status,
  };

  db.prepare(`
    INSERT INTO matches (user_id, mode, difficulty, status, state_json, completed_at)
    VALUES (?, 'casual', ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(userId, difficulty, status, JSON.stringify(state));
}

export function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function getUserById(id) {
  return db.prepare('SELECT id, username, name FROM users WHERE id = ?').get(id);
}

export function createTournament({ code, difficulty, seed, createdBy }) {
  db.prepare(`
    INSERT INTO tournaments (code, difficulty, seed, created_by)
    VALUES (?, ?, ?, ?)
  `).run(code, difficulty, seed, createdBy);
}

export function getTournament(code) {
  return db.prepare('SELECT * FROM tournaments WHERE code = ?').get(code);
}

export function createStoredMatch({ userId = null, mode, difficulty, tournamentCode = null, state }) {
  const result = db.prepare(`
    INSERT INTO matches (user_id, mode, difficulty, tournament_code, status, state_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, mode, difficulty, tournamentCode, state.status, JSON.stringify(state));

  return Number(result.lastInsertRowid);
}

export function getMatch(id) {
  const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    state: JSON.parse(row.state_json),
    tournamentCode: row.tournament_code,
  };
}

export function updateMatch(id, state) {
  db.prepare(`
    UPDATE matches
    SET status = ?, state_json = ?, completed_at = CASE WHEN ? <> 'playing' THEN CURRENT_TIMESTAMP ELSE completed_at END
    WHERE id = ?
  `).run(state.status, JSON.stringify(state), state.status, id);
}

export function getPublicStats() {
  return db.prepare(`
    SELECT
      u.username,
      u.name,
      m.difficulty,
      COUNT(m.id) AS played,
      SUM(CASE WHEN m.status = 'won' THEN 1 ELSE 0 END) AS won,
      SUM(CASE WHEN m.status = 'lost' THEN 1 ELSE 0 END) AS lost
    FROM users u
    LEFT JOIN matches m ON m.user_id = u.id AND m.status IN ('won', 'lost')
    GROUP BY u.id, m.difficulty
    ORDER BY u.username, m.difficulty
  `).all().map((row) => ({
    ...row,
    difficulty: row.difficulty ?? 'No games yet',
    played: Number(row.played ?? 0),
    won: Number(row.won ?? 0),
    lost: Number(row.lost ?? 0),
    winRate: row.played ? Math.round((Number(row.won) / Number(row.played)) * 100) : 0,
  }));
}
