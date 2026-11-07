import { Link, useNavigate } from 'react-router-dom';
import { START } from './rooms';
import { play, unlockAudio } from './sound';
import { setSound } from './state';
import './funhouse.css';

/** "Are you sure?" The click that enters also unlocks sound (browsers require one). */
export default function Entrance() {
  const navigate = useNavigate();

  function enter(withSound: boolean) {
    if (withSound) unlockAudio();
    setSound(withSound);
    play('jingle', withSound);
    navigate(`/funhouse/${START}`);
  }

  return (
    <main className="funhouse entrance">
      <title>Enter at your own risk</title>
      <meta name="robots" content="noindex" />
      <h1 className="blink">ENTER AT YOUR OWN RISK</h1>
      <p>Beyond this point:</p>
      <ul>
        <li>old websites, not all of them well</li>
        <li>doors that lie</li>
        <li>things that jump out</li>
        <li>sounds (if you let them)</li>
      </ul>
      <p className="entrance-buttons">
        <button type="button" onClick={() => enter(true)}>
          🔊 Enter
        </button>
        <button type="button" onClick={() => enter(false)}>
          🔇 Enter quietly
        </button>
      </p>
      <p>
        <Link to="/">chicken out</Link>
      </p>
    </main>
  );
}
