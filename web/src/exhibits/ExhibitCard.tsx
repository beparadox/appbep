import { exhibitHref, type Exhibit } from './registry';
import './exhibits.css';

interface Props {
  exhibit: Exhibit;
  /** "tile" for the plain /projects page, "placard" for a brass plaque in the funhouse. */
  variant?: 'tile' | 'placard';
}

/** One exhibit: title, year, tech, a blurb, and a "how it works" nugget you can open. */
export default function ExhibitCard({ exhibit: e, variant = 'tile' }: Props) {
  const href = exhibitHref(e);
  return (
    <article className={`exhibit exhibit-${variant}`}>
      <h3>
        {href ? <a href={href}>{e.title}</a> : e.title}
        {!href && <span className="exhibit-soon"> (coming soon)</span>}
      </h3>
      <p className="exhibit-meta">
        {e.year} · {e.tech.join(', ')}
      </p>
      <p>{e.blurb}</p>
      <details>
        <summary>How it works</summary>
        <p>{e.lesson}</p>
      </details>
    </article>
  );
}
