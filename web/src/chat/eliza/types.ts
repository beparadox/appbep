/**
 * ELIZA's data model. This file is GIVEN (tutorial step 0): read it, don't change it
 * unless you decide the design should change. See docs/tutorials/eliza-chatroom.md.
 *
 * The big idea: the ENGINE (engine.ts) knows nothing about therapy, Packers, or
 * anything else. All personality lives in a VOICE: a plain data object of keywords,
 * patterns and canned replies. Same engine + different voice = different chatbot.
 */

/** One way to take apart an input, and the replies to use when it matches. */
export interface Rule {
  /**
   * A decomposition pattern. Words must match exactly; `*` matches any number of
   * words (including none) and is CAPTURED. Example: "* i feel *" on
   * "well i feel sad today" captures ["well", "sad today"].
   */
  pattern: string;
  /**
   * Reassembly templates. "(1)", "(2)"… insert the captured fragments, after
   * pronoun reflection. Example: "Why do you feel (2)?" -> "Why do you feel sad today?"
   * Replies are used in order and cycle, like the 1966 original (not random).
   */
  replies: string[];
}

/** A word ELIZA listens for. Higher rank wins when several keywords appear. */
export interface Keyword {
  word: string;
  rank: number;
  rules: Rule[];
}

/** A chatbot personality. */
export interface Voice {
  id: string;
  /** Shown in the voice picker, e.g. "ELIZA (1966)". */
  name: string;
  /** Screen name in the chat room, e.g. "ELIZA". */
  screenName: string;
  /** First thing the bot says when it joins the room. */
  greeting: string;
  /** Said when the user types one of `quitWords`. */
  goodbye: string;
  quitWords: string[];
  /** Pronoun swaps applied to captured fragments: { i: 'you', my: 'your', am: 'are', … }. */
  reflections: Record<string, string>;
  /** Optional word swaps applied to the whole input before matching (e.g. { "dont": "don't" }). */
  substitutions?: Record<string, string>;
  keywords: Keyword[];
  /** Used (cycling) when no keyword matches. */
  fallbacks: string[];
}
