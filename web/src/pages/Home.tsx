import { Link } from 'react-router-dom';
import { site } from '../site';
import { InfoCube, SpinCube, type CubeFace } from '../cube/InfoCube';
import apfHead from '../assets/cubes/apf-head-space.png';
import uwCrest from '../assets/cubes/uw-crest.png';

const faces: CubeFace[] = [
  {
    id: 'front',
    label: 'Hello',
    content: (
      <>
        <div className="photo-placeholder">photo</div>
        <h1>{site.name}</h1>
        <p className="tagline">{site.tagline}</p>
      </>
    ),
  },
  {
    id: 'right',
    label: 'About',
    content: (
      <>
        <h2>About</h2>
        <p>{site.bio}</p>
      </>
    ),
  },
  {
    id: 'back',
    label: 'Interests',
    content: (
      <>
        <h2>Interests</h2>
        <ul>
          {site.interests.map((i, n) => (
            <li key={n}>{i}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'left',
    label: 'Elsewhere',
    content: (
      <>
        <h2>Elsewhere</h2>
        <ul>
          {site.links.map((l) => (
            <li key={l.label}>
              <a href={l.href} rel="me noopener">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'top',
    label: 'Resume',
    content: (
      <>
        <h2>Resume &amp; contact</h2>
        <p>
          <a href={site.resumeUrl}>Resume (PDF)</a>
        </p>
        {/* No plain email address (spam). Contact form planned: see docs/PLAN.md. */}
      </>
    ),
  },
  {
    id: 'bottom',
    label: 'Funhouse',
    className: 'face-funhouse',
    content: (
      <>
        <h2>THE FUNHOUSE</h2>
        <p>enter at your own risk</p>
        <Link to="/funhouse">go in →</Link>
      </>
    ),
  },
];

export default function Home() {
  return (
    <main className="cube-home">
      <div className="cube-row">
        <SpinCube images={{ front: { src: apfHead, alt: '', className: 'crop-head' } }} />
        <InfoCube faces={faces} />
        <SpinCube reverse images={{ front: { src: uwCrest, alt: '', className: 'pad' } }} />
      </div>
    </main>
  );
}
