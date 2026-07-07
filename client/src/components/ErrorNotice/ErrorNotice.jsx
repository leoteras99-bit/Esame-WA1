import './ErrorNotice.css';

function ErrorNotice({ message }) {
  if (!message) return null;
  return <div className="notice error">{message}</div>;
}

export default ErrorNotice;
