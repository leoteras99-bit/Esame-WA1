import { useMemo } from 'react';
import './Board.css';

function cellLabel(shot, revealed) {
  if (shot?.result === 'water') return 'o';
  if (shot?.result === 'hit') return 'x';
  if (shot?.result === 'sunk') return 'X';
  if (revealed) return 'S';
  return '';
}

function Board({ match, onShoot }) {
  const shotMap = useMemo(() => new Map(match.shots.map((shot) => [shot.row + '-' + shot.col, shot])), [match.shots]);
  const revealMap = useMemo(() => new Map((match.reveal ?? []).map((cell) => [cell.row + '-' + cell.col, cell])), [match.reveal]);
  const cells = [];

  for (let row = 0; row < match.size; row += 1) {
    for (let col = 0; col < match.size; col += 1) {
      const key = row + '-' + col;
      const shot = shotMap.get(key);
      const revealed = revealMap.get(key);
      const className = ['cell', shot?.result, revealed && !shot ? 'revealed' : ''].filter(Boolean).join(' ');
      cells.push(
        <button
          key={key}
          type="button"
          className={className}
          disabled={Boolean(shot) || match.status !== 'playing'}
          onClick={() => onShoot(row, col)}
          aria-label={'Row ' + (row + 1) + ', column ' + (col + 1)}
        >
          {cellLabel(shot, revealed)}
        </button>
      );
    }
  }

  return (
    <>
      <div className="boardInfo">
        <div className="fleetRow">
          {match.ships.map((ship) => (
            <span key={ship.id} className={ship.sunk ? 'sunkShip' : ''}>
              Ship {ship.length}
            </span>
          ))}
        </div>
        <div className={'statusBadge ' + match.status}>
          {match.status === 'playing'? `${match.torpedoes} torpedoes`: match.status.toUpperCase()}
        </div>
      </div>
      <div
        className="board"
        style={{
          gridTemplateColumns: 'repeat(' + match.size + ', minmax(0, 1fr))',
          gridTemplateRows: 'repeat(' + match.size + ', minmax(0, 1fr))',
        }}
      >
        {cells}
      </div>
    </>
  );
}

export default Board;
