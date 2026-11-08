/*
 * schportz.com, restored (2026). Replaces schportz_quiz.js, schportzJS.js and the PHP behind
 * them, keeping how the 2011 page behaved:
 *  - one question at a time, << and >> to move through them (within a category if one is set),
 *    "Get by date" to jump to a question by its original date
 *  - Submit shows the answer, types out the explanation, and shows each choice's share of
 *    the votes
 *  - Sports Headlines tabs, Google first
 * What's new: the page opens on a "question of the day" (it cycles through all 33 questions,
 * one per day), votes are counted by appbep.com's API, and the 2010 vote counts recovered
 * from the old database are added in. Questions you've answered are remembered in this
 * browser, so coming back shows your answer instead of asking again.
 */
(function () {
  'use strict';

  var QUIZ = 'schportz';
  var ANSWERED_KEY = 'appbep-schportz-answered';
  var FEED_ORDER = ['google', 'yahoo', 'cbs', 'espn', 'nfl', 'nba', 'mlb', 'nhl'];

  var questions = [];
  var current = 0;
  var typing = null;

  function $(id) {
    return document.getElementById(id);
  }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      node.setAttribute(k, attrs[k]);
    });
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ---------- remembered answers (this browser only) ----------
  function answered() {
    try {
      return JSON.parse(localStorage.getItem(ANSWERED_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }
  function remember(id, choice) {
    var all = answered();
    all[id] = choice;
    try {
      localStorage.setItem(ANSWERED_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  // ---------- dates ----------
  /** "2011-07-18" -> "07/18/11", as the 2011 page wrote them. */
  function shortDate(id) {
    var p = id.split('-');
    return p[1] + '/' + p[2] + '/' + p[0].slice(2);
  }
  /** "7/18/11", "07/18/2011" or "2011-07-18" -> "2011-07-18" (or null). */
  function parseDate(text) {
    var m = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$/.exec(text);
    if (m) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
    m = /^\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})\s*$/.exec(text);
    if (!m) return null;
    var year = m[3].length === 2 ? '20' + m[3] : m[3];
    return year + '-' + pad(m[1]) + '-' + pad(m[2]);
  }
  function pad(n) {
    return ('0' + n).slice(-2);
  }
  /** Same question all day, a different one tomorrow (by the visitor's local date). */
  function questionOfTheDay() {
    var now = new Date();
    var day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    return day % questions.length;
  }

  // ---------- quiz ----------
  function category() {
    return $('quiz_sports_select').value;
  }

  function step(direction) {
    var cat = category();
    for (var n = 1; n <= questions.length; n += 1) {
      var i = (current + direction * n + questions.length * n) % questions.length;
      if (cat === 'ALL' || questions[i].sport.toUpperCase() === cat) {
        show(i);
        return;
      }
    }
  }

  function show(index) {
    var q = questions[index];
    current = index;
    if (typing) clearInterval(typing);
    $('quiz_question').textContent = shortDate(q.id) + ': ' + q.question;
    $('quiz_category_text').textContent = q.sport.toUpperCase();
    $('quiz_date').textContent = shortDate(q.id);
    $('quiz_response').style.display = 'none';
    $('quiz_response').textContent = '';
    $('quiz_response_filler').style.display = '';
    $('total_votes_txt').style.display = 'none';

    var box = $('quiz-answers');
    box.textContent = '';
    q.choices.forEach(function (choice, i) {
      var row = el('div', { id: 'answers-' + i, class: 'quiz-answers-rows' });
      var radioCell = el('div', { style: 'float: left; height: 100%; width: 10%' });
      var radio = el('input', {
        type: 'radio',
        name: 'option',
        class: 'quiz-radio-button',
        id: 'option' + i,
        value: String(i),
      });
      radio.addEventListener('change', function () {
        $('qod_submit').disabled = false;
      });
      radioCell.appendChild(radio);
      var ansCell = el('div', { style: 'float: left; height: 100%; width: 70%' });
      ansCell.appendChild(el('label', { class: 'quiz_answer', id: 'ans' + i, for: 'option' + i }, choice));
      var choseCell = el('div', { style: 'float: left; height: 100%; width: 20%' });
      choseCell.appendChild(el('div', { class: 'quiz_chose', id: 'chose' + i, style: 'display: none' }));
      row.appendChild(radioCell);
      row.appendChild(ansCell);
      row.appendChild(choseCell);
      box.appendChild(row);
    });

    var mine = answered()[q.id];
    $('qod_submit').disabled = true;
    if (mine !== undefined) {
      $('option' + mine).checked = true;
      reveal(q, mine, false);
      getJson('/api/quiz/' + QUIZ + '/' + q.id + '/tally').then(function (t) {
        if (questions[current] === q) showTally(q, t && t.counts);
      });
    }
  }

  function lockChoices(q, mine) {
    for (var i = 0; i < 5; i += 1) {
      $('option' + i).disabled = true;
      var row = $('answers-' + i);
      if (i === q.answer) row.className += ' correct';
      if (i === mine) row.className += ' mine';
    }
    $('qod_submit').disabled = true;
  }

  /** The answer panel: "Answer: X", then the explanation typed out like the 2011 page did. */
  function reveal(q, mine, animate) {
    lockChoices(q, mine);
    var text = q.responses[mine];
    if (mine !== q.answer) text += '  ' + q.responses[q.answer];
    var panel = $('quiz_response');
    panel.textContent = '';
    var head = el('span', { style: 'font-style: italic; margin-left: 3px' }, 'Answer: ' + q.choices[q.answer]);
    panel.appendChild(head);
    panel.appendChild(el('br'));
    panel.appendChild(el('br'));
    var body = panel.appendChild(document.createTextNode(''));
    $('quiz_response_filler').style.display = 'none';
    panel.style.display = 'block';
    if (!animate) {
      body.nodeValue = text;
      return;
    }
    var i = 0;
    typing = setInterval(function () {
      body.nodeValue += text.charAt(i);
      i += 1;
      if (i >= text.length) clearInterval(typing);
    }, 42);
  }

  function showTally(q, counts) {
    var old = q.votes2010 || [0, 0, 0, 0, 0];
    var live = counts || [0, 0, 0, 0, 0];
    var totals = [0, 1, 2, 3, 4].map(function (i) {
      return (old[i] || 0) + (live[i] || 0);
    });
    var sum = totals.reduce(function (a, b) {
      return a + b;
    }, 0);
    var oldSum = old.reduce(function (a, b) {
      return a + b;
    }, 0);
    totals.forEach(function (n, i) {
      var cell = $('chose' + i);
      cell.textContent = sum > 0 ? ((n / sum) * 100).toFixed(1) + '%' : '0%';
      cell.style.display = 'block';
    });
    var line = 'Total votes: ' + sum;
    if (oldSum > 0) line += ' (' + oldSum + ' from 2010)';
    if (!counts) line += ' (today’s votes unavailable)';
    $('total_votes_txt').textContent = line;
    $('total_votes_txt').style.display = 'block';
  }

  function submit() {
    var q = questions[current];
    var picked = document.querySelector('input[name=option]:checked');
    if (!picked) return;
    var choice = Number(picked.value);
    $('qod_submit').disabled = true;
    fetch('/api/quiz/' + QUIZ + '/' + q.id + '/vote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ choice: choice }),
    })
      .then(function (res) {
        return res.json().then(
          function (data) {
            return { status: res.status, data: data };
          },
          function () {
            return { status: res.status, data: null };
          }
        );
      })
      .catch(function () {
        return { status: 0, data: null };
      })
      .then(function (r) {
        // Counted (201) or counted before (409): either way, this visitor has answered.
        // Anything else (API not set up yet, offline): still show the answer, just no new vote.
        var tally = r.status === 201 ? r.data : r.status === 409 && r.data ? r.data.tally : null;
        remember(q.id, choice);
        if (questions[current] !== q) return;
        reveal(q, choice, true);
        if (tally) {
          showTally(q, tally.counts);
        } else {
          getJson('/api/quiz/' + QUIZ + '/' + q.id + '/tally').then(function (t) {
            if (questions[current] === q) showTally(q, t && t.counts);
          });
        }
      });
  }

  function warn(text) {
    var box = $('quiz_warnings');
    box.textContent = text;
    setTimeout(function () {
      if (box.textContent === text) box.textContent = '';
    }, 4000);
  }

  function byDate(e) {
    e.preventDefault();
    var id = parseDate($('quiz_search_date').value);
    if (!id) {
      warn('Use a date like 07/18/11.');
      return;
    }
    for (var i = 0; i < questions.length; i += 1) {
      if (questions[i].id === id) {
        $('quiz_sports_select').value = 'ALL';
        show(i);
        return;
      }
    }
    warn('No quiz on ' + shortDate(id) + '.');
  }

  function getJson(url) {
    return fetch(url)
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .catch(function () {
        return null;
      });
  }

  // ---------- headlines ----------
  var feeds = {};

  function ago(iso) {
    if (!iso) return '';
    var minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return minutes + ' min ago';
    var hours = Math.round(minutes / 60);
    if (hours < 48) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    return Math.round(hours / 24) + ' days ago';
  }

  function showFeed(id) {
    var tabs = document.querySelectorAll('.gf_schp_hl');
    for (var i = 0; i < tabs.length; i += 1) {
      var on = tabs[i].getAttribute('data-feed') === id;
      tabs[i].className = 'gf_schp_hl cursor' + (on ? ' active' : '');
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    var box = $('schportz_feed_control');
    box.textContent = '';
    var feed = feeds[id];
    if (!feed || !feed.items.length) {
      box.appendChild(el('div', { class: 'feed-note' }, 'No headlines right now. Check back soon.'));
      return;
    }
    feed.items.forEach(function (item) {
      var row = el('div', { class: 'headline' });
      var a = el('a', { href: item.link, target: '_blank', rel: 'noopener noreferrer' }, item.title);
      row.appendChild(a);
      if (item.published) row.appendChild(el('span', { class: 'when' }, ' · ' + ago(item.published)));
      box.appendChild(row);
    });
    if (feed.fetchedAt) {
      box.appendChild(el('div', { class: 'feed-note' }, 'From ' + feed.label + ', checked ' + ago(feed.fetchedAt) + '.'));
    }
  }

  function loadFeeds() {
    getJson('/feeds/schportz.json').then(function (file) {
      var tabs = $('choose_feed_control');
      if (!file || !file.feeds) {
        $('schportz_feed_control').textContent = 'Headlines are on their way. Check back in a few minutes.';
        return;
      }
      file.feeds.forEach(function (f) {
        feeds[f.id] = f;
      });
      FEED_ORDER.forEach(function (id) {
        if (!feeds[id]) return;
        var tab = el('div', { class: 'gf_schp_hl cursor', role: 'tab', tabindex: '0', 'data-feed': id }, feeds[id].label);
        tab.addEventListener('click', function () {
          showFeed(id);
        });
        tab.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showFeed(id);
          }
        });
        tabs.appendChild(tab);
      });
      showFeed(FEED_ORDER[0]);
    });
  }

  // ---------- start ----------
  function start() {
    $('quiz_previous').addEventListener('click', function () {
      step(-1);
    });
    $('quiz_next').addEventListener('click', function () {
      step(1);
    });
    $('qod_submit').addEventListener('click', submit);
    $('quiz_search_form').addEventListener('submit', byDate);
    $('quiz_sports_select').addEventListener('change', function () {
      if (category() !== 'ALL' && questions[current].sport.toUpperCase() !== category()) step(1);
    });

    getJson('/quizzes/schportz.json').then(function (data) {
      if (!data || !data.questions || !data.questions.length) {
        $('quiz_question').textContent = 'The quiz could not be loaded. Please try again later.';
        return;
      }
      questions = data.questions;
      var sports = [];
      questions.forEach(function (q) {
        var s = q.sport.toUpperCase();
        if (sports.indexOf(s) === -1) sports.push(s);
      });
      sports.sort().forEach(function (s) {
        $('quiz_sports_select').appendChild(el('option', {}, s));
      });
      $('quiz_by_date_earliest').textContent = shortDate(questions[0].id);
      show(questionOfTheDay());
    });
    loadFeeds();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
