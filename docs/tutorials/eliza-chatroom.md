# Tutorial: ELIZA in a 1998 chat room

**You write the code; this guide tells you what to build, in what order, and how to know it works.**
It's the spiritual successor to bepchat: a `#funhouse` chat room where the only other person
online is ELIZA, the first chatbot (1966), speaking in one of several "voices".

| What's already here (given)                                                                                | What you build                                          |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`web/src/chat/eliza/types.ts`](../../web/src/chat/eliza/types.ts): the data model                         | `engine.ts`: the five stubbed functions (steps 1–5)     |
| [`web/src/chat/eliza/engine.ts`](../../web/src/chat/eliza/engine.ts): stubs with signatures + examples     | `web/src/chat/voices/*.ts`: the personalities (step 6)  |
| [`web/src/chat/eliza/engine.test.ts`](../../web/src/chat/eliza/engine.test.ts): 18 tests, skipped per step | The chat room UI (steps 7–9) and its funhouse room (10) |

Rough effort: engine 2–4 hours, first voice 1–2 hours, UI an evening or two. Every step ends in a
working, committable state, so you can stop anywhere.

---

## Background: how ELIZA works (read this first)

Joseph Weizenbaum wrote ELIZA at MIT in 1964–66. Its most famous script, DOCTOR, imitated a
therapist who mostly turns your statements back into questions. It had **no understanding at all**,
yet people confided in it, and Weizenbaum's own secretary asked him to leave the room so she could
talk to it privately. That reaction is now called **the ELIZA effect**: our tendency to read
understanding into anything that talks back.

The whole trick is five moves:

```
"Well, I feel sad about my job!"
   │ 1. normalize        "well i feel sad about my job"
   │ 2. find keywords    "feel" (rank 1)   ← highest-ranked keyword present wins
   │ 3. decompose        pattern "* i feel *"  →  captures ["well", "sad about my job"]
   │ 4. reflect          "sad about my job"  →  "sad about your job"
   │ 5. reassemble       "Why do you feel (2)?"  →  "Why do you feel sad about your job?"
   ▼
"Why do you feel sad about your job?"
```

If no keyword matches, ELIZA says something noncommittal ("Please go on."). That's it. The
engine is maybe 80 lines; the personality is all data. That split, **engine vs. script**, is
the most important design idea here, and it's why "voices" are easy: same engine, different data.

Worth reading (short): Weizenbaum, _"ELIZA: A Computer Program for the Study of Natural Language
Communication Between Man and Machine"_, Communications of the ACM, January 1966. It's free
online and very readable; the DOCTOR script is in the appendix.

---

## How to work through this

1. **Branch first.** `git switch -c eliza` (never commit straight to `main`).
2. **Run the tests in watch mode:** `npm test -w web -- --watch eliza`
3. For each step, open `engine.test.ts`, change that step's `describe.skip(` to `describe(`.
   Watch the tests go red. Write code in `engine.ts` until they go green. Commit.
4. When the engine is done, delete the `todo()` helper at the top of `engine.ts`.
5. At the end, push the branch and **open a pull request**. Watch CI run on your PR
   (the deploy workflow won't fire for a PR, only after you merge to `main`).

Rules of thumb: keep functions pure (input → output, no globals) except the `Eliza` class,
which owns the "which reply is next" state. No new dependencies needed for the engine.

---

## Step 1: `normalize(input, substitutions)`

Make raw input matchable.

- lowercase
- replace everything except letters, digits, apostrophes and whitespace with a space
- collapse runs of whitespace to one space; trim
- then apply `substitutions` to **whole words** (`dont` → `don't`, but `dontcha` stays)

**Hints:** one `replace` with a regex character class handles punctuation (`/[^a-z0-9'\s]/g`).
For whole-word substitution, the easiest correct approach is `split(' ')`, map each word, `join(' ')`.

**Done when:** the 3 step-1 tests pass.

## Step 2: `matchPattern(pattern, input)`

The heart of ELIZA. Patterns are words plus `*` wildcards. Each `*` captures zero or more words.

```
matchPattern('* i feel *', 'well i feel sad today')  →  ['well', 'sad today']
matchPattern('* i feel *', 'i feel')                 →  ['', '']
matchPattern('* i feel *', 'you feel sad')           →  null
matchPattern('* am *',     'i ham it up')            →  null   (whole words only!)
```

Two good approaches; pick one:

- **Regex:** turn the pattern into a regular expression. `*` becomes a capture group `(.*)`;
  each literal word becomes `\bword\b` (escape it first); glue tokens with `\s*`; anchor with `^…$`.
  Then `exec`, take the groups, and `trim()` each one.
- **Token matching (recursive):** split both into word arrays and write a function that tries
  every possible length for each `*`. More code, but you'll understand exactly why it works.
  This is how the 1966 version did it.

**Watch out:** with two `*`s the first one is greedy if you use `(.*)`. That's fine for these
tests, but think about which capture gets the words when a keyword appears twice. (Real ELIZA
scripts are written so it rarely matters.)

**Done when:** the 5 step-2 tests pass.

## Step 3: `reflect(fragment, reflections)`

Swap first/second person, **word by word, each word once**:

```
reflect('my mother hates me', { my: 'your', me: 'you' })  →  'your mother hates you'
reflect('i love you', { i: 'you', you: 'I' })              →  'you love I'
```

**The classic bug:** doing the swaps as a series of global string replacements (`i`→`you`, then
`you`→`i`) turns everything back. Mapping each word exactly once avoids it.

(Yes, "you love I" is ungrammatical. Real ELIZA had the same problem. Your voices can avoid
templates where it shows.)

## Step 4: `fillReply(template, captures, reflections)`

Replace `(1)`, `(2)`, … with the matching capture **after reflecting it**. Templates without
placeholders come back unchanged.

**Hint:** `template.replace(/\((\d+)\)/g, (_, n) => …)`. Remember `(1)` is `captures[0]`.

## Step 5: the `Eliza` class

Implement `isQuit` and `respond`, following the numbered comment in `engine.ts`:

1. normalize (with the voice's substitutions)
2. quit word → `voice.goodbye`
3. keywords present in the input (whole words), **sorted by rank, highest first**
4. for each keyword, try its rules in order; the first pattern that matches wins
5. use that rule's **next** reply. Replies cycle: 1st, 2nd, …, back to 1st. This needs state:
   a counter per rule (a `Map` keyed by the rule or its replies array works well)
6. nothing matched → the next fallback (also cycling)

**Done when:** all 18 tests pass. 🎉 Commit, and delete the `todo()` helper.

---

## Step 6: voices

Create `web/src/chat/voices/` with one file per voice, each exporting a `Voice`, plus an
`index.ts` that exports the list: `export const VOICES: Voice[] = [doctor, …]`.

Start with **`doctor.ts`, the classic therapist.** Aim for 15–25 keywords. Good ones to cover:
`i feel`, `i am`, `i want`, `i can't`, `my` + family words, `you` (talking about ELIZA),
`yes`, `no`, `because`, `why`, `always`, `dream`, `sorry`, `computer`, `perhaps`, `hello`.

- Write the replies yourself, _inspired by_ the 1966 script (read the paper's appendix); don't
  paste someone else's modern JS port, which comes with its own license.
- A good `reflections` table matters more than you'd think: `i/you`, `me/you`, `my/your`,
  `am/are`, `was/were`, `i'm/you're`, `i'd/you'd`, `myself/yourself`, and the reverse directions.
- Give rank to specificity: `computer` should outrank `feel`; family words outrank `my`.
- Then add more voices whenever you like (Angry Packers Fan? A 1998 AOL teenager? A haunted-house
  butler?). Each voice should be **pure data**; if a voice needs engine changes, that's a
  sign to improve the engine for everyone.

**Optional test:** a test that runs every voice through a dozen inputs and asserts it never
throws, never returns an empty string, and never leaves a literal `(1)` in the output.

---

## Step 7: the chat room component

Create `web/src/chat/ChatRoom.tsx` (+ `chatroom.css`). Target look, 1998 chat client:

```
┌─ #funhouse ─────────────────────────────────────────── _ □ x ┐
│ *** You have joined #funhouse                    │ ONLINE (2)│
│ *** ELIZA has joined #funhouse                   │           │
│ <ELIZA> How do you do. Please tell me your       │ 😐 ELIZA  │
│         problem.                                 │ 🙂 You    │
│ <You> i feel weird                               │           │
│ <ELIZA> Why do you feel weird?                   │ voice:    │
│ ELIZA is typing...                               │ [ELIZA ▼] │
├──────────────────────────────────────────────────┴───────────┤
│ [ type a message...                              ] [ Send ]  │
└──────────────────────────────────────────────────────────────┘
```

Behavior checklist:

- [ ] Messages live in React state: `{ id, from: 'you' | 'bot' | 'system', text, time }[]`
- [ ] On mount: two system lines (`*** You have joined`, `*** ELIZA has joined`), then the greeting
- [ ] Submit with Enter or the button; ignore empty input; clear the box after sending
- [ ] Bot replies after a **fake typing delay** (e.g. 600ms + 30ms per character, capped),
      showing "ELIZA is typing…". This tiny delay is a big part of the ELIZA effect.
- [ ] Clear the pending reply timer if the component unmounts (`useEffect` cleanup)
- [ ] Auto-scroll to the newest message
- [ ] Quit word → goodbye, then `*** ELIZA has left #funhouse`, and the input disables
- [ ] Hold the `Eliza` instance in a `useRef` (it has state; it must not be recreated each render)

Accessibility checklist:

- [ ] The message list has `role="log"` and `aria-live="polite"` so screen readers announce replies
- [ ] The input has a real `<label>` (it can be visually hidden)
- [ ] Respect `prefers-reduced-motion` for any blinking/scrolling effects
- [ ] Works on a phone: the input stays visible when the keyboard opens (test on your phone!)

## Step 8: voice picker

A `<select>` of `VOICES`. Switching voices should feel like people coming and going:
`*** ELIZA has left #funhouse`, `*** APF_HEAD has joined #funhouse`, then the new greeting.
Create a **new** `Eliza` for the new voice (fresh reply counters).

## Step 9: sound (optional)

`web/src/funhouse/sound.ts` already synthesizes effects. Add an `'im'` sound (a short two-note
"bloop", like an instant-messenger chime) to the `SFX` table, and play it when a bot message
arrives, using the funhouse's `sound` setting from `useFunhouse()`.

## Step 10: put it in the funhouse

- `web/src/funhouse/rooms.ts`: add a `chatroom` room (pick a spot on the floor plan that's free).
- In the `room1998` room, the door **"Enter the chat room"** currently leads into a wall
  ("down for maintenance"). Change it to `to: 'chatroom'`.
- `web/src/exhibits/registry.ts`: add an `eliza` exhibit (kind `'app'`) with a plaque. Write the
  lesson yourself; the ELIZA effect is the obvious nugget.
- Render `<ChatRoom />` for that room. Simplest: in `Room.tsx`, `{room.id === 'chatroom' && <ChatRoom />}`
  (the 1998 room already does this trick for its marquee).

---

## Definition of done

- [ ] `npm run check` passes locally (format, lint, types, tests, build, synth, secret scan)
- [ ] All 18 engine tests un-skipped and green
- [ ] At least one voice with 15+ keywords
- [ ] You can hold a 10-message conversation without seeing `(1)`, `undefined` or a crash
- [ ] Tried on your phone over the LAN (`npm run dev:lan`)
- [ ] PR opened from your `eliza` branch, CI green, merged → watch the Deploy workflow ship it

## Stretch goals

- **Memory (from the 1966 paper):** when a `my …` rule fires, also store a reworded version
  ("Earlier you said your …"). When nothing matches later, sometimes use a memory instead of a fallback.
- **Keyword aliases (synonyms):** let a keyword list several words (`mother|mom|mum`).
- **Rule redirects:** a reply like `goto:what` jumps to another keyword's rules (the original had this).
- **Then and now:** a plaque comparing ELIZA's ~100 lines of rules to a modern language model.
- **UI tests:** add `@testing-library/react` + `jsdom` (dev dependencies) and test the
  "typing…" delay with Vitest's fake timers (`vi.useFakeTimers()`).
