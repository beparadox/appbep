import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import BirthdayCard from './BirthdayCard';
import type { CardData } from './types';
import '../index.css';

/**
 * The offline keepsake: the card, opened straight from a folder on disk (no server, no
 * internet). scripts/card-picker/keepsake.py builds it. The card's data comes from
 * card/card.js (a plain script, since pages opened from a file can't fetch JSON), and
 * its photos and clips sit beside it in card/.
 */
declare global {
  interface Window {
    CARD?: CardData;
  }
}

const root = createRoot(document.getElementById('root')!);
if (window.CARD) {
  root.render(
    <StrictMode>
      <MemoryRouter>
        <BirthdayCard data={window.CARD} files="card/" />
      </MemoryRouter>
    </StrictMode>,
  );
} else {
  root.render(<p>The card’s files are missing: keep this page in its folder, next to “card”.</p>);
}
