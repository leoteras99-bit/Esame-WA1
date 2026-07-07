import sqlite3 from 'sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'data', 'battleship.sqlite');

mkdirSync(dirname(dbPath), { recursive: true });
const isNewDatabase = !existsSync(dbPath);
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbPath);

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function handleRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, user) {
  const { hash } = hashPassword(password, user.salt);
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.password_hash, 'hex'));
}

export async function initializeDatabase() {
  await exec('PRAGMA foreign_keys = ON');
  await exec(`
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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(tournament_code) REFERENCES tournaments(code)
    );
  `);

  const row = await get('SELECT COUNT(*) AS total FROM users');
  if (isNewDatabase || row.total === 0) {
    await seedDatabase();
  }
}

async function seedDatabase() {
  const users = [
    ['alice', 'Alice Blue', 'password'],
    ['bruno', 'Bruno Red', 'password'],
    ['carla', 'Carla Green', 'password'],
  ];

  for (const [username, name, password] of users) {
    const { hash, salt } = hashPassword(password);
    await run(
      'INSERT INTO users (username, name, password_hash, salt) VALUES (?, ?, ?, ?)',
      [username, name, hash, salt]
    );
  }

  const alice = await getUserByUsername('alice');
  const bruno = await getUserByUsername('bruno');

  await insertSeedResult(alice.id, 'Easy', 'won');
  await insertSeedResult(alice.id, 'Intermediate', 'lost');
  await insertSeedResult(bruno.id, 'Easy', 'lost');
  await insertSeedResult(bruno.id, 'Hard', 'won');
}

async function insertSeedResult(userId, difficulty, status) {
  /*const state = {
    difficulty,
    size: difficulty === 'Hard' ? 15 : difficulty === 'Intermediate' ? 10 : 5,
    torpedoes: status === 'won' ? 4 : 0,
    initialTorpedoes: difficulty === 'Hard' ? 38 : difficulty === 'Intermediate' ? 25 : 15,
    grid: [],
    ships: [],
    shots: [],
    status,
  };*/

  await run(`
    INSERT INTO matches (user_id, mode, difficulty, status)
    VALUES (?, 'casual', ?, ?)
  `, [userId, difficulty, status]);
}

export function getUserByUsername(username) {
  return get('SELECT * FROM users WHERE username = ?', [username]);
}

export function getUserById(id) {
  return get('SELECT id, username, name FROM users WHERE id = ?', [id]);
}

export function createTournament({ code, difficulty, seed, createdBy }) {
  return run(`
    INSERT INTO tournaments (code, difficulty, seed, created_by)
    VALUES (?, ?, ?, ?)
  `, [code, difficulty, seed, createdBy]);
}

export function getTournament(code) {
  return get('SELECT * FROM tournaments WHERE code = ?', [code]);
}

export async function createStoredMatch({ userId = null, mode, difficulty, tournamentCode = null, state }) {
  const result = await run(`
    INSERT INTO matches (user_id, mode, difficulty, tournament_code, status)
    VALUES (?, ?, ?, ?, ?)
  `, [userId, mode, difficulty, tournamentCode, state.status]);

  return Number(result.lastID);
}

export async function getMatch(id) {
  const row = await get('SELECT * FROM matches WHERE id = ?', [id]);
  if (!row) return null;
  return {
    ...row,
    tournamentCode: row.tournament_code,
  };
}

/*export function updateMatch(id, state) {
  run(`
    UPDATE matches
    SET status = ?, completed_at = CASE WHEN ? <> 'playing' THEN CURRENT_TIMESTAMP ELSE completed_at END
    WHERE id = ?
  `, [state.status, state.status, id]);
}*/

export async function getPublicStats() {
  const rows = await all(`
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
  `);

  return rows.map((row) => ({
    ...row,
    difficulty: row.difficulty ?? 'No games yet',
    played: Number(row.played ?? 0),
    won: Number(row.won ?? 0),
    lost: Number(row.lost ?? 0),
    winRate: row.played ? Math.round((Number(row.won) / Number(row.played)) * 100) : 0,
  }));
}
