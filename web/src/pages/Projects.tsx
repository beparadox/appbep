import { Link } from 'react-router-dom';
import ExhibitCard from '../exhibits/ExhibitCard';
import { EXHIBITS, KIND_LABEL, type ExhibitKind } from '../exhibits/registry';

const KINDS: ExhibitKind[] = ['game', 'app', 'demo', 'site'];

/**
 * A plain list of every project. Not linked from anywhere; reachable at /projects.
 * Same data and cards as the funhouse, minus the funhouse.
 */
export default function Projects() {
  return (
    <main className="home projects">
      {/* React 19 moves these into <head>. Keeps the unlisted page out of search results. */}
      <title>Projects · Bambridge E. Peterson</title>
      <meta name="robots" content="noindex" />

      <h1>Projects</h1>
      <p className="tagline">Old things I built, kept running.</p>
      {KINDS.map((kind) => (
        <section key={kind}>
          <h2>{KIND_LABEL[kind]}</h2>
          <div className="project-grid">
            {EXHIBITS.filter((e) => e.kind === kind).map((e) => (
              <ExhibitCard key={e.id} exhibit={e} />
            ))}
          </div>
        </section>
      ))}
      <p>
        <Link to="/">Home</Link> · <Link to="/funhouse">The scenic route</Link>
      </p>
    </main>
  );
}
