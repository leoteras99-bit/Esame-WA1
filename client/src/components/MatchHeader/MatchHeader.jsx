import './MatchHeader.css';

function MatchHeader({ match, message }) {
  return (
    <div className="matchHeader">
      <div>
        <h1>{match ? match.difficulty + ' Match' : 'Ready Room'}</h1>
        <h1>{match?.tournamentCode || ''}</h1>
        <p>{message}</p>
      </div>
      {match && (
        <div className={'statusBadge ' + match.status}>
          {match.status === 'playing' ? match.torpedoes + ' torpedoes' : match.status.toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default MatchHeader;
