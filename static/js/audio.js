/* All sounds are synthesized with the Web Audio API — no audio files. */
(function (root) {
  'use strict';

  var ctx = null;
  var master = null;
  var enabled = true;
  var volume = 0.7;

  try {
    var s = localStorage.getItem('nine.sound');
    if (s != null) enabled = s === '1';
    var v = localStorage.getItem('nine.volume');
    if (v != null) volume = Math.max(0, Math.min(1, Number(v) / 100));
  } catch (e) {}

  // iOS only allows audio after a user gesture: call this from the Start tap.
  function unlock() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function ready() { return enabled && ctx && volume > 0; }

  function tone(type, f0, f1, dur, gain, delay) {
    var t0 = ctx.currentTime + (delay || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, gain, filter, delay) {
    var t0 = ctx.currentTime + (delay || 0);
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    var node = src;
    if (filter) {
      var bq = ctx.createBiquadFilter();
      bq.type = 'bandpass';
      bq.Q.value = 1.2;
      bq.frequency.setValueAtTime(filter[0], t0);
      bq.frequency.exponentialRampToValueAtTime(filter[1], t0 + dur);
      node.connect(bq);
      node = bq;
    }
    node.connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  var SEMI = Math.pow(2, 1 / 12);
  var MAJOR = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];

  var sfx = {
    select: function () { tone('sine', 880, 880, 0.06, 0.25); },
    pop: function (combo) {
      // Combo climbs the major scale: 도-레-미…
      var step = MAJOR[Math.min(Math.max(0, (combo || 1) - 1), MAJOR.length - 1)];
      var k = Math.pow(SEMI, step);
      tone('sine', 600 * k, 1200 * k, 0.08, 0.35);
      noise(0.03, 0.25);
    },
    fail: function () { tone('triangle', 220, 160, 0.15, 0.35); },
    shuffle: function () { noise(0.3, 0.3, [400, 4000]); },
    clear: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone('triangle', f, f, 0.12, 0.3, i * 0.09);
      });
    },
    tick: function () { tone('square', 1000, 1000, 0.02, 0.06); },
    end: function () {
      tone('sine', 783.99, 783.99, 0.3, 0.35);
      tone('sine', 523.25, 523.25, 0.4, 0.35, 0.3);
    }
  };

  var api = {
    unlock: unlock,
    play: function (name, arg) {
      if (!ready()) return;
      try { sfx[name](arg); } catch (e) {}
    },
    get enabled() { return enabled; },
    set enabled(v) {
      enabled = !!v;
      try { localStorage.setItem('nine.sound', enabled ? '1' : '0'); } catch (e) {}
    },
    get volume() { return Math.round(volume * 100); },
    set volume(v) {
      volume = Math.max(0, Math.min(1, v / 100));
      if (master) master.gain.value = volume;
      try { localStorage.setItem('nine.volume', String(Math.round(volume * 100))); } catch (e) {}
    }
  };

  root.Sound = api;
})(this);
