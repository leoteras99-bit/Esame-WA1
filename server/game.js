import { Ship } from './models.js';
import { MatchState } from './models.js';

const DIFFICULTIES = {
  Easy: {
    size: 5,
    shipCount: 3,
    minShipSize: 2,
    maxShipSize: 5,
    torpedoes: 10,
  },
  Intermediate: {
    size: 10,
    shipCount: 6,
    minShipSize: 2,
    maxShipSize: 5,
    torpedoes: 25,
  },
  Hard: {
    size: 15,
    shipCount: 10,
    minShipSize: 2,
    maxShipSize: 5,
    torpedoes: 38,
  },
};

const MAX_FLEET_GENERATION_ATTEMPTS = 100;

function makeRng(seed) {
  let state = seed ? hashSeed(seed) : Math.floor(Math.random() * 2147483647);
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

function hashSeed(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) || 1;
}

function randomInt(rng, max) {
  return Math.floor(rng() * max);
}

function randomShipLength(rng, min, max) {
  return min + randomInt(rng, max - min + 1);
}

function createShipSizes(level, rng) {
  return Array.from({ length: level.shipCount }, () =>
    randomShipLength(rng, level.minShipSize, level.maxShipSize)
  );
}


//create a Grid composed of cells where every cell can have a shipId and a shot flag
function emptyGrid(size) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ shipId: null, shot: false }))
  );
}

//function that return false if the cell is out of bounds, true in other cases
function isInside(size, row, col) {
  return row >= 0 && row < size && col >= 0 && col < size;
}


//function that return false if the cell does not have neighbour which means that the ship can be placed in the cell
function hasNeighbourShip(grid, row, col) {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      //return true if cell is out of bounds or if has a ship already
      if (isInside(grid.length, nextRow, nextCol) && grid[nextRow][nextCol].shipId !== null) {
        return true;
      }
    }
  }
  return false;
}

//return an Array of cell 
function cellsForShip(row, col, length, orientation) {
  return Array.from({ length }, (_, index) => ({
    row: orientation === 'vertical' ? row + index : row,
    col: orientation === 'horizontal' ? col + index : col,
  }));
}

//return true if every cell in cells is in bound or empty
function canPlace(grid, cells) {
  return cells.every(
    ({ row, col }) => isInside(grid.length, row, col) && !hasNeighbourShip(grid, row, col)
  );
}


//this function places all ships
function placeShips(size, shipSizes, rng) {
  const grid = emptyGrid(size);
  const ships = [];

  //
  shipSizes.forEach((length, shipId) => {
    //if after a set number of tries ship can't fit then the app abort the game
    for (let attempt = 0; attempt < 10000; attempt += 1) {
      const orientation = rng() < 0.5 ? 'horizontal' : 'vertical';
      const rowLimit = orientation === 'vertical' ? size - length + 1 : size;
      const colLimit = orientation === 'horizontal' ? size - length + 1 : size;
      const row = randomInt(rng, rowLimit);
      const col = randomInt(rng, colLimit);
      const cells = cellsForShip(row, col, length, orientation);

      if (canPlace(grid, cells)) {
        const ship = new Ship(shipId, length, orientation);
        ships.push(ship);
        cells.forEach((cell) => {
          grid[cell.row][cell.col].shipId = shipId;
        });
        return;
      }
    }

    throw new Error('Unable to place all ships for this difficulty');
  });

  return { grid, ships };
}

function createFleet(level, rng) {
  for (let attempt = 0; attempt < MAX_FLEET_GENERATION_ATTEMPTS; attempt += 1) {
    const shipSizes = createShipSizes(level, rng);

    try {
      return placeShips(level.size, shipSizes, rng);
    } catch (error) {
      if (attempt === MAX_FLEET_GENERATION_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw new Error('Unable to place all ships for this difficulty');
}

export function getDifficulties() {
  return Object.entries(DIFFICULTIES).map(([name, value]) => ({
    name,
    size: value.size,
    shipCount: value.shipCount,
    ships: Array.from({ length: value.shipCount }),
    torpedoes: value.torpedoes,
  }));
}

export function normalizeDifficulty(difficulty) {
  if (!DIFFICULTIES[difficulty]) {
    throw new Error('Invalid difficulty');
  }
  return difficulty;
}

export function createMatchState(difficulty, seed = null) {
  const level = DIFFICULTIES[normalizeDifficulty(difficulty)];
  const rng = makeRng(seed);
  const { grid, ships } = createFleet(level, rng);

  return new MatchState(difficulty, level.size, level.torpedoes, grid, ships);
}

export function publicMatch(match, reveal = false) {
  const state = match.state;
  return {
    id: match.id,
    mode: match.mode,
    tournamentCode: match.tournamentCode ?? null,
    difficulty: state.difficulty,
    size: state.size,
    torpedoes: state.torpedoes,
    initialTorpedoes: state.initialTorpedoes,
    ships: state.ships.map((ship) => ({ id: ship.id, length: ship.length, sunk: isShipSunk(state, ship.id) })),
    shots: state.shots,
    status: state.status,
    reveal: reveal || state.status !== 'playing' ? revealShips(state) : null,
  };
}

//return true if every cell of ship with id shipId was shot 
function isShipSunk(state, shipId) {
  const ship = state.ships.find((item) => item.id === shipId);
  //return ship.cells.every(({ row, col }) => state.grid[row][col].shot);
  return ship.hits === ship.length;
}

//
function revealShips(state) {
  const revealed = [];

  for (let row = 0; row < state.size; row++) {
    for (let col = 0; col < state.size; col++) {
      const cell = state.grid[row][col];
      if (cell.shipId !== null) {
        revealed.push({
          row,
          col,
        });
      }
    }
  }

  return revealed;
}

export function launchTorpedo(state, row, col) {
  if (state.status !== 'playing') {
    throw new Error('This match has already ended');
  }
  if (!Number.isInteger(row) || !Number.isInteger(col) || !isInside(state.size, row, col)) {
    throw new Error('Cell is outside the grid');
  }

  const cell = state.grid[row][col];
  if (cell.shot) {
    throw new Error('This cell has already been selected');
  }

  cell.shot = true;
  let result = 'water';
  let sunkShip = null;

  if (cell.shipId === null) {
    state.torpedoes -= 1;
  }else {
    const ship = state.ships.find((ship) => ship.id === cell.shipId);
    result = 'hit';
    ship.hits += 1;
  }

  if (cell.shipId !== null && isShipSunk(state, cell.shipId)) {
    result = 'sunk';
    sunkShip = state.ships.find((ship) => ship.id === cell.shipId);
  }

  if (state.ships.every((ship) => isShipSunk(state, ship.id))) {
    state.status = 'won';
  } else if (state.torpedoes <= 0) {
    state.status = 'lost';
  }

  const shot = { row, col, result, shipId: cell.shipId, sunkLength: sunkShip?.length ?? null };
  state.shots.push(shot);
  return { shot, status: state.status };
}
