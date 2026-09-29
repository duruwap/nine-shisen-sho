/*
 * Confetti effects.
 *  - small(layer, x, y, colors): a little paper burst where a tile pops (DOM + Web Animations).
 *  - big(colors): full-screen celebration for a perfect board clear (canvas physics).
 */
(function (root) {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function small(layer, x, y, colors, scale) {
    if (reduced) return;
    scale = scale || 1;
    var n = 14;
    for (var i = 0; i < n; i++) {
      var el = document.createElement('i');
      el.className = 'confetto';
      var w = rand(5, 8) * scale;
      var round = Math.random() < 0.25;
      el.style.width = w + 'px';
      el.style.height = (round ? w : w * rand(0.4, 0.6)) + 'px';
      el.style.borderRadius = round ? '50%' : '1px';
      el.style.background = pick(colors);
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      layer.appendChild(el);

      // Mostly upward fan, then gravity pulls the paper down while it flutters.
      var ang = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      var sp = rand(40, 95) * scale;
      var dx = Math.cos(ang) * sp;
      var dy = Math.sin(ang) * sp;
      var fall = rand(45, 80) * scale;
      var spin = rand(-540, 540);
      var dur = rand(650, 900);
      var frames = [];
      for (var k = 0; k <= 6; k++) {
        var tt = k / 6;
        var ease = 1 - Math.pow(1 - tt, 2);
        frames.push({
          transform: 'translate(-50%,-50%) translate(' + (dx * ease + Math.sin(tt * 9 + i) * 4) + 'px,' +
            (dy * ease + fall * tt * tt) + 'px) rotate(' + spin * tt + 'deg) rotateX(' + 720 * tt + 'deg)',
          opacity: tt < 0.7 ? 1 : 1 - (tt - 0.7) / 0.3
        });
      }
      var anim = el.animate(frames, { duration: dur, easing: 'linear', fill: 'forwards' });
      anim.onfinish = el.remove.bind(el);
    }
  }

  // ---------- Big canvas confetti ----------
  var canvas = null, ctx = null, pieces = [], raf = 0, last = 0;

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.getElementById('confetti');
    ctx = canvas.getContext('2d');
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(x, y, angle, spread, count, speed, colors) {
    for (var i = 0; i < count; i++) {
      var a = angle + rand(-spread, spread);
      var v = speed * rand(0.55, 1.1);
      pieces.push({
        x: x, y: y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: rand(8, 14), h: rand(5, 9),
        rot: rand(0, Math.PI * 2), vr: rand(-12, 12),
        tilt: rand(0, Math.PI * 2), vt: rand(4, 10),
        color: pick(colors),
        shape: Math.random() < 0.2 ? 'circle' : 'rect',
        life: 0, ttl: rand(2.4, 3.4)
      });
    }
  }

  function big(colors) {
    if (reduced) return;
    ensureCanvas();
    resize();
    var W = window.innerWidth, H = window.innerHeight;
    var sp = Math.max(W, H) * 1.45;
    // Two cannons from the bottom corners…
    spawn(-10, H + 10, -Math.PI / 3, 0.35, 90, sp, colors);
    spawn(W + 10, H + 10, -Math.PI * 2 / 3, 0.35, 90, sp, colors);
    // …then a shower from the top a beat later.
    setTimeout(function () {
      for (var i = 0; i < 90; i++) {
        spawn(rand(0, W), -20, Math.PI / 2, 0.3, 1, rand(60, 180), colors);
      }
    }, 350);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    var W = window.innerWidth, H = window.innerHeight;
    ctx.clearRect(0, 0, W, H);
    for (var i = pieces.length - 1; i >= 0; i--) {
      var p = pieces[i];
      p.life += dt;
      p.vy += 900 * dt;             // gravity
      p.vx *= Math.pow(0.35, dt);   // air drag
      p.vy *= Math.pow(0.35, dt);
      p.x += (p.vx + Math.sin(p.tilt) * 30) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.tilt += p.vt * dt;
      if (p.life > p.ttl || p.y > H + 40) { pieces.splice(i, 1); continue; }
      var fade = Math.min(1, (p.ttl - p.life) / 0.5);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.tilt)); // paper flip
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, p.h / 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
    if (pieces.length) raf = requestAnimationFrame(frame);
    else { raf = 0; ctx.clearRect(0, 0, W, H); }
  }

  function stop() {
    pieces = [];
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  root.Confetti = { small: small, big: big, stop: stop };
})(this);
