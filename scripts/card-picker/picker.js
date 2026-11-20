/**
 * The card picker page. Shows every photo and video in the card folder (manifest.json,
 * made by prepare.py), and keeps "the card": an ordered list of photos and video
 * sections, saved to picks.json as you go.
 *
 * picks.json: {
 *   version: 1,
 *   photoSeconds: 2,
 *   items: [
 *     { key, type: 'photo', src },                          // src = manifest id
 *     { key, type: 'clip', src, start, end, sound, joinNext }, // seconds into the video;
 *                                    // joinNext: made into one video with the clip after it
 *   ],
 *   bonus: [ ...same as items ],              // the bonus round: after the show, and a gallery
 *   rotate: { [src]: degrees },               // turn a photo or video; -90 = a quarter turn left
 * }
 */

const $ = (sel) => document.querySelector(sel);

/** @type {Array<any>} */
let media = [];
/** @type {Map<string, any>} */
let byId = new Map();
let picks = { version: 1, photoSeconds: 2, items: [], bonus: [], rotate: {} };
let filter = 'all';
/** Which list the right-hand panel shows: the card ('items') or the bonus round. */
let showing = 'items';

// ---------- Small helpers ----------

/** 83.4 -> "1:23.4" */
function clock(s) {
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(1).padStart(4, '0');
  return `${m}:${rest}`;
}
/** 83.4 -> "1:23" */
function shortClock(s) {
  const r = Math.round(s);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
}
function when(item) {
  if (!item.date) return '';
  const d = new Date(item.date);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
const isPicked = (id, list = 'items') => picks[list].some((p) => p.src === id);
const inBonus = (id) => isPicked(id, 'bonus');
const turn = (id) => picks.rotate[id] ?? 0;
/** Cropped photos: manifest id -> { view, thumb } (data URLs, already turned and cropped). */
const cropped = new Map();
// A cropped photo's pictures are made already turned, so they mustn't be turned again.
const turned = (id) => (turn(id) && !cropped.has(id) ? `rotate(${turn(id)}deg)` : '');
const clipsOf = (id, list = 'items') =>
  picks[list].filter((p) => p.src === id && p.type === 'clip');
const thumbUrl = (m) => cropped.get(m.id)?.thumb ?? `/picker/${m.thumb}`;
function viewUrl(m) {
  if (cropped.has(m.id)) return cropped.get(m.id).view;
  if (m.view) return `/picker/${m.view}`;
  return '/originals/' + m.file.split('/').map(encodeURIComponent).join('/');
}
function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e) e[k] = v;
    else e.setAttribute(k, v);
  }
  for (const kid of kids) if (kid != null) e.append(kid);
  return e;
}
let keyCount = 0;
const newKey = (src) => `${src}-${Date.now().toString(36)}${(keyCount++).toString(36)}`;

// ---------- Saving ----------

let saveTimer = 0;
/** The save in progress, if any. */
let saving = Promise.resolve(true);
function changed() {
  render();
  const status = $('#save-status');
  status.textContent = 'Saving…';
  status.classList.remove('bad');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => (saving = save()), 400);
}

/** Make sure the picks on the server are the ones on the page. */
async function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = 0;
    saving = save();
  }
  return saving;
}

/** Send the picks to the server. Resolves true if they were saved. */
async function save() {
  saveTimer = 0;
  const status = $('#save-status');
  try {
    const res = await fetch('/picks.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(picks),
    });
    if (!res.ok) throw new Error(String(res.status));
    status.textContent = 'Saved ✓';
    return true;
  } catch {
    status.textContent = 'NOT saved — is the picker server still running?';
    status.classList.add('bad');
    return false;
  }
}

// ---------- Building the card ----------

/** New photos or videos dropped in the card folder: copy them in, preview them, show them. */
async function takeNew() {
  const button = $('#take-new');
  const status = $('#build-status');
  button.disabled = true;
  status.classList.remove('bad');
  status.title = '';
  status.textContent = 'Looking for new photos…';
  try {
    if (!(await flushSave())) throw new Error("Your picks couldn't be saved, so nothing was done.");
    const res = await fetch('/take-new', { method: 'POST' });
    const { ok, log } = await res.json();
    status.title = log;
    if (!ok) throw new Error(log);
    if (/No new files/.test(log)) {
      status.textContent = 'No new photos or videos in the card folder.';
      return;
    }
    // The page starts over with the new manifest; the picks are saved, so nothing is lost.
    location.reload();
  } catch (err) {
    status.textContent = "Couldn't take them in (hover for why)";
    status.title = String(err.message ?? err);
    status.classList.add('bad');
  } finally {
    button.disabled = false;
  }
}

async function rebuild() {
  const button = $('#rebuild');
  const status = $('#build-status');
  button.disabled = true;
  status.classList.remove('bad');
  status.title = '';
  status.textContent = 'Building… (a minute or two if photos or clips changed)';
  try {
    if (!(await flushSave()))
      throw new Error("Your picks couldn't be saved, so nothing was built.");
    const res = await fetch('/build', { method: 'POST' });
    const { ok, log } = await res.json();
    status.title = log;
    if (!ok) throw new Error(log);
    status.textContent = 'Built ✓ — reload the card to see it';
  } catch (err) {
    status.textContent = `Build failed (hover for why)`;
    status.title = String(err.message ?? err);
    status.classList.add('bad');
  } finally {
    button.disabled = false;
  }
}

// ---------- Changing the card ----------

/** Put an item where it belongs by date, so the card stays oldest-first by default. */
function insertByDate(item, list = 'items') {
  const date = byId.get(item.src).date ?? '';
  const at = picks[list].findIndex((p) => (byId.get(p.src).date ?? '') > date);
  if (at === -1) picks[list].push(item);
  else picks[list].splice(at, 0, item);
}

function setBonus(m, on) {
  if (on === inBonus(m.id)) return;
  if (on) {
    insertByDate(
      m.kind === 'photo' ? { key: m.id, type: 'photo', src: m.id } : wholeClip(m),
      'bonus',
    );
  } else {
    const clips = clipsOf(m.id, 'bonus');
    if (
      clips.length > 1 &&
      !confirm(`Take all ${clips.length} sections of this video out of the bonus?`)
    ) {
      return;
    }
    picks.bonus = picks.bonus.filter((p) => p.src !== m.id);
  }
  changed();
}

function setTurn(id, by) {
  const deg = ((((turn(id) + by) % 360) + 540) % 360) - 180; // keep it in -180..180
  if (deg === 0) delete picks.rotate[id];
  else picks.rotate[id] = deg;
  changed();
}

function wholeClip(m) {
  return {
    key: newKey(m.id),
    type: 'clip',
    src: m.id,
    start: 0,
    end: m.duration,
    sound: !!m.audio,
  };
}

function setPicked(m, on) {
  if (on === isPicked(m.id)) return;
  if (on) {
    insertByDate(m.kind === 'photo' ? { key: m.id, type: 'photo', src: m.id } : wholeClip(m));
  } else {
    const clips = clipsOf(m.id);
    if (
      clips.length > 1 &&
      !confirm(`Take all ${clips.length} sections of this video off the card?`)
    ) {
      return;
    }
    picks.items = picks.items.filter((p) => p.src !== m.id);
  }
  changed();
}

function move(from, to) {
  const list = picks[showing];
  if (to < 0 || to >= list.length || from === to) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  changed();
}

function runtime() {
  let s = 0;
  for (const p of picks.items) s += p.type === 'photo' ? picks.photoSeconds : p.end - p.start;
  return s;
}

// ---------- The grid ----------

const tiles = new Map();

function buildGrid() {
  const grid = $('#grid');
  grid.textContent = '';
  let year = null;
  let box = null;
  for (const m of media) {
    const y = m.date ? m.date.slice(0, 4) : 'Unknown date';
    if (y !== year) {
      year = y;
      grid.append(el('h3', { class: 'year', textContent: y }));
      box = el('div', { class: 'tiles' });
      grid.append(box);
    }
    const check = el('input', {
      type: 'checkbox',
      onchange: (e) => setPicked(m, e.target.checked),
    });
    const bonus = el('input', {
      type: 'checkbox',
      onchange: (e) => setBonus(m, e.target.checked),
    });
    const tile = el(
      'div',
      { class: 'tile' },
      el(
        'button',
        { type: 'button', class: 'open', title: 'See it big', onclick: () => openViewer(m.id) },
        el('img', { src: thumbUrl(m), alt: '', loading: 'lazy' }),
      ),
      el(
        'span',
        { class: 'use' },
        el('label', {}, check, 'card'),
        bonus ? el('label', { class: 'bonus-check' }, bonus, 'bonus') : null,
      ),
      el('span', { class: 'when', textContent: when(m) }),
      m.kind === 'video' ? el('span', { class: 'badge' }) : null,
    );
    tiles.set(m.id, {
      tile,
      check,
      bonus,
      img: tile.querySelector('img'),
      badge: tile.querySelector('.badge'),
    });
    box.append(tile);
  }
}

function renderGrid() {
  for (const m of media) {
    const t = tiles.get(m.id);
    const onCard = isPicked(m.id);
    const extra = inBonus(m.id);
    const picked = onCard || extra;
    t.tile.classList.toggle('picked', onCard);
    t.tile.classList.toggle('in-bonus', extra);
    t.check.checked = onCard;
    if (t.bonus) t.bonus.checked = extra;
    t.img.style.transform = turned(m.id);
    const show =
      filter === 'all' ||
      filter === m.kind ||
      (filter === 'bonus' && extra) ||
      (filter === 'picked' && onCard) ||
      (filter === 'unpicked' && !picked);
    t.tile.hidden = !show;
    if (t.badge) {
      const n = clipsOf(m.id).length + clipsOf(m.id, 'bonus').length;
      t.badge.textContent = `▶ ${shortClock(m.duration)}` + (n > 1 ? ` · ${n} parts` : '');
    }
  }
  // Hide a year's heading when none of its tiles are showing.
  for (const box of document.querySelectorAll('.tiles')) {
    const any = [...box.children].some((c) => !c.hidden);
    box.hidden = !any;
    box.previousElementSibling.hidden = !any;
  }
}

// ---------- The card, in order ----------

let dragFrom = -1;

function renderSequence() {
  const list = $('#seq');
  list.textContent = '';
  const items = picks[showing];
  for (const tab of document.querySelectorAll('[data-list]')) {
    const name = tab.dataset.list;
    tab.setAttribute('aria-pressed', String(name === showing));
    tab.querySelector('span').textContent = `(${picks[name].length})`;
  }
  if (!items.length) {
    list.append(
      el('li', {
        class: 'empty',
        textContent:
          showing === 'items'
            ? 'Nothing yet. Tick "card" on some photos.'
            : 'Nothing yet. Tick "bonus" on photos or videos for the bonus round.',
      }),
    );
    return;
  }
  items.forEach((p, i) => {
    const m = byId.get(p.src);
    const next = items[i + 1];
    const canJoin = p.type === 'clip' && next?.type === 'clip';
    const joined = canJoin && !!p.joinNext;
    const label =
      p.type === 'photo'
        ? el('span', { class: 'label' }, 'Photo', el('small', { textContent: when(m) }))
        : el(
            'span',
            { class: 'label' },
            `Video ${clock(p.start)}–${clock(p.end)} ${p.sound ? '🔊' : '🔇'}`,
            el('small', { textContent: `${when(m)} · ${shortClock(p.end - p.start)}` }),
          );
    const li = el(
      'li',
      { draggable: true, class: joined ? 'joined' : '' },
      el('span', { class: 'n', textContent: String(i + 1) }),
      el('img', {
        src: thumbUrl(m),
        alt: '',
        title: 'See it big',
        style: `transform: ${turned(m.id) || 'none'}`,
        onclick: () => openViewer(m.id),
      }),
      label,
      el(
        'span',
        { class: 'moves' },
        canJoin
          ? el('button', {
              type: 'button',
              class: 'join',
              textContent: joined ? '⛓ Joined' : '⛓',
              'aria-pressed': String(joined),
              title: joined
                ? 'Joined with the next clip into one video. Click to separate them.'
                : 'Join with the next clip into one video',
              onclick: () => {
                if (joined) delete p.joinNext;
                else p.joinNext = true;
                changed();
              },
            })
          : null,
        el('button', {
          type: 'button',
          textContent: '↑',
          'aria-label': 'Earlier',
          onclick: () => move(i, i - 1),
        }),
        el('button', {
          type: 'button',
          textContent: '↓',
          'aria-label': 'Later',
          onclick: () => move(i, i + 1),
        }),
        el('button', {
          type: 'button',
          textContent: '✕',
          'aria-label': showing === 'items' ? 'Take off the card' : 'Take out of the bonus round',
          onclick: () => {
            items.splice(i, 1);
            changed();
          },
        }),
      ),
    );
    li.addEventListener('dragstart', (e) => {
      dragFrom = i;
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      const below = e.offsetY > li.offsetHeight / 2;
      li.classList.toggle('drop-below', below);
      li.classList.toggle('drop-above', !below);
    });
    li.addEventListener('dragleave', () => li.classList.remove('drop-above', 'drop-below'));
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const below = li.classList.contains('drop-below');
      li.classList.remove('drop-above', 'drop-below');
      if (dragFrom < 0) return;
      let to = i + (below ? 1 : 0);
      if (dragFrom < to) to -= 1;
      move(dragFrom, to);
      dragFrom = -1;
    });
    list.append(li);
  });
}

function render() {
  renderGrid();
  renderSequence();
  const photos = picks.items.filter((p) => p.type === 'photo').length;
  const clips = picks.items.length - photos;
  $('#summary').textContent =
    `${photos} photo${photos === 1 ? '' : 's'}, ${clips} video part${clips === 1 ? '' : 's'} · ` +
    `about ${shortClock(runtime())} long`;
  if (viewing) {
    renderPanel();
    applyTurn();
  }
}

// ---------- The viewer ----------

let viewing = null; // manifest id
let editing = null; // key of the clip being edited
let video = null;
let stopAt = null;

/** The items the ◀ ▶ buttons walk through: what the grid is showing. */
function visibleIds() {
  return media.filter((m) => !tiles.get(m.id).tile.hidden).map((m) => m.id);
}

function openViewer(id) {
  const m = byId.get(id);
  viewing = id;
  editing = (clipsOf(id)[0] ?? clipsOf(id, 'bonus')[0])?.key ?? null;
  stopAt = null;
  const stage = $('#stage');
  stage.textContent = '';
  if (m.kind === 'photo') {
    video = null;
    stage.append(el('img', { src: viewUrl(m), alt: '' }));
  } else {
    video = el('video', { src: viewUrl(m), controls: true, preload: 'auto', playsInline: true });
    video.addEventListener('timeupdate', () => {
      const now = $('#now');
      if (now) now.textContent = clock(video.currentTime);
      if (stopAt != null && video.currentTime >= stopAt) {
        video.pause();
        stopAt = null;
      }
    });
    stage.append(video);
  }
  $('#viewer-title').textContent = `${m.kind === 'photo' ? 'Photo' : 'Video'} · ${when(m)}`;
  renderPanel();
  applyTurn();
  const dialog = $('#viewer');
  if (!dialog.open) dialog.showModal();
}

/** Show the photo or video in the viewer turned the way it will be on the card. */
function applyTurn() {
  const media = $('#stage').firstElementChild;
  if (!media || !viewing) return;
  const deg = cropped.has(viewing) ? 0 : turn(viewing); // cropped: made already turned
  const stage = $('#stage');
  const sideways = Math.abs(deg) === 90;
  media.style.transform = deg ? `rotate(${deg}deg)` : '';
  // Turned sideways, its width has to fit the stage's height and vice versa.
  media.style.maxWidth = sideways ? `${stage.clientHeight}px` : '';
  media.style.maxHeight = sideways ? `${stage.clientWidth}px` : '';
}

function closeViewer() {
  video?.pause();
  viewing = null;
  $('#viewer').close();
}

function step(by) {
  const ids = visibleIds();
  const at = ids.indexOf(viewing);
  if (at === -1 || !ids.length) return;
  video?.pause();
  openViewer(ids[(at + by + ids.length) % ids.length]);
}

function renderPanel() {
  const m = byId.get(viewing);
  const panel = $('#panel');
  panel.textContent = '';
  const picked = isPicked(m.id);
  panel.append(
    el('button', {
      type: 'button',
      class: 'big',
      'aria-pressed': String(picked),
      textContent: picked ? `✓ On the card` : `Put this ${m.kind} on the card`,
      onclick: () => setPicked(m, !picked),
    }),
  );
  const extra = inBonus(m.id);
  panel.append(
    el('button', {
      type: 'button',
      class: 'big bonus-btn',
      'aria-pressed': String(extra),
      textContent: extra ? '✓ In the bonus round' : 'Put it in the bonus round',
      onclick: () => setBonus(m, !extra),
    }),
  );
  panel.append(
    el(
      'div',
      { class: 'row turn' },
      el('button', {
        type: 'button',
        textContent: '↺ Turn left',
        onclick: () => setTurn(m.id, -90),
      }),
      el('button', {
        type: 'button',
        textContent: '↻ Turn right',
        onclick: () => setTurn(m.id, 90),
      }),
      turn(m.id)
        ? el('span', {
            class: 'hint',
            textContent: `Turned ${Math.abs(turn(m.id))}° ${turn(m.id) < 0 ? 'left' : 'right'}`,
          })
        : null,
    ),
  );
  if (m.kind === 'photo') {
    if (cropped.has(m.id)) {
      panel.append(
        el('p', {
          class: 'hint',
          textContent: '✂ Cropped, as set in card.config.json. The card shows it like this.',
        }),
      );
    }
    panel.append(
      el('p', { class: 'hint', textContent: 'Use ◀ ▶ (or the arrow keys) to go through them.' }),
    );
    return;
  }

  panel.append(
    el(
      'p',
      {},
      'Playing at ',
      el('span', { id: 'now', class: 'now', textContent: clock(video?.currentTime ?? 0) }),
    ),
    el('p', {
      class: 'hint',
      textContent:
        `The whole video is ${clock(m.duration)}. ` +
        (m.audio ? '' : 'It has no sound. ') +
        'Play or scrub to a moment, then set where the section starts and ends.',
    }),
  );
  renderSections(m, 'items');
  renderSections(m, 'bonus');
}

/** The parts of video m used on the card ('items') or in the bonus round, to trim. */
function renderSections(m, list) {
  const panel = $('#panel');
  const clips = clipsOf(m.id, list);
  if (!clips.length) return;

  const where = list === 'items' ? 'on the card' : 'in the bonus round';
  panel.append(
    el('h3', { textContent: `${clips.length > 1 ? 'Sections' : 'Section'} used ${where}` }),
  );
  clips.forEach((c, n) => {
    const isEditing = c.key === editing;
    const update = (patch) => {
      Object.assign(c, patch);
      if (c.end - c.start < 0.5) c.end = Math.min(m.duration, c.start + 0.5);
      changed();
    };
    const box = el(
      'div',
      {
        class: `section${isEditing ? ' editing' : ''}`,
        onclick: () => {
          if (editing !== c.key) {
            editing = c.key;
            renderPanel();
          }
        },
      },
      el('div', {
        class: 'times',
        textContent: `${clips.length > 1 ? `Part ${n + 1}: ` : ''}${clock(c.start)} → ${clock(c.end)}  (${shortClock(c.end - c.start)})`,
      }),
      el(
        'div',
        { class: 'row' },
        el('button', {
          type: 'button',
          textContent: 'Set start here',
          title: 'Start the section where the video is now',
          onclick: () => video && update({ start: Math.min(video.currentTime, c.end - 0.5) }),
        }),
        el('button', {
          type: 'button',
          textContent: 'Set end here',
          title: 'End the section where the video is now',
          onclick: () => video && update({ end: Math.max(video.currentTime, c.start + 0.5) }),
        }),
        el('button', {
          type: 'button',
          textContent: '▶ Preview',
          onclick: () => {
            if (!video) return;
            video.currentTime = c.start;
            stopAt = c.end;
            void video.play();
          },
        }),
        m.audio
          ? el('button', {
              type: 'button',
              textContent: c.sound ? '🔊 Sound on' : '🔇 Sound off',
              title: 'Sound off: the music keeps playing under this section',
              onclick: () => update({ sound: !c.sound }),
            })
          : null,
        clips.length > 1
          ? el('button', {
              type: 'button',
              class: 'remove',
              textContent: 'Remove part',
              onclick: () => {
                picks[list] = picks[list].filter((p) => p.key !== c.key);
                editing = clipsOf(m.id, list)[0]?.key ?? null;
                changed();
              },
            })
          : null,
      ),
    );
    panel.append(box);
  });
  panel.append(
    el('button', {
      type: 'button',
      class: 'add',
      textContent: `+ Use another part of this video ${where}`,
      title: 'Adds a new section starting where the video is now',
      onclick: () => {
        const start = Math.min(video?.currentTime ?? 0, m.duration - 0.5);
        const clip = { ...wholeClip(m), start, end: Math.min(m.duration, start + 10) };
        const last = picks[list].findLastIndex((p) => p.src === m.id);
        picks[list].splice(last + 1, 0, clip);
        editing = clip.key;
        changed();
      },
    }),
  );
}

// ---------- Crops ----------

/**
 * Photos cropped in card.config.json ("crop": { file: [left, top, width, height] }, as
 * fractions of the upright photo): make their pictures here, so the page shows what the
 * card will.
 */
async function loadCrops() {
  const crops = await fetch('/crops.json')
    .then((r) => r.json())
    .catch(() => ({}));
  const byFile = new Map(media.map((m) => [m.file, m]));
  await Promise.all(
    Object.entries(crops).map(async ([file, box]) => {
      const m = byFile.get(file);
      if (!m || m.kind !== 'photo') return;
      const img = new Image();
      img.src = m.view ? `/picker/${m.view}` : viewUrl(m);
      await img.decode();
      // Turn it first: the crop is of the photo as it will show.
      const deg = turn(m.id);
      const side = Math.abs(deg) === 90;
      const upright = document.createElement('canvas');
      upright.width = side ? img.naturalHeight : img.naturalWidth;
      upright.height = side ? img.naturalWidth : img.naturalHeight;
      const u = upright.getContext('2d');
      u.translate(upright.width / 2, upright.height / 2);
      u.rotate((deg * Math.PI) / 180);
      u.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      const [x, y, w, h] = box;
      const sx = x * upright.width;
      const sy = y * upright.height;
      const sw = w * upright.width;
      const sh = h * upright.height;
      const view = document.createElement('canvas');
      view.width = Math.round(sw);
      view.height = Math.round(sh);
      view.getContext('2d').drawImage(upright, sx, sy, sw, sh, 0, 0, view.width, view.height);
      // The grid's square: the middle of the crop.
      const thumb = document.createElement('canvas');
      thumb.width = thumb.height = 360;
      const s = Math.min(sw, sh);
      thumb
        .getContext('2d')
        .drawImage(upright, sx + (sw - s) / 2, sy + (sh - s) / 2, s, s, 0, 0, 360, 360);
      cropped.set(m.id, {
        view: view.toDataURL('image/jpeg', 0.9),
        thumb: thumb.toDataURL('image/jpeg', 0.85),
      });
    }),
  );
}

// ---------- Start ----------

async function start() {
  const [manifest, saved] = await Promise.all([
    fetch('/manifest.json').then((r) => r.json()),
    fetch('/picks.json').then((r) => r.json()),
  ]);
  media = manifest.items;
  byId = new Map(media.map((m) => [m.id, m]));
  picks = { ...picks, ...saved };
  // Drop anything whose file has gone from the folder.
  picks.items = picks.items.filter((p) => byId.has(p.src));
  picks.bonus = picks.bonus.filter((p) => byId.has(p.src));

  await loadCrops().catch(() => {});

  buildGrid();
  render();
  $('#save-status').textContent = picks.items.length ? 'Loaded your picks' : '';

  $('#photo-seconds').value = String(picks.photoSeconds);
  $('#photo-seconds').addEventListener('change', (e) => {
    const v = Number(e.target.value);
    if (v >= 0.5 && v <= 6) {
      picks.photoSeconds = v;
      changed();
    }
  });
  $('#sort-picks').addEventListener('click', () => {
    const what = showing === 'items' ? 'on the card' : 'in the bonus round';
    if (!confirm(`Put everything ${what} back in date order (oldest first)?`)) return;
    const date = (p) => byId.get(p.src).date ?? '';
    // Stable: parts of the same video keep their order.
    picks[showing] = picks[showing]
      .map((p, i) => [p, i])
      .sort((a, b) => date(a[0]).localeCompare(date(b[0])) || a[1] - b[1])
      .map(([p]) => p);
    changed();
  });
  for (const b of document.querySelectorAll('[data-filter]')) {
    b.addEventListener('click', () => {
      filter = b.dataset.filter;
      for (const o of document.querySelectorAll('[data-filter]')) {
        o.setAttribute('aria-pressed', String(o === b));
      }
      renderGrid();
    });
  }
  for (const tab of document.querySelectorAll('[data-list]')) {
    tab.addEventListener('click', () => {
      showing = tab.dataset.list;
      renderSequence();
    });
  }
  $('#rebuild').addEventListener('click', rebuild);
  $('#take-new').addEventListener('click', takeNew);
  $('#prev').addEventListener('click', () => step(-1));
  $('#next').addEventListener('click', () => step(1));
  $('#close').addEventListener('click', closeViewer);
  $('#viewer').addEventListener('close', () => {
    video?.pause();
    viewing = null;
  });
  $('#viewer').addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLVideoElement) return; // its own arrow keys seek
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
}

start().catch((err) => {
  document.body.textContent = `The picker couldn't load: ${err}. Did prepare.py run on this card folder?`;
});
