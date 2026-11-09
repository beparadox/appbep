/*
 * angrypackersfan.com, restored (2026). One script in place of the 2009 site's PHP, Prototype,
 * Scriptaculous and a dozen small scripts:
 * - the random header photo and banner (click the title for new ones), as in 2009
 * - the pages: pages/<name>.html loaded into the middle column, picked by the address
 *   (#home, #bio, #faq, #faq-q3, ...), with the toolbar arrows stepping through them
 * - the HEADLINES box on the home page, from /feeds/apf.json
 * - the Packers Quiz O' the Day: questions from /quizzes/apf.json, one per calendar day,
 *   Previous/Next to browse; votes counted by appbep.com's API, one per visitor per question
 */
(function () {
  'use strict';

  var QUIZ = 'apf';
  var ANSWERED_KEY = 'appbep-apf-answered';
  var PAGES = ['home', 'bio', 'faq', 'contact', 'sitemap', 'bow'];
  var TITLES = {
    home: 'APF HOME',
    bio: "APF's BIOGRAPHY",
    faq: 'APF FAQ',
    contact: 'CONTACT APF',
    sitemap: 'APF SITE MAP',
    bow: 'WI BUSINESS OF THE WEEK',
  };

  // ---------- 2009: header photo + banner (change_image.js, change_banner.js) ----------
  var BANNERS = [
    'Still Kicking Ass After All These Years',
    'I bet even Ditka is a secret Packers fan',
    'The Bears Still Suck',
    'The Vikings Still Suck',
    "Crankin' Skynyrd and Raisin' Hell",
    'Who won the first Super Bowls ever played?',
    'The Green Bay Packers: Kicking Ass Since 1919',
    'The Green and Gold are big and bold',
    "I wouldn't mind seeing Lovie get run over by a truck",
    "Blow me I'm a Packers Fan!",
    'Jay Cutler pees sitting down',
    'The One and Only',
    "I wouldn't mind seeing Childress get run over by a truck",
    'The Lions are downright awful',
    'Go You Packers Go Go',
    'Living the High Life since 1979',
    'Sconnie for Life',
    "I'm still pissed about Super Bowl XXIII",
    'Jet Favre can kiss my ass',
    'Wendell the High Life Man is a True American',
  ];
  var HEADER_IMAGES = [
    'apf_bearssuck.png',
    'apf_truamer.png',
    'apf_40_thumbsup.png',
    'apf_cheesehead.png',
    'apf_withleinie.png',
  ];

  // ---------- 2009: quiz snark (quizODay.js) ----------
  var RIGHT = [
    'Correct!',
    'Good Job!',
    'You are correct!',
    'Nice job smarty-pants.',
    'Well check out the big brain on you.',
    'Excellent job brainiac.',
    'Well done Einstein.',
    'Good for you Dr. Brain.',
    "I bet you think you're pretty smart.",
    "Well ain't you just a genius.",
  ];
  var WRONG = [
    "Sorry but that's wrong.",
    "You're wrong!",
    'Incorrect.',
    'Nope.',
    "Hate to break it to you, but you're wrong.",
    'No no no.',
    'Nice try but no cigar',
  ];
  var MAKE_CHOICE = [
    'You gotta make a choice first dumbass.',
    "Don't you think you should make a choice before you hit submit, dipshit?",
    "I can't tell you an answer if you haven't made a choice.",
    'Make a selection!!!!!',
    'You want an answer, make a selection first!',
    'Hey, ya gotta make a selection first.',
  ];

  function $(id) {
    return document.getElementById(id);
  }
  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }
  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      node.setAttribute(k, attrs[k]);
    });
    if (text !== undefined) node.textContent = text;
    return node;
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

  function changeBanner() {
    $('banner').textContent = pick(BANNERS);
  }
  function changeImage() {
    var src = 'img/' + pick(HEADER_IMAGES);
    $('header-image').src = src;
    $('header-image-right').src = src;
  }

  // ---------- text size (change_fontsize.js: 14px to 21px) ----------
  function fontSize(step) {
    var box = $('content-blog');
    var size = parseInt(box.style.fontSize, 10) || 16;
    box.style.fontSize = Math.min(21, Math.max(14, size + step)) + 'px';
  }

  // ---------- pages ----------
  var cache = {};
  var currentPage = null;

  function route() {
    var hash = location.hash.slice(1);
    if (hash === 'top') return; // the footer's "Top" link: just scroll, stay on this page
    var page = PAGES.indexOf(hash) >= 0 ? hash : /^faq-q\d+$/.test(hash) ? 'faq' : 'home';
    var anchor = page === 'faq' && hash !== 'faq' ? hash : null;
    showPage(page, anchor);
  }

  function showPage(page, anchor) {
    var load = cache[page]
      ? Promise.resolve(cache[page])
      : fetch('pages/' + page + '.html').then(function (res) {
          if (!res.ok) throw new Error(res.status);
          return res.text();
        });
    load
      .then(function (markup) {
        cache[page] = markup;
        if (currentPage !== page) {
          // Our own static files, so inserting them as HTML is safe.
          $('content-blog').innerHTML = markup;
          currentPage = page;
          document.title = TITLES[page];
          if (page === 'home') loadHeadlines();
        }
        var target = anchor && document.getElementById(anchor);
        if (target) target.scrollIntoView();
        else if (location.hash && location.hash !== '#top') $('content').scrollIntoView();
      })
      .catch(function () {
        $('content-blog').textContent = 'This page failed to load. Try reloading.';
      });
  }

  function stepPage(direction) {
    var i = PAGES.indexOf(currentPage || 'home');
    location.hash = PAGES[(i + direction + PAGES.length) % PAGES.length];
  }

  // ---------- headlines ----------
  var feeds = null;

  function ago(iso) {
    if (!iso) return '';
    var minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 60) return Math.max(minutes, 1) + ' min ago';
    var hours = Math.round(minutes / 60);
    if (hours < 48) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    return Math.round(hours / 24) + ' days ago';
  }

  function loadHeadlines() {
    (feeds ? Promise.resolve(feeds) : getJson('/feeds/apf.json')).then(function (file) {
      feeds = file;
      var tabs = $('feed-tabs');
      if (!tabs) return;
      if (!file || !file.feeds || !file.feeds.length) {
        $('feed-list').textContent = 'No headlines right now. Check back later.';
        return;
      }
      file.feeds.forEach(function (feed, i) {
        var b = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false' }, feed.label);
        b.addEventListener('click', function () {
          showFeed(i);
        });
        tabs.appendChild(b);
      });
      showFeed(0);
    });
  }

  function showFeed(i) {
    var tabs = $('feed-tabs').children;
    for (var t = 0; t < tabs.length; t += 1) tabs[t].setAttribute('aria-selected', String(t === i));
    var list = $('feed-list');
    list.textContent = '';
    var items = feeds.feeds[i].items || [];
    if (!items.length) list.textContent = 'No headlines right now. Check back later.';
    items.forEach(function (item) {
      var row = el('div', { class: 'headline' });
      row.appendChild(el('a', { href: item.link, target: '_blank', rel: 'noopener noreferrer' }, item.title));
      if (item.published) row.appendChild(el('span', { class: 'when' }, ' · ' + ago(item.published)));
      list.appendChild(row);
    });
  }

  // ---------- quiz ----------
  var questions = [];
  var current = 0;

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

  /** "2009-09-14" -> "9/14/09", as the 2009 site wrote its dates. */
  function shortDate(id) {
    var p = id.split('-');
    return Number(p[1]) + '/' + Number(p[2]) + '/' + p[0].slice(2);
  }

  /** One question per calendar day, the same for everyone on that day. */
  function todaysIndex() {
    var now = new Date();
    var day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    return day % questions.length;
  }

  function show(i) {
    current = i;
    var q = questions[i];
    $('quiz_question').textContent = q.question;
    $('quiz_num').textContent = shortDate(q.id);
    var box = $('quiz_choices');
    box.textContent = '';
    q.choices.forEach(function (choice, c) {
      var label = el('label', { class: 'quiz-choice' });
      var radio = el('input', { type: 'radio', name: 'option', value: String(c) });
      label.appendChild(radio);
      label.appendChild(el('span', { class: 'quiz_answer' }, choice));
      box.appendChild(label);
    });
    $('response').textContent = 'How well do you know the Packers?';
    $('submit').disabled = false;
    var mine = answered()[q.id];
    if (typeof mine === 'number') {
      reveal(q, mine, false);
      getJson('/api/quiz/' + QUIZ + '/' + q.id + '/tally').then(function (t) {
        if (questions[current] === q) showTally(q, t && t.counts);
      });
    }
  }

  function reveal(q, choice, fresh) {
    var right = choice === q.answer;
    var lines = [];
    if (fresh) lines.push(right ? pick(RIGHT) : pick(WRONG));
    else lines.push(right ? 'You got this one right.' : 'You already answered this one.');
    if (!right && q.responses[choice]) lines.push(q.responses[choice]);
    lines.push(q.explanation);
    $('response').textContent = lines.join('\n');
    $('submit').disabled = true;
    var rows = $('quiz_choices').children;
    for (var c = 0; c < rows.length; c += 1) {
      var radio = rows[c].querySelector('input');
      radio.disabled = true;
      radio.checked = c === choice;
      if (c === q.answer) rows[c].classList.add('correct');
      if (c === choice) rows[c].classList.add('mine');
    }
  }

  function showTally(q, counts) {
    var old = $('total_votes');
    if (old) old.remove();
    var line = el('span', { id: 'total_votes' });
    if (!counts) {
      line.textContent = "(today's vote counts are unavailable)";
    } else {
      var total = counts.reduce(function (a, b) {
        return a + b;
      }, 0);
      var rows = $('quiz_choices').children;
      for (var c = 0; c < rows.length; c += 1) {
        var pct = total ? Math.round((100 * (counts[c] || 0)) / total) : 0;
        rows[c].appendChild(el('span', { class: 'pct' }, pct + '%'));
      }
      line.textContent = 'Total votes: ' + total;
    }
    $('quiz_ans_row').appendChild(line);
  }

  function submit() {
    var q = questions[current];
    var picked = document.querySelector('#quiz_choices input:checked');
    if (!picked) {
      $('response').textContent = pick(MAKE_CHOICE);
      return;
    }
    var choice = Number(picked.value);
    $('submit').disabled = true;
    $('response').textContent = '...checking your answer';
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
        // Anything else (API not set up, offline): still show the answer, just no new vote.
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

  function step(direction) {
    if (!questions.length) return;
    show((current + direction + questions.length) % questions.length);
  }

  function loadQuiz() {
    getJson('/quizzes/' + QUIZ + '.json').then(function (file) {
      if (!file || !file.questions || !file.questions.length) {
        $('quiz_question').textContent = 'The quiz failed to load. Try reloading.';
        return;
      }
      questions = file.questions;
      show(todaysIndex());
    });
  }

  // ---------- wiring ----------
  function on(id, fn) {
    $(id).addEventListener('click', function (e) {
      e.preventDefault();
      fn();
    });
  }

  on('apf_title', function () {
    changeImage();
    changeBanner();
  });
  on('font-up', function () {
    fontSize(1);
  });
  on('font-down', function () {
    fontSize(-1);
  });
  on('page-prev', function () {
    stepPage(-1);
  });
  on('page-next', function () {
    stepPage(1);
  });
  on('submit', submit);
  on('quiz_previous', function () {
    step(-1);
  });
  on('quiz_next', function () {
    step(1);
  });

  // Touch screens have no hover: a tap on a menu header opens it, a tap elsewhere closes it.
  document.addEventListener('click', function (e) {
    var header = e.target.closest && e.target.closest('.menu-header');
    var items = document.querySelectorAll('ul.menu > li.menu');
    for (var i = 0; i < items.length; i += 1) {
      if (!header || items[i] !== header.parentNode) items[i].classList.remove('open');
    }
    if (header) header.parentNode.classList.toggle('open');
  });

  window.addEventListener('hashchange', route);
  changeImage();
  changeBanner();
  route();
  loadQuiz();
})();
