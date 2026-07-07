import './Header.css';

function Header({ user, onNavigate, onLogout }) {
  return (
    <header className="topbar">
      <button className="brandButton" type="button" onClick={() => onNavigate('/')}>Battleship</button>
      <nav>
        <button type="button" onClick={() => onNavigate('/')}>Play</button>
        <button type="button" onClick={() => onNavigate('/stats')}>Statistics</button>
        {user ? (
          <button type="button" onClick={onLogout}>Logout {user.username}</button>
        ) : (
          <button type="button" onClick={() => onNavigate('/login')}>Login</button>
        )}
      </nav>
    </header>
  );
}

export default Header;
