/**
 * Talks to the N-Puzzle leaderboard API (added 2026; replaces the old App Engine server).
 * The API's contract is api/src/npuzzle/contract.ts in the repo.
 *
 * Every function resolves (never rejects) so the game can't crash on a network problem.
 * If the API isn't there yet (404/501 while it's being built) or can't be reached,
 * `challenge()` and `board()` resolve to null and the game plays "offline": same game,
 * no leaderboard.
 */
define([], function () {
  'use strict';

  var BASE = '/api/scores/npuzzle';

  function request(method, url, body) {
    var options = { method: method, headers: { accept: 'application/json' } };
    if (body !== undefined) {
      options.headers['content-type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    return fetch(url, options)
      .then(function (res) {
        var isJson = (res.headers.get('content-type') || '').indexOf('application/json') !== -1;
        return (isJson ? res.json() : Promise.resolve(null)).then(function (data) {
          return { status: res.status, data: data };
        });
      })
      .catch(function () {
        return { status: 0, data: null }; // offline / blocked
      });
  }

  /** "1:05.3" from milliseconds. */
  function formatTime(ms) {
    var tenths = Math.floor(ms / 100);
    var minutes = Math.floor(tenths / 600);
    var seconds = (tenths % 600) / 10;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds.toFixed(1);
  }

  return {
    formatTime: formatTime,

    /** Resolves to { id, state } or null (play offline). */
    challenge: function () {
      return request('POST', BASE + '/challenge').then(function (r) {
        var ok = r.status === 201 && r.data && typeof r.data.id === 'string' && Array.isArray(r.data.state);
        return ok ? r.data : null;
      });
    },

    /**
     * Resolves to { ok: true, data: { moves, timeMs } } or
     * { ok: false, error: 'invalid_name' | 'unknown_challenge' | ... | 'network' }.
     */
    submit: function (challengeId, name, actions) {
      return request('POST', BASE, { challengeId: challengeId, name: name, actions: actions }).then(
        function (r) {
          if (r.status === 201 && r.data) return { ok: true, data: r.data };
          return { ok: false, error: (r.data && r.data.error) || (r.status === 429 ? 'busy' : 'network') };
        }
      );
    },

    /** Resolves to a BoardResponse or null. */
    board: function (board, by) {
      var url = BASE + '?board=' + encodeURIComponent(board) + '&by=' + encodeURIComponent(by);
      return request('GET', url).then(function (r) {
        return r.status === 200 && r.data && Array.isArray(r.data.entries) ? r.data : null;
      });
    },
  };
});
