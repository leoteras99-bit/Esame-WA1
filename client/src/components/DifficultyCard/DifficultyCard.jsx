import './DifficultyCard.css';

function DifficultyCard({ difficulty }) {
  const shipCount = difficulty.shipCount ?? difficulty.ships.length;

  return (
    <div className="difficultyBox">
      <span>{difficulty.size} x {difficulty.size}</span>
      <span>{shipCount} ships</span>
      <span>{difficulty.torpedoes} torpedoes</span>
    </div>
  );
}

export default DifficultyCard;
