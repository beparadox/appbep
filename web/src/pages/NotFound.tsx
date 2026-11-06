import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="home">
      <h1>404</h1>
      <p>
        Nothing here. <Link to="/">Go home</Link>.
      </p>
    </main>
  );
}
