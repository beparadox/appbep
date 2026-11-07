/*
 * On-screen controls for WTF Blaster on touch screens (added 2026).
 *
 * The game only knows the keyboard: it reads `document.body.onkeydown` / `onkeyup` and looks
 * at `event.keyCode`. Each button here calls those same handlers with a small fake event,
 * so the game code doesn't need to know touch exists. Holding a button = holding the key.
 */
(function () {
  'use strict';

  var KEYS = { up: 38, down: 40, left: 37, right: 39, fire: 32 };

  // The game checks which keys are down once per animation frame. A quick tap can press
  // and release between two frames, and the game would never see it, so every press
  // lasts at least this long.
  var MIN_PRESS_MS = 60;

  function send(type, keyCode) {
    var handler = type === 'keydown' ? document.body.onkeydown : document.body.onkeyup;
    if (typeof handler === 'function') {
      handler({ type: type, keyCode: keyCode, preventDefault: function () {} });
    }
  }

  function wire(button) {
    var keyCode = KEYS[button.getAttribute('data-key')];
    var held = false;
    var pressedAt = 0;

    function press(e) {
      e.preventDefault();
      if (held) return;
      held = true;
      pressedAt = Date.now();
      button.classList.add('held');
      // Keep getting this pointer's events even if the finger slides off the button.
      if (button.setPointerCapture) button.setPointerCapture(e.pointerId);
      send('keydown', keyCode);
    }

    function release() {
      if (!held) return;
      held = false;
      button.classList.remove('held');
      var wait = Math.max(0, MIN_PRESS_MS - (Date.now() - pressedAt));
      setTimeout(function () {
        // Pressed again during the wait? Then that press owns the key now.
        if (!held) send('keyup', keyCode);
      }, wait);
    }

    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    // No long-press menu or text selection on the buttons.
    button.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
  }

  window.addEventListener('load', function () {
    var pad = document.getElementById('touch-controls');
    if (!pad) return;
    var buttons = pad.querySelectorAll('[data-key]');
    for (var i = 0; i < buttons.length; i += 1) wire(buttons[i]);
  });
})();
