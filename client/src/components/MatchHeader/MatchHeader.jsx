import './MatchHeader.css';

function MatchHeader({ match, message }) {
  return (
    <div className="matchHeader">
      <div>
        <h1>{match ? match.difficulty + ' Match' : 'Ready Room'}</h1>
        {match?.tournamentCode && (
          <h2 className="tournamentCode">
            Tournament: {match.tournamentCode}
          </h2>
        )}
        <p>{message}</p>
      </div>
    </div>
  );
}

export default MatchHeader;
