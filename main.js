(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Theme toggle ---------- */
  try { var saved = localStorage.getItem('if-theme'); if (saved) root.setAttribute('data-theme', saved); } catch (e) {}
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  var tbtn = $('#themeToggle');
  function syncThemeLabel() { if (tbtn) tbtn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode'); }
  syncThemeLabel();
  if (tbtn) tbtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('if-theme', next); } catch (e) {}
    syncThemeLabel();
  });

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- Text scramble ---------- */
  var glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/';
  function scramble(el, finalText, dur) {
    if (reduce) { el.textContent = finalText; return; }
    var start = null, len = finalText.length;
    dur = dur || 700;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur), out = '';
      for (var i = 0; i < len; i++) {
        var ch = finalText[i];
        if (ch === ' ' || i / len < p) out += ch;
        else out += glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame); else el.textContent = finalText;
    }
    requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { scramble(en.target, en.target.getAttribute('data-text'), 650); so.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    $$('[data-scramble]').forEach(function (el) { el.setAttribute('data-text', el.textContent); so.observe(el); });
  }

  /* ---------- Hero live state ---------- */
  var live = $('#liveState');
  if (live && !reduce) {
    var states = [
      ['Approved', 'var(--ok)'], ['In review', 'var(--review)'], ['Blocked', 'var(--block)'],
      ['Payment failed', 'var(--block)'], ['Retrying', 'var(--warn)'], ['Live', 'var(--ok)']
    ];
    var si = 0;
    setInterval(function () {
      si = (si + 1) % states.length;
      live.style.color = states[si][1];
      live.style.background = 'color-mix(in srgb, ' + states[si][1] + ' 10%, var(--sheet))';
      scramble(live, states[si][0], 380);
    }, 2000);
  }

  /* ---------- Section tracking: pill nav, side ticks, case-study TOC ---------- */
  var tracked = $$('[data-track]');
  if (tracked.length && 'IntersectionObserver' in window) {
    var bigN = $('#tocNum'), cur = $('#tocCur');
    var to = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        $$('[data-nav]').forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + id); });
        $$('.ticks a, .toc a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + id); });
        if (bigN && en.target.getAttribute('data-n')) bigN.textContent = en.target.getAttribute('data-n');
        if (cur && en.target.getAttribute('data-title')) cur.textContent = en.target.getAttribute('data-title');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    tracked.forEach(function (s) { to.observe(s); });
  }

  /* ---------- Helpers for demos ---------- */
  function setChip(el, cls, text) {
    el.className = 'chip ' + cls;
    el.textContent = text;
    var row = el.closest('.demo-row, .demo-head');
    if (row && !reduce) { row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); }
  }
  function onceVisible(el, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var o = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { fn(); o.disconnect(); } }, { threshold: 0.5 });
    o.observe(el);
  }

  /* ---------- Demo: Cresora go-live gate ---------- */
  var gate = $('#demoGate');
  if (gate) {
    var timers = [];
    var c = { head: $('[data-k="head"]', gate), cert: $('[data-k="cert"]', gate), baa: $('[data-k="baa"]', gate), pci: $('[data-k="pci"]', gate), mer: $('[data-k="mer"]', gate) };
    var bar = $('.bar i', gate), btn = $('.demo-btn', gate);
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      setChip(c.head, 'warn', '3 blocking'); setChip(c.cert, 'ok', 'Passed');
      setChip(c.baa, 'review', 'Awaiting counter-sign'); setChip(c.pci, 'block', 'Missing');
      setChip(c.mer, 'idle', 'Step 6 of 8');
      bar.style.width = '48%'; btn.disabled = true; btn.className = 'demo-btn'; btn.textContent = 'Go live';
    }
    function play() {
      reset();
      var seq = [
        [900, function () { setChip(c.pci, 'review', 'In review'); }],
        [1900, function () { setChip(c.pci, 'ok', 'Passed'); setChip(c.head, 'warn', '2 blocking'); bar.style.width = '66%'; }],
        [2900, function () { setChip(c.baa, 'ok', 'Executed'); setChip(c.head, 'warn', '1 blocking'); bar.style.width = '82%'; }],
        [3900, function () { setChip(c.mer, 'ok', 'Approved'); setChip(c.head, 'ok', 'Ready to launch'); bar.style.width = '100%'; btn.disabled = false; btn.className = 'demo-btn go'; btn.textContent = 'Go live →'; }]
      ];
      seq.forEach(function (s) { timers.push(setTimeout(s[1], reduce ? 0 : s[0])); });
    }
    btn.addEventListener('click', function () { setChip(c.head, 'ok', 'Live'); btn.disabled = true; btn.textContent = 'Partner is live'; });
    var rp = $('[data-replay="gate"]'); if (rp) rp.addEventListener('click', play);
    reset(); onceVisible(gate, play);
  }

  /* ---------- Demo: Infoempresa before / after checkout ---------- */
  var buy = $('#demoBuy');
  if (buy) {
    var segs = $$('.seg button', buy.parentNode);
    function show(mode) {
      segs.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === mode ? 'true' : 'false'); });
      $$('[data-show]', buy).forEach(function (el) { el.classList.toggle('hide', el.getAttribute('data-show') !== mode); });
      if (!reduce) { buy.classList.remove('flash'); void buy.offsetWidth; buy.classList.add('flash'); }
    }
    segs.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-mode')); }); });
    show('after');
  }

  /* ---------- Demo: MobiRide mission flow ---------- */
  var ride = $('#demoRide');
  if (ride) {
    var chip = $('[data-k="status"]', ride), steps = $$('.steps span', ride), rbtn = $('.demo-btn', ride);
    var rate = $('[data-k="rate"]', ride), toast = $('[data-k="toast"]', ride), stars = $$('.stars button', ride);
    var flow = [
      { chip: ['review', 'Driver assigned'], step: 2, btn: 'Start ride' },
      { chip: ['warn', 'On the way'], step: 3, btn: 'Ride completed' },
      { chip: ['ok', 'Completed'], step: 5, btn: null }
    ];
    var at = 0;
    function render() {
      var f = flow[at];
      setChip(chip, f.chip[0], f.chip[1]);
      steps.forEach(function (s, i) { s.className = i < f.step ? 'on' : (i === f.step ? 'now' : ''); });
      if (f.btn) { rbtn.classList.remove('hide'); rbtn.textContent = f.btn; } else { rbtn.classList.add('hide'); }
      rate.classList.toggle('hide', at !== 2); toast.classList.toggle('hide', at !== 2);
      if (at !== 2) stars.forEach(function (s) { s.classList.remove('on'); s.setAttribute('aria-pressed', 'false'); });
    }
    rbtn.addEventListener('click', function () { if (at < flow.length - 1) { at++; render(); } });
    stars.forEach(function (s, i) {
      s.addEventListener('click', function () {
        stars.forEach(function (t, j) { t.classList.toggle('on', j <= i); t.setAttribute('aria-pressed', j <= i ? 'true' : 'false'); });
        toast.textContent = 'Thanks! ' + (i + 1) + '-star feedback sent to the fleet manager.';
      });
    });
    var rr = $('[data-replay="ride"]'); if (rr) rr.addEventListener('click', function () { at = 0; render(); toast.textContent = 'Employee notified: your ride is complete.'; });
    render();
  }
})();

/* ---------- Work page filters ---------- */
(function () {
  var btns = document.querySelectorAll('.filters button');
  if (!btns.length) return;
  var cards = document.querySelectorAll('.pcard');
  var empty = document.getElementById('pempty');
  function apply(f) {
    var shown = 0;
    btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-filter') === f ? 'true' : 'false'); });
    cards.forEach(function (c) {
      var ok = f === 'all' || (' ' + c.getAttribute('data-tags') + ' ').indexOf(' ' + f + ' ') > -1;
      c.hidden = !ok; if (ok) shown++;
    });
    if (empty) empty.hidden = shown > 0;
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-filter')); }); });
})();

/* ---------- Motion v7: avatar follow, card spotlight, magnetic buttons ---------- */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var av = document.getElementById('avatar');
  if (av && fine) {
    window.addEventListener('mousemove', function (e) {
      var r = av.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      var dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      av.style.setProperty('--ry', (dx * 24).toFixed(2) + 'deg');
      av.style.setProperty('--rx', (-dy * 24).toFixed(2) + 'deg');
    });
  }
  if (!fine) return;
  document.querySelectorAll('.pc').forEach(function (c) {
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      c.style.setProperty('--mx', x + 'px'); c.style.setProperty('--my', y + 'px');
      c.style.setProperty('--px', ((x / r.width - .5) * 14).toFixed(1) + 'px');
      c.style.setProperty('--py', ((y / r.height - .5) * 10).toFixed(1) + 'px');
    });
  });
  document.querySelectorAll('.magnetic, .pillnav .cta').forEach(function (b) {
    b.addEventListener('mousemove', function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .25).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px)';
    });
    b.addEventListener('mouseleave', function () { b.style.transform = ''; });
  });
})();

/* ---------- About: interactive dot tiles ---------- */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('canvas.dots').forEach(function (cv) {
    var ctx = cv.getContext('2d'), mx = -999, my = -999, w, h, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { var r = cv.getBoundingClientRect(); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var col = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3B1FA8';
      ctx.fillStyle = col;
      for (var x = 8; x < w; x += 14) for (var y = 8; y < h; y += 14) {
        var d = Math.hypot(x - mx, y - my), k = Math.max(0, 1 - d / 90);
        var dx = d ? (x - mx) / d * k * 10 : 0, dy = d ? (y - my) / d * k * 10 : 0;
        ctx.globalAlpha = .25 + k * .75; ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.4 + k * 1.6, 0, 6.283); ctx.fill();
      }
    }
    cv.parentNode.addEventListener('mousemove', function (e) { if (reduce) return; var r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; requestAnimationFrame(draw); });
    cv.parentNode.addEventListener('mouseleave', function () { mx = my = -999; requestAnimationFrame(draw); });
    window.addEventListener('resize', size); size();
  });
})();

/* ---------- About: mini avatar puzzle ---------- */
(function () {
  var grid = document.getElementById('pzGrid'); if (!grid) return;
  var msg = document.getElementById('pzMsg'), order = [], picked = null;
  function render() {
    grid.innerHTML = '';
    order.forEach(function (p, i) {
      var b = document.createElement('button'); b.type = 'button';
      b.setAttribute('aria-label', 'Piece ' + (p + 1) + ' in position ' + (i + 1));
      b.setAttribute('aria-pressed', picked === i ? 'true' : 'false');
      b.style.backgroundPosition = (p % 3) * 50 + '% ' + Math.floor(p / 3) * 50 + '%';
      b.addEventListener('click', function () { pick(i); });
      grid.appendChild(b);
    });
    var solved = order.every(function (p, i) { return p === i; });
    grid.classList.toggle('solved', solved);
    if (solved) msg.textContent = 'Solved! You found me.';
  }
  function pick(i) {
    if (picked === null) { picked = i; msg.textContent = 'Now pick a piece to swap with.'; }
    else { var t = order[i]; order[i] = order[picked]; order[picked] = t; picked = null; msg.textContent = 'Keep going…'; }
    render();
  }
  function shuffle() {
    order = [0,1,2,3,4,5,6,7,8];
    do { for (var i = 8; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; } }
    while (order.every(function (p, k) { return p === k; }));
    picked = null; msg.textContent = 'Click two pieces to swap them.'; render();
  }
  document.getElementById('pzShuffle').addEventListener('click', shuffle);
  shuffle();
})();
