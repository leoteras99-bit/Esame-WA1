
export function emptyGrid(size) {
    return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ shipId: null, shot: false }))
  );
}

export function Cell(){
    this.shipId = null;
    this.shot = false;
}

export function Ship(id, length, orientation) {
    this.id = id;
    this.length = length;
    this.orientation = orientation;
    //this.cells = cells;
    this.hits = 0;

}

export function shot(row, col, result, cell, sunkShip) {
        this.row = row;
        this.col = col;
        this.result = result;
        this.shipId = cell.shipId;
        this.sunkLength = sunkShip?.length ?? null
}

export function MatchState(difficulty, size, torpedoes, grid, ships) {
    
    this.difficulty = difficulty;
    this.size = size;
    this.torpedoes = torpedoes;
    this.initialTorpedoes = initialTorpedoes;
    this.grid = grid;
    this.ships = ships;
    this.shots = [];
    this.status = 'playing';
}

export function publicMatch (match, reveal = false) {
  const state = match.state;
    this.id = match.id;
    this.mode = match.mode;
    this.tournamentCode = match.tournamentCode ?? null;
    this.difficulty = state.difficulty;
    this.size = state.size;
    this.torpedoes = state.torpedoes;
    this.initialTorpedoes = state.initialTorpedoes;
    this.ships = state.ships.map((ship) => ({ id: ship.id, length: ship.length, sunk: isShipSunk(state, ship.id) }));
    this.shots = state.shots;
    this.status = state.status;
    this.reveal = reveal || state.status !== 'playing' ? revealShips(state) : null;
}
