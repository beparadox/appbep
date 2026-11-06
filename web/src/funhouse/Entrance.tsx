import { Link } from 'react-router-dom';
import './funhouse.css';

/** Placeholder entrance. The real rooms arrive in Phase 2. */
export default function Entrance() {
  return (
    <main className="funhouse">
      <h1 className="blink">WELCOME 2 THE FUNHOUSE</h1>
      <p>under construction since 1998</p>
      <Link to="/">chicken out</Link>
    </main>
  );
}
