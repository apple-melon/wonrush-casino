/* ============================================================
   WON RUSH CASINO — 돈벌자!
   노동 / 복권 / 룰렛 / 핀볼 / 10초 챌린지
   ============================================================ */
'use strict';

/* ================= 상태 & 저장 ================= */
const SAVE_KEY = 'wonrush-save';
const state = {
  money: 0,
  jobsDone: 0,
  lottoBought: 0,
  lottoWins: 0,
  muted: false,
};

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch (e) { /* 손상된 저장 무시 */ }
}

const $ = sel => document.querySelector(sel);
const fmt = n => '₩' + Math.floor(n).toLocaleString('ko-KR');
const rand = (a, b) => a + Math.random() * (b - a);

/* ================= 사운드 (WebAudio 신스) ================= */
const snd = (() => {
  let ac = null;
  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type = 'sine', vol = 0.1, delay = 0, slideTo = null) {
    if (state.muted) return;
    try {
      const a = ctx();
      const t = a.currentTime + delay;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch (e) { /* 오디오 미지원 무시 */ }
  }
  return {
    click:   () => tone(660, 0.06, 'square', 0.04),
    tick:    () => tone(1350, 0.03, 'square', 0.028),
    coin:    () => { tone(1318, 0.09, 'sine', 0.09); tone(1760, 0.16, 'sine', 0.09, 0.07); },
    win:     () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, i * 0.09)),
    jackpot: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.24, 'triangle', 0.12, i * 0.1)),
    lose:    () => tone(200, 0.4, 'sawtooth', 0.07, 0, 80),
    launch:  () => tone(180, 0.25, 'square', 0.06, 0, 700),
    scratch: () => tone(rand(2200, 3200), 0.03, 'triangle', 0.012),
  };
})();
// 모든 버튼에 클릭음
document.addEventListener('click', e => {
  if (e.target.closest('.btn, .tab, .num-btn, .icon-btn, .home-card, .back-btn, .job-card, .eq-opt')) snd.click();
});

/* ================= 파티클 FX ================= */
const fx = (() => {
  const cv = $('#fx-canvas');
  const ctx = cv.getContext('2d');
  let parts = [];
  function resize() { cv.width = innerWidth; cv.height = innerHeight; }
  addEventListener('resize', resize);
  resize();

  const GOLDS = ['#ffd866', '#ffe89a', '#e0a93c', '#fff3c2'];
  const CONF = ['#ffd866', '#ff5d7a', '#5ad0e6', '#5ef0a0', '#c792ff', '#fff'];

  function coins(x, y, n = 16) {
    for (let i = 0; i < n; i++) {
      parts.push({
        kind: 'coin', x, y,
        vx: rand(-4.5, 4.5), vy: rand(-10, -4),
        r: rand(4, 8), rot: rand(0, 6.3), vr: rand(-0.25, 0.25),
        life: rand(55, 90), c: GOLDS[Math.floor(rand(0, GOLDS.length))],
      });
    }
  }
  function confetti(n = 90) {
    for (let i = 0; i < n; i++) {
      parts.push({
        kind: 'conf', x: rand(0, cv.width), y: rand(-60, -10),
        vx: rand(-1.6, 1.6), vy: rand(2.4, 5.5),
        w: rand(5, 10), h: rand(8, 14), rot: rand(0, 6.3), vr: rand(-0.2, 0.2),
        life: rand(130, 210), c: CONF[Math.floor(rand(0, CONF.length))],
      });
    }
  }
  function sparkle(x, y, n = 3) {
    for (let i = 0; i < n; i++) {
      parts.push({
        kind: 'spark', x: x + rand(-8, 8), y: y + rand(-8, 8),
        vx: rand(-1, 1), vy: rand(-2.2, -0.4),
        r: rand(1.2, 2.6), life: rand(18, 34), c: '#fff',
      });
    }
  }
  const BILLS = ['💵', '💴', '💶', '💷', '🤑', '💰'];
  function moneyRain(n = 40) {
    for (let i = 0; i < n; i++) {
      parts.push({
        kind: 'bill', x: rand(0, cv.width), y: rand(-120, -10),
        vx: rand(-1.2, 1.2), vy: rand(2.6, 6),
        rot: rand(0, 6.3), vr: rand(-0.12, 0.12), sway: rand(0, 6.3),
        size: rand(22, 40), life: rand(150, 240),
        ch: BILLS[Math.floor(rand(0, BILLS.length))],
      });
    }
  }
  function goldBurst(x, y, n = 30) {
    parts.push({ kind: 'ring', x, y, r: 6, vr: 7, life: 28, c: '#ffd866' });
    parts.push({ kind: 'ring', x, y, r: 6, vr: 4, life: 36, c: '#fff3c2' });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283;
      const sp = rand(5, 13);
      parts.push({
        kind: 'coin', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
        r: rand(4, 9), rot: rand(0, 6.3), vr: rand(-0.3, 0.3),
        life: rand(50, 85), c: GOLDS[Math.floor(rand(0, GOLDS.length))],
      });
    }
  }

  function loop() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => p.life-- > 0 && p.y < cv.height + 30);
    for (const p of parts) {
      if (p.kind === 'ring') {
        p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / 36);
        ctx.strokeStyle = p.c; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.stroke();
        ctx.restore();
        continue;
      }
      if (p.kind === 'bill') {
        p.sway += 0.08;
        p.x += p.vx + Math.sin(p.sway) * 1.4;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life / 30);
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.sin(p.sway) * 0.4);
        ctx.font = p.size + 'px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.ch, 0, 0);
        ctx.restore();
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.kind !== 'conf') p.vy += 0.32; else p.vy += 0.015;
      if (p.rot !== undefined) p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 22);
      if (p.kind === 'coin') {
        // 회전하며 반짝이는 동전
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * 0.4);
        ctx.scale(Math.abs(Math.cos(p.rot)), 1);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.3); ctx.fill();
        ctx.strokeStyle = 'rgba(120,80,0,.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (p.kind === 'conf') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        ctx.fillStyle = p.c;
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill();
      }
      ctx.restore();
    }
    requestAnimationFrame(loop);
  }
  loop();
  return { coins, confetti, sparkle, moneyRain, goldBurst };
})();

/* 화면 플래시 */
function screenFlash() {
  const el = $('#screen-flash');
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
}

/* ================= 돈 / 연출 ================= */
const moneyEl = $('#money');
let shownMoney = 0;
let moneyAnim = 0;

function renderMoney(instant) {
  cancelAnimationFrame(moneyAnim);
  const from = shownMoney, to = state.money;
  if (instant || from === to) {
    shownMoney = to;
    moneyEl.textContent = fmt(to);
    return;
  }
  const up = to > from;
  moneyEl.classList.remove('pop', 'down');
  void moneyEl.offsetWidth;
  moneyEl.classList.add(up ? 'pop' : 'down');
  const t0 = performance.now(), dur = up ? 650 : 350;
  (function step(now) {
    const t = Math.min(1, (now - t0) / dur);
    const ease = 1 - Math.pow(1 - t, 3);
    shownMoney = from + (to - from) * ease;
    moneyEl.textContent = fmt(shownMoney);
    if (t < 1) moneyAnim = requestAnimationFrame(step);
  })(t0);
}

function addMoney(n) {
  state.money += n;
  renderMoney();
  if (typeof updateRank === 'function') updateRank();
  save();
}
function spend(n) {
  if (n <= 0 || !Number.isFinite(n)) { toast('금액이 올바르지 않아요!', 'bad'); return false; }
  if (state.money < n) { toast('잔액이 부족합니다! 노동을 하세요 🧽', 'bad'); return false; }
  state.money -= n;
  renderMoney();
  save();
  return true;
}

function shake() {
  const g = $('#game');
  g.classList.remove('shake');
  void g.offsetWidth;
  g.classList.add('shake');
}

function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/* 당첨 연출 — 금액에 따라 자동으로 스케일 업 */
function winFX(amount, anchorEl) {
  const { x, y } = centerOf(anchorEl || moneyEl);
  fx.coins(x, y, Math.min(40, 10 + Math.floor(amount / 150)));
  if (amount >= 5000) {
    snd.jackpot();
    bigWin(amount, anchorEl);
  } else if (amount >= 400) {
    snd.win();
    shake();
  } else {
    snd.coin();
  }
}
function loseFX() {
  snd.lose();
}

let bigWinTimer = 0;
function bigWin(amount, anchorEl) {
  const el = $('#bigwin');
  const titleEl = $('#bigwin-title');
  const anchor = centerOf(anchorEl || moneyEl);

  // 금액별 티어
  let tier, title, dur;
  if (amount >= 1000000) { tier = 'tier-jackpot'; title = 'JACKPOT'; dur = 4200; }
  else if (amount >= 150000) { tier = 'tier-mega'; title = 'MEGA WIN'; dur = 3600; }
  else if (amount >= 30000) { tier = 'tier-huge'; title = 'HUGE WIN'; dur = 3000; }
  else { tier = 'tier-big'; title = 'BIG WIN!'; dur = 2400; }

  titleEl.textContent = title;
  $('#bigwin-amount').textContent = '+' + fmt(amount);
  el.className = 'bigwin ' + tier;
  void el.offsetWidth;
  el.classList.add('show');

  // 공통
  fx.confetti(tier === 'tier-big' ? 110 : 170);
  shake();

  // 티어별 추가 연출
  if (amount >= 30000) {
    fx.goldBurst(anchor.x, anchor.y, 36);
    fx.moneyRain(amount >= 150000 ? 70 : 38);
  }
  if (amount >= 150000) {
    screenFlash();
    setTimeout(() => fx.moneyRain(60), 350);
    setTimeout(() => fx.confetti(120), 600);
  }
  if (amount >= 1000000) {
    screenFlash();
    setTimeout(screenFlash, 500);
    setTimeout(() => fx.moneyRain(90), 700);
    setTimeout(() => fx.moneyRain(90), 1500);
  }

  clearTimeout(bigWinTimer);
  bigWinTimer = setTimeout(() => el.classList.remove('show'), dur);
}

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 2300);
}

/* 캔버스 마우스 좌표 (CSS 스케일 보정) */
function canvasPos(canvas, e) {
  const r = canvas.getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX);
  const cy = (e.touches ? e.touches[0].clientY : e.clientY);
  return {
    x: (cx - r.left) * (canvas.width / r.width),
    y: (cy - r.top) * (canvas.height / r.height),
    sx: cx, sy: cy, // 화면 좌표 (파티클용)
  };
}

/* ================= 탭 전환 ================= */
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $('#panel-' + btn.dataset.tab).classList.add('active');
  });
});

/* ================= 베팅 박스 공통 ================= */
function initBetBox(boxEl) {
  const input = boxEl.querySelector('.bet-input');
  boxEl.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      const cur = parseInt(input.value) || 0;
      const act = b.dataset.act;
      if (act === 'add') input.value = cur + parseInt(b.dataset.v);
      else if (act === 'half') input.value = Math.max(10, Math.floor(state.money / 2));
      else if (act === 'allin') input.value = Math.max(10, Math.floor(state.money));
    });
  });
  return () => Math.floor(parseInt(input.value) || 0);
}

/* ============================================================
   1) 노동 — 문질러서 청소
   ============================================================ */
const laborCv = $('#labor-canvas');
const laborCtx = laborCv.getContext('2d');
const JOBS = {
  dish:  { pay: 50,  name: '접시닦기' },
  floor: { pay: 120, name: '바닥닦기' },
};
let curJob = 'dish';
let dirtCells = [];   // {x, y, r, shade, alive}
let dirtAlive = 0;
let laborBusy = false;
let laborDown = false;
let scrubCount = 0;

const CELL = 14;

function newLaborJob() {
  dirtCells = [];
  laborBusy = false;
  const W = laborCv.width, H = laborCv.height;

  if (curJob === 'dish') {
    const cx = W / 2, cy = H / 2, R = 112;
    for (let y = CELL; y < H - CELL; y += CELL) {
      for (let x = CELL; x < W - CELL; x += CELL) {
        const d = Math.hypot(x + CELL / 2 - cx, y + CELL / 2 - cy);
        if (d < R - 8 && Math.random() < 0.85) {
          dirtCells.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), r: rand(6, 10), shade: Math.random(), alive: true });
        }
      }
    }
  } else {
    for (let y = 16; y < H - 16; y += CELL) {
      for (let x = 16; x < W - 16; x += CELL) {
        if (Math.random() < 0.9) {
          dirtCells.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), r: rand(6, 10), shade: Math.random(), alive: true });
        }
      }
    }
  }
  dirtAlive = dirtCells.length;
  drawLabor();
  updateLaborProgress();
}

function drawLabor() {
  const ctx = laborCtx, W = laborCv.width, H = laborCv.height;
  ctx.clearRect(0, 0, W, H);

  if (curJob === 'dish') {
    // 주방 조리대
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1c1626');
    bg.addColorStop(1, '#120e1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // 접시 (도자기 광택)
    const cx = W / 2, cy = H / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    const plate = ctx.createRadialGradient(cx - 36, cy - 40, 20, cx, cy, 130);
    plate.addColorStop(0, '#ffffff');
    plate.addColorStop(0.55, '#e3e6ee');
    plate.addColorStop(1, '#b9bece');
    ctx.fillStyle = plate;
    ctx.beginPath(); ctx.arc(cx, cy, 120, 0, 6.3); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(140,148,170,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 82, 0, 6.3); ctx.stroke();
    // 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.ellipse(cx - 48, cy - 56, 30, 12, -0.7, 0, 6.3);
    ctx.fill();
  } else {
    // 원목 바닥
    for (let y = 0; y < H; y += 30) {
      const g = ctx.createLinearGradient(0, y, 0, y + 30);
      g.addColorStop(0, (y / 30) % 2 ? '#8a6442' : '#7a5638');
      g.addColorStop(1, (y / 30) % 2 ? '#74522f' : '#684627');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, W, 30);
      ctx.fillStyle = 'rgba(40,26,12,.8)';
      ctx.fillRect(0, y + 28, W, 2);
    }
    // 광택
    const sheen = ctx.createLinearGradient(0, 0, W, H);
    sheen.addColorStop(0, 'rgba(255,255,255,.06)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, W, H);
  }

  // 얼룩
  for (const c of dirtCells) {
    if (!c.alive) continue;
    ctx.fillStyle = c.shade < 0.5 ? 'rgba(72,55,36,.88)' : 'rgba(94,74,48,.88)';
    ctx.beginPath();
    ctx.arc(c.x + CELL / 2, c.y + CELL / 2, c.r, 0, 6.3);
    ctx.fill();
  }
}

function updateLaborProgress() {
  const total = dirtCells.length || 1;
  const pct = Math.round((1 - dirtAlive / total) * 100);
  $('#labor-fill').style.width = pct + '%';
}

function scrub(e) {
  if (laborBusy || !laborDown) return;
  const { x, y, sx, sy } = canvasPos(laborCv, e);
  const R = 24;
  let removed = 0;
  for (const c of dirtCells) {
    if (c.alive && Math.hypot(c.x + CELL / 2 - x, c.y + CELL / 2 - y) < R) {
      c.alive = false;
      removed++;
    }
  }
  if (!removed) return;
  dirtAlive -= removed;
  drawLabor();
  updateLaborProgress();
  if (++scrubCount % 3 === 0) {
    fx.sparkle(sx, sy, 2);
    snd.scratch();
  }

  if (dirtAlive <= Math.ceil(dirtCells.length * 0.03)) {
    laborBusy = true;
    dirtCells.forEach(c => c.alive = false);
    dirtAlive = 0;
    drawLabor();
    updateLaborProgress();
    const pay = JOBS[curJob].pay;
    addMoney(pay);
    state.jobsDone++;
    $('#labor-count').textContent = state.jobsDone;
    save();
    winFX(pay, laborCv);
    toast(`✨ ${JOBS[curJob].name} 완료! +${fmt(pay)}`, 'good');
    setTimeout(newLaborJob, 700);
  }
}

laborCv.addEventListener('mousedown', e => { laborDown = true; scrub(e); });
laborCv.addEventListener('mousemove', scrub);
window.addEventListener('mouseup', () => { laborDown = false; });
laborCv.addEventListener('touchstart', e => { e.preventDefault(); laborDown = true; scrub(e); });
laborCv.addEventListener('touchmove', e => { e.preventDefault(); scrub(e); });
window.addEventListener('touchend', () => { laborDown = false; });

document.querySelectorAll('.job-tab').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.job-tab').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    curJob = b.dataset.job;
    newLaborJob();
  });
});

/* ============================================================
   2) 복권 — GOLDEN TICKET (긁는 즉석복권)
   ============================================================ */
const LOTTO_COST = 100;
// 실제 복권보다 훨씬 후하게 (당첨률 약 34%)
const LOTTO_TABLE = [
  { amount: 0,      w: 660  },
  { amount: 150,    w: 250  },
  { amount: 400,    w: 70   },
  { amount: 1500,   w: 16   },
  { amount: 10000,  w: 2    },
  { amount: 100000, w: 0.15 },
];
const LOTTO_LABELS = { 150: '₩150', 400: '₩400', 1500: '₩1,500', 10000: '₩1만', 100000: '₩10만' };

const lottoCover = $('#lotto-cover');
const cCtx = lottoCover.getContext('2d');
const lottoCells = document.querySelectorAll('.lotto-cell');
let lottoActive = false;
let lottoPrize = 0;
let lottoCellAmounts = [];
let lottoScratchCount = 0;
let lottoDown = false;

function pickPrize() {
  const total = LOTTO_TABLE.reduce((s, t) => s + t.w, 0);
  let r = Math.random() * total;
  for (const t of LOTTO_TABLE) {
    r -= t.w;
    if (r <= 0) return t.amount;
  }
  return 0;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCells(prize) {
  const pool = [150, 400, 1500, 10000, 100000];
  if (prize > 0) {
    const others = shuffle(pool.filter(p => p !== prize));
    return shuffle([prize, prize, prize, others[0], others[0], others[1]]);
  }
  const picks = shuffle(pool.slice()).slice(0, 3);
  return shuffle([picks[0], picks[0], picks[1], picks[1], picks[2], picks[2]]);
}

function fillLottoCells(cells) {
  lottoCellAmounts = cells;
  lottoCells.forEach((el, i) => {
    el.textContent = LOTTO_LABELS[cells[i]];
    el.className = 'lotto-cell t' + cells[i];
  });
}

function drawLottoCover() {
  const W = lottoCover.width, H = lottoCover.height;
  cCtx.globalCompositeOperation = 'source-over';
  cCtx.clearRect(0, 0, W, H);
  // 실버 스크래치 코팅
  const g = cCtx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#aeb4c4');
  g.addColorStop(0.5, '#8c93a6');
  g.addColorStop(1, '#a6acbd');
  cCtx.fillStyle = g;
  cCtx.fillRect(0, 0, W, H);
  // 사선 패턴
  cCtx.strokeStyle = 'rgba(255,255,255,.16)';
  cCtx.lineWidth = 7;
  for (let i = -H; i < W + H; i += 26) {
    cCtx.beginPath();
    cCtx.moveTo(i, 0);
    cCtx.lineTo(i + H, H);
    cCtx.stroke();
  }
  cCtx.fillStyle = 'rgba(40,45,60,.85)';
  cCtx.font = '700 19px "Noto Sans KR", sans-serif';
  cCtx.textAlign = 'center';
  cCtx.textBaseline = 'middle';
  cCtx.fillText('🪙 여기를 긁으세요', W / 2, H / 2);
}

function settleLotto() {
  if (!lottoActive) return;
  lottoActive = false;
  cCtx.globalCompositeOperation = 'source-over';
  cCtx.clearRect(0, 0, lottoCover.width, lottoCover.height);
  $('#lotto-reveal').disabled = true;
  $('#lotto-buy').disabled = false;

  const card = $('#lotto-card');
  const resEl = $('#lotto-result');
  if (lottoPrize > 0) {
    // 당첨 셀 3개 골드로 펄스
    lottoCells.forEach((el, i) => {
      if (lottoCellAmounts[i] === lottoPrize) el.classList.add('win');
      else el.classList.add('dead');
    });
    card.classList.add('celebrate');
    setTimeout(() => card.classList.remove('celebrate'), 700);
    addMoney(lottoPrize);
    state.lottoWins++;
    winFX(lottoPrize, card);
    resEl.textContent = `🎉 ${LOTTO_LABELS[lottoPrize]} 당첨! +${fmt(lottoPrize)}`;
    resEl.className = 'result-line win';
  } else {
    lottoCells.forEach(el => el.classList.add('dead'));
    loseFX();
    resEl.textContent = '꽝... 다음 기회에!';
    resEl.className = 'result-line lose';
  }
  $('#lotto-wins').textContent = state.lottoWins;
  save();
}

function lottoScratch(e) {
  if (!lottoActive || !lottoDown) return;
  const { x, y } = canvasPos(lottoCover, e);
  cCtx.globalCompositeOperation = 'destination-out';
  cCtx.beginPath();
  cCtx.arc(x, y, 17, 0, 6.3);
  cCtx.fill();
  if (lottoScratchCount % 4 === 0) snd.scratch();

  if (++lottoScratchCount % 10 === 0) {
    const img = cCtx.getImageData(0, 0, lottoCover.width, lottoCover.height).data;
    let clear = 0, total = 0;
    for (let i = 3; i < img.length; i += 64) {
      total++;
      if (img[i] === 0) clear++;
    }
    if (clear / total > 0.62) settleLotto();
  }
}

$('#lotto-buy').addEventListener('click', () => {
  if (lottoActive) return;
  if (!spend(LOTTO_COST)) return;
  state.lottoBought++;
  $('#lotto-count').textContent = state.lottoBought;
  $('#lotto-no').textContent = 'NO. ' + String(state.lottoBought).padStart(6, '0');
  save();
  lottoPrize = pickPrize();
  fillLottoCells(makeCells(lottoPrize));
  drawLottoCover();
  lottoActive = true;
  lottoScratchCount = 0;
  $('#lotto-buy').disabled = true;
  $('#lotto-reveal').disabled = false;
  $('#lotto-result').innerHTML = '&nbsp;';
  $('#lotto-result').className = 'result-line';
});

$('#lotto-reveal').addEventListener('click', settleLotto);

lottoCover.addEventListener('mousedown', e => { lottoDown = true; lottoScratch(e); });
lottoCover.addEventListener('mousemove', lottoScratch);
window.addEventListener('mouseup', () => { lottoDown = false; });
lottoCover.addEventListener('touchstart', e => { e.preventDefault(); lottoDown = true; lottoScratch(e); });
lottoCover.addEventListener('touchmove', e => { e.preventDefault(); lottoScratch(e); });

/* ============================================================
   3) 룰렛 — 1~10 중 하나, 적중 시 9배
   ============================================================ */
const ROULETTE_PAY = 9;
const rCv = $('#roulette-canvas');
const rCtx = rCv.getContext('2d');
let rouletteRot = -18; // 1번이 정중앙 위
let rouletteSpinning = false;
let pickedNum = null;
let lastTickSeg = -1;
const getRouletteBet = initBetBox($('#roulette-bet'));

for (let i = 1; i <= 10; i++) {
  const b = document.createElement('button');
  b.className = 'num-btn';
  b.textContent = i;
  b.addEventListener('click', () => {
    if (rouletteSpinning) return;
    document.querySelectorAll('.num-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    pickedNum = i;
    $('#roulette-result').textContent = `${i}번에 베팅! 적중하면 ${ROULETTE_PAY}배!`;
    $('#roulette-result').className = 'result-line';
  });
  $('#num-grid').appendChild(b);
}

function drawRoulette(now) {
  const W = rCv.width, H = rCv.height;
  const cx = W / 2, cy = H / 2 + 12, R = 112;
  rCtx.clearRect(0, 0, W, H);

  // 외곽 골드 림
  rCtx.save();
  rCtx.shadowColor = 'rgba(255,200,60,.4)';
  rCtx.shadowBlur = 22;
  const rim = rCtx.createLinearGradient(cx, cy - 134, cx, cy + 134);
  rim.addColorStop(0, '#ffe89a');
  rim.addColorStop(0.5, '#c8922a');
  rim.addColorStop(1, '#8a6010');
  rCtx.fillStyle = rim;
  rCtx.beginPath(); rCtx.arc(cx, cy, R + 22, 0, 6.3); rCtx.fill();
  rCtx.restore();
  // 전구 (반짝이며 회전)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 6.283 + (now || 0) / 2400;
    const on = (Math.floor((now || 0) / 280) + i) % 2 === 0 || rouletteSpinning;
    rCtx.fillStyle = on ? '#fff7d6' : 'rgba(90,60,10,.9)';
    if (on) { rCtx.shadowColor = '#ffec9a'; rCtx.shadowBlur = 8; }
    rCtx.beginPath();
    rCtx.arc(cx + Math.cos(a) * (R + 11), cy + Math.sin(a) * (R + 11), 3.2, 0, 6.3);
    rCtx.fill();
    rCtx.shadowBlur = 0;
  }

  // 휠 본체
  rCtx.save();
  rCtx.translate(cx, cy);
  rCtx.rotate(rouletteRot * Math.PI / 180);
  for (let k = 0; k < 10; k++) {
    const a0 = (-90 + k * 36) * Math.PI / 180;
    const a1 = a0 + 36 * Math.PI / 180;
    const g = rCtx.createRadialGradient(0, 0, 30, 0, 0, R);
    if (k % 2 === 0) { g.addColorStop(0, '#ff5066'); g.addColorStop(1, '#b3142c'); }
    else { g.addColorStop(0, '#2e2e3c'); g.addColorStop(1, '#15151e'); }
    rCtx.fillStyle = g;
    rCtx.beginPath();
    rCtx.moveTo(0, 0);
    rCtx.arc(0, 0, R, a0, a1);
    rCtx.closePath();
    rCtx.fill();
    rCtx.strokeStyle = 'rgba(255,216,102,.55)';
    rCtx.lineWidth = 2;
    rCtx.stroke();
    // 숫자
    const mid = a0 + 18 * Math.PI / 180;
    rCtx.save();
    rCtx.translate(Math.cos(mid) * R * 0.74, Math.sin(mid) * R * 0.74);
    rCtx.rotate(mid + Math.PI / 2);
    rCtx.fillStyle = '#fff';
    rCtx.font = '22px "Bebas Neue", sans-serif';
    rCtx.textAlign = 'center';
    rCtx.textBaseline = 'middle';
    rCtx.shadowColor = 'rgba(0,0,0,.7)';
    rCtx.shadowBlur = 4;
    rCtx.fillText(k + 1, 0, 0);
    rCtx.restore();
  }
  // 중앙 허브
  const hub = rCtx.createRadialGradient(-8, -10, 4, 0, 0, 30);
  hub.addColorStop(0, '#fff3c2');
  hub.addColorStop(0.5, '#ffd866');
  hub.addColorStop(1, '#8a6010');
  rCtx.fillStyle = hub;
  rCtx.beginPath(); rCtx.arc(0, 0, 26, 0, 6.3); rCtx.fill();
  rCtx.fillStyle = 'rgba(90,60,10,.8)';
  rCtx.beginPath(); rCtx.arc(0, 0, 7, 0, 6.3); rCtx.fill();
  rCtx.restore();

  // 포인터
  rCtx.save();
  rCtx.shadowColor = 'rgba(0,0,0,.6)';
  rCtx.shadowBlur = 6;
  rCtx.shadowOffsetY = 3;
  rCtx.fillStyle = '#fff3c2';
  rCtx.beginPath();
  rCtx.moveTo(cx - 13, cy - R - 30);
  rCtx.lineTo(cx + 13, cy - R - 30);
  rCtx.lineTo(cx, cy - R - 4);
  rCtx.closePath();
  rCtx.fill();
  rCtx.restore();
}

// 룰렛 상시 렌더 루프 (전구 반짝임)
function rouletteLoop(now) {
  if (rCv.offsetParent) drawRoulette(now);
  requestAnimationFrame(rouletteLoop);
}

$('#roulette-spin').addEventListener('click', () => {
  if (rouletteSpinning) return;
  if (pickedNum === null) { toast('먼저 숫자를 고르세요!', 'bad'); return; }
  const bet = getRouletteBet();
  if (!spend(bet)) return;

  const result = 1 + Math.floor(Math.random() * 10);
  const k = result - 1;
  const want = (((-(k + 0.5) * 36) % 360) + 360) % 360;
  const cur = ((rouletteRot % 360) + 360) % 360;
  let delta = want - cur;
  if (delta <= 0) delta += 360;
  const start = rouletteRot;
  const target = rouletteRot + 360 * 5 + delta;
  const dur = 4200;
  const t0 = performance.now();
  rouletteSpinning = true;
  $('#roulette-spin').disabled = true;
  $('#roulette-result').textContent = '돌아갑니다...';
  $('#roulette-result').className = 'result-line';

  function step(now) {
    const t = Math.min(1, (now - t0) / dur);
    const ease = 1 - Math.pow(1 - t, 4);
    rouletteRot = start + (target - start) * ease;
    // 칸이 바뀔 때마다 틱 사운드
    const seg = Math.floor((((-rouletteRot % 360) + 360) % 360) / 36);
    if (seg !== lastTickSeg) { snd.tick(); lastTickSeg = seg; }
    if (t < 1) { requestAnimationFrame(step); return; }
    rouletteSpinning = false;
    $('#roulette-spin').disabled = false;
    const el = $('#roulette-result');
    if (result === pickedNum) {
      const win = bet * ROULETTE_PAY;
      addMoney(win);
      winFX(win, rCv);
      el.textContent = `🎯 ${result}! 적중!! +${fmt(win)}`;
      el.className = 'result-line win';
    } else {
      loseFX();
      el.textContent = `${result} 나옴... ${pickedNum}에 걸었는데! -${fmt(bet)}`;
      el.className = 'result-line lose';
    }
  }
  requestAnimationFrame(step);
});

/* ============================================================
   4) 핀볼 — 네온 파친코
   ============================================================ */
const pCv = $('#pinball-canvas');
const pCtx = pCv.getContext('2d');
const PW = pCv.width, PH = pCv.height;
const FIELD_R = 330;
const CHANNEL_TOP = 80;
const SLOT_N = 6;
const SLOT_W = FIELD_R / SLOT_N;
const SLOT_TOP = 425;
const SLOT_MULT = [10, 0, 5, 2, 0, 0.5];
const GRAV = 0.22;

let pinballBet = 100;
let pball = null;
let pCharging = false;
let pPower = 0;
let pPowerDir = 1;
let pResultFlash = null;
let lastPegSnd = 0;

const pegs = [];
for (let row = 0; row < 7; row++) {
  const y = 115 + row * 38;
  const off = row % 2 ? 19 : 0;
  for (let x = 28 + off; x <= FIELD_R - 20; x += 38) {
    pegs.push({ x, y, flash: 0 });
  }
}

const DEFLECTOR = { x1: 296, y1: 4, x2: 358, y2: 62 };

document.querySelectorAll('.bet-chip').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.bet-chip').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    pinballBet = parseInt(b.dataset.bet);
  });
});

function pinballLaunch() {
  if (pball) return;
  if (!spend(pinballBet)) { pPower = 0; return; }
  const speed = 8 + (pPower / 100) * 13;
  pball = { x: (FIELD_R + PW) / 2, y: PH - 20, vx: 0, vy: -speed, t: 0, trail: [] };
  pPower = 0;
  snd.launch();
  $('#pinball-result').innerHTML = '&nbsp;';
  $('#pinball-result').className = 'result-line';
}

function reflect(ball, nx, ny, damp) {
  const dot = ball.vx * nx + ball.vy * ny;
  ball.vx = (ball.vx - 2 * dot * nx) * damp;
  ball.vy = (ball.vy - 2 * dot * ny) * damp;
}

function circleRect(ball, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(ball.x, rx + rw));
  const ny = Math.max(ry, Math.min(ball.y, ry + rh));
  const dx = ball.x - nx, dy = ball.y - ny;
  const d = Math.hypot(dx, dy);
  if (d >= r || d === 0) return false;
  const ux = dx / d, uy = dy / d;
  ball.x = nx + ux * r;
  ball.y = ny + uy * r;
  reflect(ball, ux, uy, 0.7);
  return true;
}

function pinballSettle(refund) {
  const b = pball;
  pball = null;
  const el = $('#pinball-result');
  if (refund) {
    addMoney(pinballBet);
    el.textContent = '구슬이 돌아왔어요! 베팅 환불 🔄';
    el.className = 'result-line';
    return;
  }
  const slot = Math.max(0, Math.min(SLOT_N - 1, Math.floor(b.x / SLOT_W)));
  const mult = SLOT_MULT[slot];
  pResultFlash = { slot, until: performance.now() + 1500 };
  if (mult > 0) {
    const win = Math.floor(pinballBet * mult);
    addMoney(win);
    winFX(win, pCv);
    el.textContent = `💎 ×${mult} 구멍! +${fmt(win)}`;
    el.className = 'result-line win';
  } else {
    loseFX();
    el.textContent = `꽝 구멍... -${fmt(pinballBet)}`;
    el.className = 'result-line lose';
  }
}

function pinballUpdate() {
  if (pCharging && !pball) {
    pPower += 1.6 * pPowerDir;
    if (pPower >= 100) { pPower = 100; pPowerDir = -1; }
    if (pPower <= 0) { pPower = 0; pPowerDir = 1; }
  }

  const b = pball;
  if (!b) return;
  b.t++;
  b.vy += GRAV;
  const r = 7;

  b.trail.push({ x: b.x, y: b.y });
  if (b.trail.length > 9) b.trail.shift();

  // 서브스텝 적분 (고속 벽 뚫기 방지)
  const speed = Math.hypot(b.vx, b.vy);
  const steps = Math.max(1, Math.ceil(speed / 4));
  for (let s = 0; s < steps; s++) {
    b.x += b.vx / steps;
    b.y += b.vy / steps;

    if (b.x < r) { b.x = r; b.vx = -b.vx * 0.8; }
    if (b.x > PW - r) { b.x = PW - r; b.vx = -b.vx * 0.8; }
    if (b.y < r) { b.y = r; b.vy = -b.vy * 0.8; }
    if (b.y > PH - r) { b.y = PH - r; b.vy = -b.vy * 0.55; b.vx *= 0.92; }

    // 디플렉터
    {
      const { x1, y1, x2, y2 } = DEFLECTOR;
      const ex = x2 - x1, ey = y2 - y1;
      const len2 = ex * ex + ey * ey;
      let t = ((b.x - x1) * ex + (b.y - y1) * ey) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = x1 + ex * t, py = y1 + ey * t;
      const dx = b.x - px, dy = b.y - py;
      const d = Math.hypot(dx, dy);
      if (d < r && d > 0) {
        const ux = dx / d, uy = dy / d;
        b.x = px + ux * r;
        b.y = py + uy * r;
        reflect(b, ux, uy, 0.85);
      }
    }

    // 채널 벽
    circleRect(b, r, FIELD_R - 2, CHANNEL_TOP, 4, PH - CHANNEL_TOP);

    // 핀 충돌
    for (const p of pegs) {
      const dx = b.x - p.x, dy = b.y - p.y;
      const d = Math.hypot(dx, dy);
      const rr = r + 5;
      if (d < rr && d > 0) {
        const ux = dx / d, uy = dy / d;
        b.x = p.x + ux * rr;
        b.y = p.y + uy * rr;
        reflect(b, ux, uy, 0.72);
        b.vx += (Math.random() - 0.5) * 0.4;
        p.flash = 9;
        const now = performance.now();
        if (now - lastPegSnd > 70) { snd.tick(); lastPegSnd = now; }
      }
    }

    // 슬롯 칸막이
    if (b.x < FIELD_R + r) {
      for (let i = 1; i < SLOT_N; i++) {
        circleRect(b, r, i * SLOT_W - 2, SLOT_TOP, 4, PH - SLOT_TOP);
      }
    }
  }

  const slow = Math.abs(b.vx) + Math.abs(b.vy) < 0.9;
  if (b.y > PH - 26 && slow) {
    pinballSettle(b.x > FIELD_R);
  } else if (b.t > 60 * 25) {
    pinballSettle(b.x > FIELD_R);
  }
}

function pinballDraw() {
  const ctx = pCtx;
  // 배경
  const bg = ctx.createLinearGradient(0, 0, 0, PH);
  bg.addColorStop(0, '#141127');
  bg.addColorStop(1, '#0c0a18');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, PW, PH);

  // 발사 채널
  ctx.fillStyle = 'rgba(255,216,102,.05)';
  ctx.fillRect(FIELD_R, 0, PW - FIELD_R, PH);
  ctx.fillStyle = 'rgba(255,216,102,.4)';
  ctx.fillRect(FIELD_R - 2, CHANNEL_TOP, 4, PH - CHANNEL_TOP);

  // 디플렉터 (크롬 곡선)
  const dg = ctx.createLinearGradient(DEFLECTOR.x1, DEFLECTOR.y1, DEFLECTOR.x2, DEFLECTOR.y2);
  dg.addColorStop(0, '#ffe89a');
  dg.addColorStop(1, '#8a6010');
  ctx.strokeStyle = dg;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(DEFLECTOR.x1, DEFLECTOR.y1);
  ctx.lineTo(DEFLECTOR.x2, DEFLECTOR.y2);
  ctx.stroke();

  // 네온 핀
  for (const p of pegs) {
    if (p.flash > 0) {
      p.flash--;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.shadowColor = 'rgba(90,208,230,.9)';
      ctx.shadowBlur = 7;
      ctx.fillStyle = '#5ad0e6';
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, 6.3);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // 슬롯
  const now = performance.now();
  for (let i = 0; i < SLOT_N; i++) {
    const x = i * SLOT_W;
    const m = SLOT_MULT[i];
    const flash = pResultFlash && pResultFlash.slot === i && now < pResultFlash.until;
    const blink = flash && Math.floor(now / 100) % 2 === 0;
    const g = ctx.createLinearGradient(0, SLOT_TOP, 0, PH);
    if (blink) {
      g.addColorStop(0, m > 0 ? '#5ef0a0' : '#ff5d7a');
      g.addColorStop(1, m > 0 ? '#1d6840' : '#6d1f30');
    } else if (m >= 5) {
      g.addColorStop(0, 'rgba(255,216,102,.28)');
      g.addColorStop(1, 'rgba(255,216,102,.08)');
    } else if (m > 0) {
      g.addColorStop(0, 'rgba(90,208,230,.16)');
      g.addColorStop(1, 'rgba(90,208,230,.04)');
    } else {
      g.addColorStop(0, 'rgba(255,93,122,.08)');
      g.addColorStop(1, 'rgba(0,0,0,.2)');
    }
    ctx.fillStyle = g;
    ctx.fillRect(x + 2, SLOT_TOP, SLOT_W - 4, PH - SLOT_TOP);

    ctx.font = '17px "Bebas Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (m >= 5) { ctx.fillStyle = '#ffd866'; ctx.shadowColor = 'rgba(255,216,102,.8)'; ctx.shadowBlur = 10; }
    else if (m > 0) { ctx.fillStyle = '#5ad0e6'; ctx.shadowColor = 'rgba(90,208,230,.7)'; ctx.shadowBlur = 8; }
    else { ctx.fillStyle = 'rgba(255,93,122,.55)'; ctx.shadowBlur = 0; }
    ctx.fillText(m > 0 ? '×' + m : '꽝', x + SLOT_W / 2, SLOT_TOP + 28);
    ctx.shadowBlur = 0;
  }
  // 칸막이
  ctx.fillStyle = 'rgba(255,216,102,.45)';
  for (let i = 1; i < SLOT_N; i++) ctx.fillRect(i * SLOT_W - 2, SLOT_TOP, 4, PH - SLOT_TOP);

  // 파워 게이지
  const gx = FIELD_R + 8, gh = 180, gy = PH - 214;
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fillRect(gx, gy, 10, gh);
  const ph = gh * (pPower / 100);
  const pg = ctx.createLinearGradient(0, gy + gh, 0, gy);
  pg.addColorStop(0, '#5ef0a0');
  pg.addColorStop(0.5, '#ffd866');
  pg.addColorStop(1, '#ff5d7a');
  ctx.save();
  ctx.beginPath();
  ctx.rect(gx, gy + gh - ph, 10, ph);
  ctx.clip();
  ctx.fillStyle = pg;
  ctx.shadowColor = 'rgba(255,216,102,.8)';
  ctx.shadowBlur = 10;
  ctx.fillRect(gx, gy, 10, gh);
  ctx.restore();

  // 발사대
  if (!pball) {
    const bx = (FIELD_R + PW) / 2;
    const bob = Math.sin(now / 300) * 2;
    ctx.fillStyle = '#ffd866';
    ctx.shadowColor = 'rgba(255,216,102,.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(bx, PH - 20 + bob, 7, 0, 6.3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = '11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOLD', bx, PH - 40 + bob);
  }

  // 구슬 + 트레일
  if (pball) {
    pball.trail.forEach((t, i) => {
      ctx.globalAlpha = (i / pball.trail.length) * 0.4;
      ctx.fillStyle = '#ffd866';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 5, 0, 6.3);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    const bg2 = ctx.createRadialGradient(pball.x - 2.5, pball.y - 2.5, 1, pball.x, pball.y, 8);
    bg2.addColorStop(0, '#fff7d6');
    bg2.addColorStop(0.6, '#ffd866');
    bg2.addColorStop(1, '#b87f1a');
    ctx.fillStyle = bg2;
    ctx.shadowColor = 'rgba(255,216,102,.9)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(pball.x, pball.y, 7, 0, 6.3);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

pCv.addEventListener('mousedown', e => { e.preventDefault(); if (!pball) { pCharging = true; pPower = 0; pPowerDir = 1; } });
pCv.addEventListener('touchstart', e => { e.preventDefault(); if (!pball) { pCharging = true; pPower = 0; pPowerDir = 1; } });
window.addEventListener('mouseup', () => { if (pCharging) { pCharging = false; pinballLaunch(); } });
window.addEventListener('touchend', () => { if (pCharging) { pCharging = false; pinballLaunch(); } });

function pinballLoop() {
  pinballUpdate();
  if (pCv.offsetParent) pinballDraw();
  requestAnimationFrame(pinballLoop);
}

/* ============================================================
   5) 인형뽑기 — CLAW MASTER
   ============================================================ */
const CLAW_COST = 400;
// 밸런스: 비쌀수록 급격히 어려워짐 — 기대값이 비용을 넘지 않게
const CLAW_TIERS = {
  common: { val: 200,  color: '#9aa3b5', color2: '#c7cdd9', grab: 0.90, slip: 0.08 },
  blue:   { val: 600,  color: '#3fa8c2', color2: '#8ee3f5', grab: 0.72, slip: 0.25 },
  purple: { val: 2000, color: '#9a64d8', color2: '#d9b8ff', grab: 0.45, slip: 0.50 },
  gold:   { val: 8000, color: '#e0a93c', color2: '#fff3c2', grab: 0.22, slip: 0.72 },
};
const clawCv = $('#claw-canvas');
const clawCtx = clawCv.getContext('2d');
const CW = clawCv.width, CH = clawCv.height;
const CLAW_FLOOR = 368;     // 인형이 놓이는 바닥
const CHUTE_X = 42;         // 배출구 중심
const CLAW_TOP = 70;

let clawPrizes = [];
const claw = {
  x: 200, y: CLAW_TOP, open: 1, dir: 1,
  state: 'idle',            // idle | drop | grab | lift | carry | open
  prize: null, candidate: null, targetY: 0, slipY: 0,
};

function genClawPrizes() {
  clawPrizes = [];
  const tiers = shuffle([
    'common', 'common', 'common',
    'blue', 'blue', 'purple',
    Math.random() < 0.35 ? 'gold' : (Math.random() < 0.5 ? 'purple' : 'blue'),
  ]);
  tiers.forEach((tier, i) => {
    const r = rand(14, 18);
    clawPrizes.push({
      tier, r,
      x: 102 + i * 34 + rand(-5, 5),
      y: CLAW_FLOOR - r,
      falling: false, inChute: false, vy: 0,
    });
  });
}

function clawSuccessChance(p, cx) {
  const dist = Math.abs(p.x - cx);
  const align = 1 - (dist / (p.r + 10)) * 0.65; // 중심에 가까울수록 잘 잡힘
  return CLAW_TIERS[p.tier].grab * align;
}

function startClaw() {
  if (claw.state !== 'idle') return;
  if (!spend(CLAW_COST)) return;
  snd.click();
  $('#claw-result').innerHTML = '&nbsp;';
  $('#claw-result').className = 'result-line';
  $('#claw-btn').disabled = true;

  // 떨어뜨릴 지점의 인형 탐색
  let best = null, bestD = 1e9;
  for (const p of clawPrizes) {
    if (p.inChute) continue;
    const d = Math.abs(p.x - claw.x);
    if (d < p.r + 10 && d < bestD) { best = p; bestD = d; }
  }
  claw.candidate = best;
  claw.targetY = best ? best.y - best.r - 4 : CLAW_FLOOR - 22;
  claw.open = 1;
  claw.state = 'drop';
}

function resolveClawGrab() {
  const c = claw;
  const p = c.candidate;
  c.candidate = null;
  if (p && Math.random() < clawSuccessChance(p, c.x)) {
    c.prize = p;
    // 들어올리는 도중 미끄러질 수도 (비쌀수록 잘 떨어짐)
    if (Math.random() < CLAW_TIERS[p.tier].slip) {
      c.slipY = Math.max(95, rand(100, c.y - 35));
    } else {
      c.slipY = 0;
    }
    snd.coin();
  } else {
    c.prize = null;
    c.slipY = 0;
    if (p) snd.tick();
  }
}

function clawFail(msg) {
  loseFX();
  const el = $('#claw-result');
  el.textContent = msg;
  el.className = 'result-line lose';
}

function collectClawPrize(p) {
  clawPrizes = clawPrizes.filter(x => x !== p);
  const t = CLAW_TIERS[p.tier];
  addMoney(t.val);
  winFX(t.val, clawCv);
  const el = $('#claw-result');
  el.textContent = `🧸 ${p.tier === 'gold' ? '황금곰' : '곰인형'} 획득! +${fmt(t.val)}`;
  el.className = 'result-line win';
  toast(`🧸 인형 획득! +${fmt(t.val)}`, 'good');
  if (clawPrizes.length < 3) genClawPrizes(); // 재입고
}

function clawUpdate() {
  const c = claw;

  // 떨어지는 인형들
  for (const p of clawPrizes) {
    if (p.inChute) {
      p.vy += 0.55;
      p.y += p.vy;
      if (p.y > CH + 40) collectClawPrize(p);
    } else if (p.falling) {
      p.vy += 0.55;
      p.y += p.vy;
      if (p.y >= CLAW_FLOOR - p.r) { p.y = CLAW_FLOOR - p.r; p.falling = false; p.vy = 0; }
    }
  }

  switch (c.state) {
    case 'idle':
      c.x += 3.1 * c.dir; // 빨라서 타이밍이 더 어렵다
      if (c.x > 332) { c.x = 332; c.dir = -1; }
      if (c.x < 96) { c.x = 96; c.dir = 1; }
      break;
    case 'drop':
      c.y += 4.5;
      if (c.y >= c.targetY) { c.y = c.targetY; c.state = 'grab'; }
      break;
    case 'grab':
      c.open -= 0.07;
      if (c.open <= 0) {
        c.open = 0;
        resolveClawGrab();
        if (!c.prize) clawFail('헛손질! 아무것도 못 잡았어요...');
        c.state = 'lift';
      }
      break;
    case 'lift':
      c.y -= 3.2;
      if (c.prize) {
        c.prize.x = c.x;
        c.prize.y = c.y + 26;
        if (c.slipY && c.y <= c.slipY) {
          // 앗! 미끄러졌다
          c.prize.falling = true;
          c.prize.vy = 0;
          c.prize = null;
          c.slipY = 0;
          shake();
          clawFail('앗!! 다 잡았는데 미끄러졌다...!');
        }
      }
      if (c.y <= CLAW_TOP) {
        c.y = CLAW_TOP;
        if (c.prize) c.state = 'carry';
        else { c.state = 'idle'; $('#claw-btn').disabled = false; }
      }
      break;
    case 'carry':
      c.x -= 2.6;
      c.prize.x = c.x;
      c.prize.y = c.y + 26;
      if (c.x <= CHUTE_X) { c.x = CHUTE_X; c.state = 'open'; }
      break;
    case 'open':
      c.open += 0.07;
      if (c.prize) {
        c.prize.inChute = true;
        c.prize.vy = 0;
        c.prize = null;
      }
      if (c.open >= 1) {
        c.open = 1;
        c.state = 'idle';
        $('#claw-btn').disabled = false;
      }
      break;
  }
}

function drawClawBear(ctx, p) {
  const t = CLAW_TIERS[p.tier];
  const { x, y, r } = p;
  ctx.save();
  if (p.tier === 'gold') {
    ctx.shadowColor = 'rgba(255,216,102,.85)';
    ctx.shadowBlur = 16;
  }
  // 귀
  ctx.fillStyle = t.color;
  ctx.beginPath(); ctx.arc(x - r * 0.62, y - r * 0.72, r * 0.34, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.62, y - r * 0.72, r * 0.34, 0, 6.3); ctx.fill();
  // 몸통
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.2, x, y, r * 1.15);
  g.addColorStop(0, t.color2);
  g.addColorStop(1, t.color);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
  ctx.shadowBlur = 0;
  // 주둥이
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.28, r * 0.42, r * 0.32, 0, 0, 6.3); ctx.fill();
  // 눈/코
  ctx.fillStyle = '#1d1626';
  ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.14, r * 0.1, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.32, y - r * 0.14, r * 0.1, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 0.11, 0, 6.3); ctx.fill();
  ctx.restore();
}

function clawDraw() {
  const ctx = clawCtx;
  // 배경
  const bg = ctx.createLinearGradient(0, 0, 0, CH);
  bg.addColorStop(0, '#171331');
  bg.addColorStop(1, '#0d0a1c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CW, CH);

  // 천장 레일
  ctx.fillStyle = 'rgba(255,216,102,.5)';
  ctx.fillRect(14, 48, CW - 28, 5);

  // 배출구
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(CHUTE_X - 30, CLAW_FLOOR - 6, 60, CH - CLAW_FLOOR + 6);
  ctx.strokeStyle = 'rgba(255,216,102,.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(CHUTE_X - 30, CLAW_FLOOR - 6, 60, CH - CLAW_FLOOR + 6);
  ctx.fillStyle = '#ffd866';
  ctx.font = '15px "Bebas Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(255,216,102,.8)';
  ctx.shadowBlur = 8;
  ctx.fillText('OUT', CHUTE_X, CLAW_FLOOR + 24);
  ctx.shadowBlur = 0;

  // 바닥
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  ctx.fillRect(CHUTE_X + 30, CLAW_FLOOR, CW - CHUTE_X - 30 - 8, 4);

  // 인형들
  for (const p of clawPrizes) drawClawBear(ctx, p);

  // 집게 케이블
  const c = claw;
  ctx.strokeStyle = '#8c8ca8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c.x, 53);
  ctx.lineTo(c.x, c.y);
  ctx.stroke();

  // 집게 본체
  const cg = ctx.createLinearGradient(c.x, c.y - 8, c.x, c.y + 8);
  cg.addColorStop(0, '#ffe89a');
  cg.addColorStop(1, '#b87f1a');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.roundRect(c.x - 10, c.y - 8, 20, 14, 4);
  ctx.fill();

  // 집게 발 (open: 0=닫힘, 1=열림)
  const spread = 6 + c.open * 13;
  ctx.strokeStyle = '#d9d2e4';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(c.x + side * 6, c.y + 5);
    ctx.quadraticCurveTo(c.x + side * spread, c.y + 16, c.x + side * (spread - 4), c.y + 30);
    ctx.stroke();
  }

  // 유리 반사광
  const shine = ctx.createLinearGradient(0, 0, CW, CH);
  shine.addColorStop(0, 'rgba(255,255,255,.05)');
  shine.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, CW, CH);

  // 조준 가이드 (대기 중일 때)
  if (c.state === 'idle') {
    ctx.strokeStyle = 'rgba(255,216,102,.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y + 18);
    ctx.lineTo(c.x, CLAW_FLOOR);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

$('#claw-btn').addEventListener('click', startClaw);
clawCv.addEventListener('mousedown', startClaw);
clawCv.addEventListener('touchstart', e => { e.preventDefault(); startClaw(); });

function clawLoop() {
  clawUpdate();
  if (clawCv.offsetParent) clawDraw();
  requestAnimationFrame(clawLoop);
}

/* ============================================================
   6) 슬롯머신 — GOLD SLOTS
   ============================================================ */
const SLOT_SYMS = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣'];
const SLOT_TABLE = [ // [확률, 심볼, 배수]
  { p: 0.002, sym: '7️⃣', mult: 50 },
  { p: 0.005, sym: '💎', mult: 20 },
  { p: 0.010, sym: '⭐', mult: 10 },
  { p: 0.020, sym: '🔔', mult: 7 },
  { p: 0.030, sym: '🍋', mult: 5 },
  { p: 0.040, sym: '🍒', mult: 4 },
  { p: 0.100, sym: 'cherry2', mult: 2 },
];
const reels = [$('#reel-0'), $('#reel-1'), $('#reel-2')];
const getSlotsBet = initBetBox($('#slots-bet'));
let slotsSpinning = false;

function slotsOutcome() {
  let r = Math.random();
  for (const t of SLOT_TABLE) {
    r -= t.p;
    if (r <= 0) return t;
  }
  return null; // 꽝
}

function slotsFinalSymbols(outcome) {
  if (outcome && outcome.sym !== 'cherry2') {
    return [outcome.sym, outcome.sym, outcome.sym];
  }
  if (outcome) {
    // 체리 2개 + 다른 심볼 1개
    const other = SLOT_SYMS.filter(s => s !== '🍒')[Math.floor(rand(0, 5))];
    return shuffle(['🍒', '🍒', other]);
  }
  // 꽝: 3매치도, 체리 2개도 아니게
  let syms;
  do {
    syms = [0, 0, 0].map(() => SLOT_SYMS[Math.floor(rand(0, SLOT_SYMS.length))]);
  } while (
    (syms[0] === syms[1] && syms[1] === syms[2]) ||
    syms.filter(s => s === '🍒').length >= 2
  );
  return syms;
}

$('#slots-spin').addEventListener('click', () => {
  if (slotsSpinning) return;
  const bet = getSlotsBet();
  if (!spend(bet)) return;
  slotsSpinning = true;
  $('#slots-spin').disabled = true;
  const resEl = $('#slots-result');
  resEl.innerHTML = '&nbsp;';
  resEl.className = 'result-line';

  const outcome = slotsOutcome();
  const finals = slotsFinalSymbols(outcome);
  const stopAt = [700, 1250, 1800];
  const t0 = performance.now();
  const stopped = [false, false, false];

  reels.forEach(el => { el.classList.add('spin'); el.classList.remove('hit'); });

  const iv = setInterval(() => {
    const t = performance.now() - t0;
    reels.forEach((el, i) => {
      if (stopped[i]) return;
      if (t >= stopAt[i]) {
        stopped[i] = true;
        el.textContent = finals[i];
        el.classList.remove('spin');
        snd.tick();
        return;
      }
      el.textContent = SLOT_SYMS[Math.floor(rand(0, SLOT_SYMS.length))];
    });

    if (stopped.every(Boolean)) {
      clearInterval(iv);
      slotsSpinning = false;
      $('#slots-spin').disabled = false;
      if (outcome) {
        const win = Math.floor(bet * outcome.mult);
        addMoney(win);
        winFX(win, $('.slot-window'));
        reels.forEach((el, i) => {
          if (outcome.sym === 'cherry2' ? finals[i] === '🍒' : true) el.classList.add('hit');
        });
        resEl.textContent = `${outcome.sym === 'cherry2' ? '🍒🍒' : outcome.sym.repeat(3)} ×${outcome.mult}! +${fmt(win)}`;
        resEl.className = 'result-line win';
      } else {
        loseFX();
        resEl.textContent = `꽝... -${fmt(bet)}`;
        resEl.className = 'result-line lose';
      }
    }
  }, 55);
});

/* ============================================================
   7) 하이로우 — 연속으로 맞춰 판돈 키우기
   ============================================================ */
const HL_MULT = 1.3;
const HL_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const HL_SUITS = ['♠', '♥', '♦', '♣'];
const getHlBet = initBetBox($('#hl-bet'));
const hlCard = $('#hl-card');
let hlPlaying = false;
let hlPot = 0;
let hlStreak = 0;
let hlCur = 0; // 1~13

function hlDraw() { return 1 + Math.floor(Math.random() * 13); }

function hlShowCard(v) {
  const suit = HL_SUITS[Math.floor(rand(0, 4))];
  hlCard.textContent = HL_RANKS[v - 1] + suit;
  hlCard.className = 'hl-card' + (suit === '♥' || suit === '♦' ? ' red' : '');
  hlCard.classList.add('flip');
  setTimeout(() => hlCard.classList.remove('flip'), 420);
}

function hlUpdateInfo() {
  $('#hl-pot').textContent = hlPlaying ? fmt(hlPot) : '-';
  $('#hl-streak').textContent = hlStreak;
}

function hlEnd() {
  hlPlaying = false;
  $('#hl-high').disabled = true;
  $('#hl-low').disabled = true;
  $('#hl-btn').textContent = '게임 시작';
}

function hlGuess(dir) {
  if (!hlPlaying) return;
  const next = hlDraw();
  hlShowCard(next);
  const win = dir === 'high' ? next > hlCur : next < hlCur;
  const resEl = $('#hl-result');
  hlCur = next;
  if (win) {
    hlPot = Math.floor(hlPot * HL_MULT);
    hlStreak++;
    hlUpdateInfo();
    snd.coin();
    resEl.textContent = `맞았다! POT ${fmt(hlPot)} — 계속? 아니면 현금화?`;
    resEl.className = 'result-line win';
  } else {
    loseFX();
    shake();
    resEl.textContent = `${HL_RANKS[next - 1]} 나옴... 전부 날렸다! -${fmt(hlPot)}`;
    resEl.className = 'result-line lose';
    hlPot = 0;
    hlStreak = 0;
    hlEnd();
    hlUpdateInfo();
  }
}

$('#hl-btn').addEventListener('click', () => {
  if (!hlPlaying) {
    const bet = getHlBet();
    if (!spend(bet)) return;
    hlPlaying = true;
    hlPot = bet;
    hlStreak = 0;
    hlCur = hlDraw();
    hlShowCard(hlCur);
    hlUpdateInfo();
    $('#hl-high').disabled = false;
    $('#hl-low').disabled = false;
    $('#hl-btn').textContent = '💰 현금화';
    $('#hl-result').textContent = '다음 카드는 높을까, 낮을까? (같으면 패배!)';
    $('#hl-result').className = 'result-line';
  } else {
    // 현금화
    const out = hlPot;
    addMoney(out);
    if (hlStreak > 0) winFX(out, hlCard);
    $('#hl-result').textContent = `💰 ${hlStreak}연속 적중, ${fmt(out)} 현금화!`;
    $('#hl-result').className = 'result-line win';
    hlEnd();
    hlUpdateInfo();
  }
});
$('#hl-high').addEventListener('click', () => hlGuess('high'));
$('#hl-low').addEventListener('click', () => hlGuess('low'));

/* ============================================================
   8) 지뢰 — MINES
   ============================================================ */
const MINES_N = 25;
const getMinesBet = initBetBox($('#mines-bet'));
let minesBombs = 3;
let minesPlaying = false;
let minesBet = 0;
let minesMult = 1;
let minesPicks = 0;
let bombSet = new Set();
const mineTiles = [];

const minesGrid = $('#mines-grid');
for (let i = 0; i < MINES_N; i++) {
  const b = document.createElement('button');
  b.className = 'mine-tile';
  b.disabled = true;
  b.textContent = '💎';
  b.addEventListener('click', () => pickMine(i, b));
  minesGrid.appendChild(b);
  mineTiles.push(b);
}

document.querySelectorAll('#mines-diff .bet-chip').forEach(b => {
  b.addEventListener('click', () => {
    if (minesPlaying) return;
    document.querySelectorAll('#mines-diff .bet-chip').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    minesBombs = parseInt(b.dataset.bombs);
  });
});

function minesUpdateInfo() {
  $('#mines-mult').textContent = '×' + minesMult.toFixed(2);
  $('#mines-pot').textContent = minesPlaying ? fmt(Math.floor(minesBet * minesMult)) : '-';
}

function minesReset() {
  mineTiles.forEach(t => {
    t.className = 'mine-tile';
    t.disabled = true;
    t.textContent = '💎';
  });
}

function minesEnd(revealBombs) {
  minesPlaying = false;
  mineTiles.forEach((t, i) => {
    t.disabled = true;
    if (revealBombs && bombSet.has(i) && !t.classList.contains('boom')) {
      t.classList.add('reveal-bomb');
      t.textContent = '💣';
    }
  });
  $('#mines-btn').textContent = '게임 시작';
}

function pickMine(i, tile) {
  if (!minesPlaying || tile.classList.contains('safe')) return;
  if (bombSet.has(i)) {
    tile.textContent = '💣';
    tile.classList.add('boom');
    shake();
    loseFX();
    $('#mines-result').textContent = `💥 펑! -${fmt(minesBet)}`;
    $('#mines-result').className = 'result-line lose';
    minesEnd(true);
    minesMult = 1;
    minesUpdateInfo();
    return;
  }
  tile.classList.add('safe');
  tile.disabled = true;
  snd.coin();
  minesPicks++;
  // 공정 배당 × 0.97 하우스 엣지
  const remaining = MINES_N - (minesPicks - 1);
  const safe = remaining - minesBombs;
  minesMult *= (remaining / safe) * 0.97;
  minesUpdateInfo();
  $('#mines-btn').textContent = `💰 현금화 — ${fmt(Math.floor(minesBet * minesMult))}`;

  // 안전 칸을 전부 열면 자동 현금화
  if (minesPicks >= MINES_N - minesBombs) minesCashout();
}

function minesCashout() {
  const win = Math.floor(minesBet * minesMult);
  addMoney(win);
  winFX(win, minesGrid);
  $('#mines-result').textContent = `💎 ${minesPicks}칸 발굴, +${fmt(win)}!`;
  $('#mines-result').className = 'result-line win';
  minesEnd(true);
  minesMult = 1;
  minesUpdateInfo();
}

$('#mines-btn').addEventListener('click', () => {
  if (minesPlaying) {
    if (minesPicks === 0) { toast('최소 한 칸은 열어야 해요!', 'bad'); return; }
    minesCashout();
    return;
  }
  const bet = getMinesBet();
  if (!spend(bet)) return;
  minesBet = bet;
  minesPlaying = true;
  minesPicks = 0;
  minesMult = 1;
  bombSet = new Set();
  while (bombSet.size < minesBombs) bombSet.add(Math.floor(Math.random() * MINES_N));
  minesReset();
  mineTiles.forEach(t => { t.disabled = false; });
  minesUpdateInfo();
  $('#mines-btn').textContent = '💰 현금화';
  $('#mines-result').textContent = '지뢰를 피해 칸을 여세요!';
  $('#mines-result').className = 'result-line';
});

/* ============================================================
   9) 크래시 — ROCKET CRASH
   ============================================================ */
const crashCv = $('#crash-canvas');
const crashCtx = crashCv.getContext('2d');
const XW = crashCv.width, XH = crashCv.height;
const getCrashBet = initBetBox($('#crash-bet'));
let crashState = 'idle'; // idle | flying | boom
let crashBet = 0;        // 0 = 이미 탈출함
let crashT0 = 0;
let crashPoint = 1;
let crashMult = 1;
let crashPath = [];
let crashBoomAt = 0;
const crashStars = Array.from({ length: 40 }, () => ({ x: rand(0, XW), y: rand(0, XH), r: rand(0.5, 1.6) }));

function crashStart() {
  if (crashState === 'flying') {
    // 탈출!
    if (crashBet > 0) {
      const win = Math.floor(crashBet * crashMult);
      addMoney(win);
      winFX(win, crashCv);
      $('#crash-result').textContent = `🪂 ×${crashMult.toFixed(2)}에서 탈출! +${fmt(win)}`;
      $('#crash-result').className = 'result-line win';
      crashBet = 0;
      $('#crash-btn').disabled = true; // 터질 때까지 관전
    }
    return;
  }
  if (crashState !== 'idle') return;
  const bet = getCrashBet();
  if (!spend(bet)) return;
  crashBet = bet;
  // P(crashPoint ≥ x) = 0.96/x — 4%는 즉시 폭발
  crashPoint = Math.min(200, 0.96 / (1 - Math.random()));
  if (crashPoint < 1) crashPoint = 1;
  crashT0 = performance.now();
  crashMult = 1;
  crashPath = [];
  crashState = 'flying';
  snd.launch();
  $('#crash-btn').textContent = '🪂 탈출!';
  $('#crash-result').textContent = '올라간다... 언제 탈출할래?';
  $('#crash-result').className = 'result-line';
}

function crashUpdate(now) {
  if (crashState === 'flying') {
    const t = (now - crashT0) / 1000;
    crashMult = Math.exp(0.18 * t);
    crashPath.push({ t, m: crashMult });
    if (crashPath.length > 400) crashPath.splice(0, crashPath.length - 400);
    if (crashBet > 0) $('#crash-btn').textContent = `🪂 탈출! — ${fmt(Math.floor(crashBet * crashMult))}`;

    if (crashMult >= crashPoint) {
      crashState = 'boom';
      crashBoomAt = now;
      shake();
      if (crashBet > 0) {
        loseFX();
        $('#crash-result').textContent = `💥 ×${crashPoint.toFixed(2)}에서 폭발... -${fmt(crashBet)}`;
        $('#crash-result').className = 'result-line lose';
      } else {
        snd.tick();
      }
      setTimeout(() => {
        crashState = 'idle';
        crashBet = 0;
        $('#crash-btn').disabled = false;
        $('#crash-btn').textContent = '🚀 발사!';
      }, 1400);
    }
  }
}

function crashDraw(now) {
  const ctx = crashCtx;
  const bg = ctx.createLinearGradient(0, 0, 0, XH);
  bg.addColorStop(0, '#0d0a20');
  bg.addColorStop(1, '#160f2a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, XW, XH);

  // 별
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (const s of crashStars) {
    ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(now / 900 + s.x));
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.3); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const flying = crashState === 'flying';
  const boom = crashState === 'boom';

  if (flying || boom) {
    // 곡선 스케일
    const maxT = Math.max(4, crashPath.length ? crashPath[crashPath.length - 1].t : 4);
    const maxM = Math.max(2, crashMult);
    const px = t => 24 + (t / maxT) * (XW - 70);
    const py = m => XH - 28 - ((m - 1) / (maxM - 1)) * (XH - 80);

    // 곡선
    ctx.strokeStyle = boom && crashBet === 0 ? 'rgba(255,216,102,.9)' : boom ? '#ff5d7a' : '#ffd866';
    ctx.lineWidth = 3;
    ctx.shadowColor = boom ? 'rgba(255,93,122,.8)' : 'rgba(255,216,102,.7)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    crashPath.forEach((p, i) => {
      if (i === 0) ctx.moveTo(px(p.t), py(p.m));
      else ctx.lineTo(px(p.t), py(p.m));
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    const last = crashPath[crashPath.length - 1];
    if (last) {
      const rx = px(last.t), ry = py(last.m);
      if (boom) {
        // 폭발
        const age = (now - crashBoomAt) / 400;
        ctx.fillStyle = `rgba(255,${120 - age * 60},80,${Math.max(0, 1 - age)})`;
        ctx.beginPath(); ctx.arc(rx, ry, 14 + age * 30, 0, 6.3); ctx.fill();
        ctx.font = '26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💥', rx, ry + 8);
      } else {
        // 로켓
        ctx.save();
        ctx.translate(rx, ry);
        const ang = crashPath.length > 3
          ? Math.atan2(py(crashPath[crashPath.length - 4].m) - ry, px(crashPath[crashPath.length - 4].t) - rx) + Math.PI
          : -0.6;
        ctx.rotate(ang + Math.PI / 2);
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚀', 0, 6);
        ctx.restore();
      }
    }
  }

  // 멀티플라이어 표시
  ctx.textAlign = 'center';
  ctx.font = '46px "Bebas Neue", sans-serif';
  if (boom) {
    ctx.fillStyle = '#ff5d7a';
    ctx.shadowColor = 'rgba(255,93,122,.8)';
  } else if (flying) {
    ctx.fillStyle = '#ffd866';
    ctx.shadowColor = 'rgba(255,216,102,.7)';
  } else {
    ctx.fillStyle = 'rgba(255,216,102,.4)';
    ctx.shadowColor = 'transparent';
  }
  ctx.shadowBlur = 14;
  ctx.fillText(
    boom ? '×' + crashPoint.toFixed(2) : flying ? '×' + crashMult.toFixed(2) : 'READY',
    XW / 2, 58
  );
  ctx.shadowBlur = 0;
}

$('#crash-btn').addEventListener('click', crashStart);

function crashLoop(now) {
  crashUpdate(now);
  if (crashCv.offsetParent) crashDraw(now);
  requestAnimationFrame(crashLoop);
}

/* ============================================================
   10) 주사위 — LUCKY DICE
   ============================================================ */
const getDiceBet = initBetBox($('#dice-bet'));
const diceSlider = $('#dice-slider');
const diceRollEl = $('#dice-roll');
let diceRolling = false;

function diceMult(t) { return 97 / t; }
function diceUpdateInfo() {
  const t = parseInt(diceSlider.value);
  $('#dice-target').textContent = t.toFixed(2) + ' 미만';
  $('#dice-chance').textContent = t + '%';
  $('#dice-mult').textContent = '×' + diceMult(t).toFixed(2);
}
diceSlider.addEventListener('input', diceUpdateInfo);

$('#dice-btn').addEventListener('click', () => {
  if (diceRolling) return;
  const bet = getDiceBet();
  if (!spend(bet)) return;
  diceRolling = true;
  $('#dice-btn').disabled = true;
  const target = parseInt(diceSlider.value);
  const mult = diceMult(target);
  const final = Math.random() * 100;
  const resEl = $('#dice-result');
  resEl.innerHTML = '&nbsp;';
  resEl.className = 'result-line';
  diceRollEl.className = 'dice-display rolling';

  const t0 = performance.now();
  let lastTick = -1;
  (function scramble(now) {
    if (now - t0 < 900) {
      diceRollEl.textContent = (Math.random() * 100).toFixed(2);
      const seg = Math.floor((now - t0) / 90);
      if (seg !== lastTick) { snd.tick(); lastTick = seg; }
      requestAnimationFrame(scramble);
      return;
    }
    diceRollEl.textContent = final.toFixed(2);
    diceRolling = false;
    $('#dice-btn').disabled = false;
    if (final < target) {
      const win = Math.floor(bet * mult);
      addMoney(win);
      winFX(win, diceRollEl);
      diceRollEl.className = 'dice-display win-flash';
      resEl.textContent = `🎲 ${final.toFixed(2)} < ${target} 승리! +${fmt(win)}`;
      resEl.className = 'result-line win';
    } else {
      loseFX();
      diceRollEl.className = 'dice-display lose-flash';
      resEl.textContent = `🎲 ${final.toFixed(2)} ≥ ${target}... -${fmt(bet)}`;
      resEl.className = 'result-line lose';
    }
  })(t0);
});

/* ============================================================
   11) 10초 챌린지
   ============================================================ */
const timerDisplay = $('#timer-display');
const timerBtn = $('#timer-btn');
const getTimerBet = initBetBox($('#timer-bet'));
let timerRunning = false;
let timerStart = 0;
let timerBetAmt = 0;
let timerRaf = 0;

function timerTick() {
  const t = (performance.now() - timerStart) / 1000;
  if (t < 3) {
    timerDisplay.textContent = t.toFixed(2);
    timerDisplay.classList.remove('hidden-time');
  } else {
    timerDisplay.textContent = '?.??';
    timerDisplay.classList.add('hidden-time');
  }
  if (t > 15) { stopTimer(); return; }
  if (timerRunning) timerRaf = requestAnimationFrame(timerTick);
}

function stopTimer() {
  timerRunning = false;
  cancelAnimationFrame(timerRaf);
  const t = (performance.now() - timerStart) / 1000;
  timerDisplay.textContent = t.toFixed(2);
  timerDisplay.classList.remove('hidden-time');
  timerBtn.textContent = 'START';

  const diff = Math.abs(t - 10);
  const el = $('#timer-result');
  let mult = 0, label = '';
  if (diff <= 0.01) { mult = 10; label = '🏆 완벽!!'; }
  else if (diff <= 0.05) { mult = 4; label = '🔥 대단해요!'; }
  else if (diff <= 0.15) { mult = 2; label = '👍 좋아요!'; }
  else if (diff <= 0.5) { mult = 1; label = '본전!'; }

  if (mult > 0) {
    const win = Math.floor(timerBetAmt * mult);
    addMoney(win);
    if (mult > 1) winFX(win, timerDisplay);
    else snd.coin();
    el.textContent = `${label} 오차 ${diff.toFixed(2)}초 → ${mult}배 ${mult > 1 ? '+' + fmt(win) : '(환불)'}`;
    el.className = 'result-line win';
  } else {
    loseFX();
    el.textContent = `😵 오차 ${diff.toFixed(2)}초... -${fmt(timerBetAmt)}`;
    el.className = 'result-line lose';
  }
}

timerBtn.addEventListener('click', () => {
  if (!timerRunning) {
    const bet = getTimerBet();
    if (!spend(bet)) return;
    timerBetAmt = bet;
    timerRunning = true;
    timerStart = performance.now();
    timerBtn.textContent = 'STOP!!';
    $('#timer-result').textContent = '10.00초가 되는 순간 멈추세요!';
    $('#timer-result').className = 'result-line';
    timerTick();
  } else {
    stopTimer();
  }
});

/* ================= 헤더 버튼 ================= */
$('#reset-btn').addEventListener('click', () => {
  if (!confirm('정말 처음부터 다시 시작할까요? 모든 돈이 사라집니다!')) return;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
});

const soundBtn = $('#sound-btn');
function renderSoundBtn() { soundBtn.textContent = state.muted ? '🔇' : '🔊'; }
soundBtn.addEventListener('click', () => {
  state.muted = !state.muted;
  renderSoundBtn();
  save();
});

/* ============================================================
   화면 라우터 (홈 / 직장 / 일터 / 카지노)
   ============================================================ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (!go) return;
  const dest = go.dataset.go;
  showScreen('screen-' + dest);
  if (dest === 'workplace') renderJobList();
  if (dest === 'ranking') renderRanking();
  if (dest === 'stocks') renderStockList();
});

/* ============================================================
   직장 — 회사 목록 & 입사시험
   ============================================================ */
const COMPANIES = [
  { id: 'labor',    icon: '🧽', name: '아르바이트',     field: '단순노동', payLabel: '₩50 ~ ₩120', examLvl: 0, jobDesc: '접시·바닥을 마우스로 문질러 청소' },
  { id: 'paperboy', icon: '🗞', name: '새벽 신문배달',  field: '배달',     payLabel: '₩90 / 구역',  examLvl: 0, jobDesc: '나타나는 우편함을 빠르게 클릭' },
  { id: 'store',    icon: '🏪', name: '24시 편의점',    field: '서비스',   payLabel: '₩180 / 손님', examLvl: 0, jobDesc: '화면을 연타해 바코드 스캔' },
  { id: 'barista',  icon: '☕', name: '카페 드림',       field: '서비스',   payLabel: '₩200 / 잔',   examLvl: 1, jobDesc: '커피를 골든 라인에 맞춰 따르기' },
  { id: 'courier',  icon: '📦', name: '번개 물류센터',   field: '물류',     payLabel: '₩350 / 건',   examLvl: 2, jobDesc: '쏟아지는 택배 상자를 빠르게 분류' },
  { id: 'chef',     icon: '🍳', name: '비스트로 셰프',   field: '요식업',   payLabel: '₩480 / 접시', examLvl: 2, jobDesc: '타이밍 맞춰 스테이크 뒤집기' },
  { id: 'dev',      icon: '💻', name: '코드웍스 IT',     field: '개발',     payLabel: '₩650 / 커밋', examLvl: 3, jobDesc: '키보드로 코드를 정확히 타이핑' },
  { id: 'pilot',    icon: '✈️', name: '스카이 항공',     field: '운송',     payLabel: '₩950 / 착륙', examLvl: 3, jobDesc: '활주로 존에 맞춰 정밀 착륙' },
  { id: 'doctor',   icon: '🩺', name: '서울 대학병원',   field: '의료',     payLabel: '₩1,300 / 진료', examLvl: 4, jobDesc: '움직이는 환부를 정밀하게 클릭' },
  { id: 'ceo',      icon: '👔', name: '대기업 CEO',      field: '경영',     payLabel: '₩1,800 / 안건', examLvl: 4, jobDesc: '불빛 순서를 기억해 결재' },
];

function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

function renderJobList() {
  const list = $('#job-list');
  list.innerHTML = '';
  for (const c of COMPANIES) {
    const hired = !!state.hired[c.id];
    const card = document.createElement('div');
    card.className = 'job-card' + (hired ? ' hired' : '');
    let action;
    if (hired) action = '<span class="jc-go">출근 ▶</span>';
    else if (c.examLvl === 0) action = '<span class="jc-go">바로 시작 ▶</span>';
    else action = `<span class="jc-lock">🔒 합격 필요</span><span class="jc-stars">${stars(c.examLvl)}</span>`;
    const badge = c.examLvl === 0
      ? '<span class="jc-field" style="border-color:rgba(94,240,160,.5);color:var(--green)">면접 없음</span>'
      : `<span class="jc-field" style="border-color:var(--line-strong);color:var(--gold)">면접 필요</span>`;
    card.innerHTML = `
      <div class="jc-icon">${c.icon}</div>
      <div class="jc-main">
        <div class="jc-name">${c.name}<span class="jc-field">${c.field}</span>${badge}</div>
        <div class="jc-desc">${c.jobDesc}</div>
        <div class="jc-pay">${c.payLabel}</div>
      </div>
      <div class="jc-action">${action}</div>`;
    card.addEventListener('click', () => openJob(c));
    list.appendChild(card);
  }
}

function openJob(c) {
  if (state.hired[c.id]) {
    showScreen('screen-work-' + c.id);
    onEnterWork(c.id);
  } else if (c.examLvl === 0) {
    state.hired[c.id] = true; save();
    showScreen('screen-work-' + c.id);
    onEnterWork(c.id);
  } else {
    openExam(c);
  }
}

function onEnterWork(id) {
  if (id === 'labor') newLaborJob();
  else if (id === 'barista') baristaNew();
  else if (id === 'courier') courierStart();
  else if (id === 'dev') devNew();
  else if (id === 'doctor') doctorStart();
  else if (arcadeJobs[id]) arcadeJobs[id].start();
}

/* ===== 입사시험 (간단 퀴즈, 난이도 = 월급) ===== */
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function mcOptions(ans, spread) {
  const set = new Set([ans]);
  let guard = 0;
  while (set.size < 4 && guard++ < 50) {
    const d = ans + (ri(0, 1) ? 1 : -1) * ri(1, spread);
    if (d !== ans && d >= 0) set.add(d);
  }
  while (set.size < 4) set.add(ans + set.size); // 안전장치
  const arr = shuffle([...set]);
  return { options: arr.map(String), answer: arr.indexOf(ans) };
}

function genQuestion(level) {
  const r = Math.random();
  if (level <= 1) {
    if (r < 0.5) { const a = ri(1, 9), b = ri(1, 9); return { q: `${a} + ${b} = ?`, ...mcOptions(a + b, 4) }; }
    const x = ri(5, 9), y = ri(1, 4); return { q: `${x} - ${y} = ?`, ...mcOptions(x - y, 4) };
  }
  if (level === 2) {
    if (r < 0.4) { const a = ri(10, 49), b = ri(10, 49); return { q: `${a} + ${b} = ?`, ...mcOptions(a + b, 9) }; }
    if (r < 0.8) { const a = ri(2, 9), b = ri(2, 9); return { q: `${a} × ${b} = ?`, ...mcOptions(a * b, 8) }; }
    const s = ri(1, 5), st = ri(2, 4); return { q: `${s}, ${s + st}, ${s + 2 * st}, ? (다음 수)`, ...mcOptions(s + 3 * st, 4) };
  }
  if (level === 3) {
    if (r < 0.4) { const a = ri(11, 29), b = ri(3, 9); return { q: `${a} × ${b} = ?`, ...mcOptions(a * b, 16) }; }
    if (r < 0.7) { const a = ri(50, 99), b = ri(21, 49); return { q: `${a} - ${b} = ?`, ...mcOptions(a - b, 11) }; }
    const s = ri(2, 6), st = ri(3, 6); return { q: `${s}, ${s + st}, ${s + 2 * st}, ? (다음 수)`, ...mcOptions(s + 3 * st, 6) };
  }
  // level 4
  if (r < 0.35) { const a = ri(12, 29), b = ri(11, 19); return { q: `${a} × ${b} = ?`, ...mcOptions(a * b, 30) }; }
  if (r < 0.6) { const s = ri(1, 3); return { q: `${s}, ${s * 2}, ${s * 4}, ? (다음 수)`, ...mcOptions(s * 8, 6) }; }
  if (r < 0.8) { const a = ri(3, 9), b = ri(3, 9), c = ri(2, 9); return { q: `${a} × ${b} + ${c} = ?`, ...mcOptions(a * b + c, 12) }; }
  const t = ri(100, 200), p = ri(30, 90); return { q: `${t} - ${p} = ?`, ...mcOptions(t - p, 16) };
}

function genExam(level) {
  const count = [0, 2, 3, 4, 5][level];
  const qs = [], used = new Set();
  let guard = 0;
  while (qs.length < count && guard++ < 200) {
    const q = genQuestion(level);
    if (used.has(q.q)) continue;
    used.add(q.q); qs.push(q);
  }
  return qs;
}

let examCompany = null, examQs = [], examSel = [];

function openExam(c) {
  examCompany = c;
  examQs = genExam(c.examLvl);
  examSel = examQs.map(() => -1);
  $('#exam-title').textContent = c.name + ' 입사시험';
  const allow = c.examLvl >= 4 ? 1 : 0;
  $('#exam-sub').textContent = `난이도 ${stars(c.examLvl)} · ${allow ? '1개까지 틀려도 합격' : '모두 맞히면 합격'}`;
  renderExam();
  $('#exam-modal').classList.add('show');
}

function renderExam() {
  const body = $('#exam-body');
  body.innerHTML = '';
  examQs.forEach((q, qi) => {
    const wrap = document.createElement('div');
    wrap.className = 'exam-q';
    const prompt = document.createElement('div');
    prompt.className = 'eq-prompt';
    prompt.innerHTML = `<b>Q${qi + 1}.</b> ${q.q}`;
    const opts = document.createElement('div');
    opts.className = 'eq-opts';
    q.options.forEach((o, oi) => {
      const b = document.createElement('button');
      b.className = 'eq-opt' + (examSel[qi] === oi ? ' sel' : '');
      b.textContent = o;
      b.addEventListener('click', () => { examSel[qi] = oi; renderExam(); });
      opts.appendChild(b);
    });
    wrap.appendChild(prompt);
    wrap.appendChild(opts);
    body.appendChild(wrap);
  });
}

$('#exam-cancel').addEventListener('click', () => $('#exam-modal').classList.remove('show'));

$('#exam-submit').addEventListener('click', () => {
  if (examSel.some(s => s < 0)) { toast('모든 문제에 답하세요!', 'bad'); return; }
  let wrong = 0;
  examQs.forEach((q, i) => { if (examSel[i] !== q.answer) wrong++; });
  const allow = examCompany.examLvl >= 4 ? 1 : 0;
  if (wrong <= allow) {
    state.hired[examCompany.id] = true; save();
    snd.win();
    $('#exam-modal').classList.remove('show');
    toast(`🎉 ${examCompany.name} 합격! 출근하세요`, 'good');
    fx.confetti(70);
    renderJobList();
    showScreen('screen-work-' + examCompany.id);
    onEnterWork(examCompany.id);
  } else {
    snd.lose(); shake();
    toast(`불합격! ${wrong}문제 틀렸어요. 다시 도전!`, 'bad');
    examQs = genExam(examCompany.examLvl);
    examSel = examQs.map(() => -1);
    renderExam();
  }
});

/* ============================================================
   일터 1) 바리스타 — 커피 정량 따르기
   ============================================================ */
const baristaCv = $('#barista-canvas');
const baCtx = baristaCv.getContext('2d');
const BA_W = baristaCv.width, BA_H = baristaCv.height;
let bLevel = 0, bPouring = false, bLo = 0.5, bHi = 0.62, bLock = false;

function baristaNew() {
  bLevel = 0; bPouring = false; bLock = false;
  const center = rand(0.42, 0.82);
  const half = rand(0.05, 0.08);
  bLo = center - half; bHi = center + half;
  $('#barista-result').innerHTML = '&nbsp;';
  $('#barista-result').className = 'result-line';
}

function baristaEval() {
  if (bLock) return;
  bLock = true;
  const el = $('#barista-result');
  if (bLevel >= bLo && bLevel <= bHi) {
    addMoney(200);
    state.baristaCount = (state.baristaCount || 0) + 1;
    $('#barista-count').textContent = state.baristaCount;
    save();
    winFX(200, baristaCv);
    el.textContent = `☕ 완벽한 한 잔! +${fmt(200)}`;
    el.className = 'result-line win';
    setTimeout(baristaNew, 650);
  } else {
    loseFX();
    el.textContent = bLevel > bHi ? '넘쳤어요! 다시 따르세요' : '너무 적어요! 다시 따르세요';
    el.className = 'result-line lose';
    setTimeout(baristaNew, 850);
  }
}

function baristaUpdate() {
  if (bPouring && !bLock) {
    bLevel += 0.0095;
    if (bLevel >= 1) { bLevel = 1; bPouring = false; baristaEval(); }
  }
}

function baristaDraw() {
  const ctx = baCtx;
  ctx.clearRect(0, 0, BA_W, BA_H);
  const cupL = 78, cupR = 222, cupT = 56, cupB = 256;
  const cupH = cupB - cupT;
  // 목표 띠
  const yHi = cupB - cupH * bHi;
  const yLo = cupB - cupH * bLo;
  ctx.fillStyle = 'rgba(255,216,102,.18)';
  ctx.fillRect(cupL, yHi, cupR - cupL, yLo - yHi);
  ctx.strokeStyle = 'rgba(255,216,102,.85)';
  ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cupL, yHi); ctx.lineTo(cupR, yHi); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cupL, yLo); ctx.lineTo(cupR, yLo); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffd866'; ctx.font = '12px "Noto Sans KR"'; ctx.textAlign = 'left';
  ctx.fillText('골든 라인', cupR + 6, (yHi + yLo) / 2);

  // 커피
  const yCoffee = cupB - cupH * bLevel;
  if (bLevel > 0) {
    const cg = ctx.createLinearGradient(0, yCoffee, 0, cupB);
    cg.addColorStop(0, '#7b4a25'); cg.addColorStop(1, '#3d2412');
    ctx.fillStyle = cg;
    ctx.fillRect(cupL + 4, yCoffee, cupR - cupL - 8, cupB - yCoffee - 4);
    // 크레마
    ctx.fillStyle = 'rgba(210,170,120,.7)';
    ctx.fillRect(cupL + 4, yCoffee, cupR - cupL - 8, 4);
  }

  // 컵 외곽
  ctx.strokeStyle = '#e6e6f0'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cupL, cupT); ctx.lineTo(cupL + 6, cupB); ctx.lineTo(cupR - 6, cupB); ctx.lineTo(cupR, cupT);
  ctx.stroke();
  // 손잡이
  ctx.beginPath(); ctx.arc(cupR + 4, cupT + 56, 26, -1.1, 1.1); ctx.stroke();

  // 따르는 물줄기
  if (bPouring) {
    ctx.fillStyle = 'rgba(150,100,60,.85)';
    ctx.fillRect(BA_W / 2 - 3, 0, 6, yCoffee);
  }
  // 퍼센트
  ctx.fillStyle = '#e6e6f0'; ctx.font = '20px "Bebas Neue"'; ctx.textAlign = 'center';
  ctx.fillText(Math.round(bLevel * 100) + '%', BA_W / 2, cupB + 36);
}

(function bindBarista() {
  const down = () => { if (baristaCv.offsetParent && !bLock) bPouring = true; };
  const up = () => { if (bPouring) { bPouring = false; baristaEval(); } };
  const btn = $('#barista-btn');
  btn.addEventListener('mousedown', e => { e.preventDefault(); down(); });
  btn.addEventListener('touchstart', e => { e.preventDefault(); down(); });
  window.addEventListener('mouseup', up);
  window.addEventListener('touchend', up);
})();

function baristaLoop() {
  if (baristaCv.offsetParent) { baristaUpdate(); baristaDraw(); }
  requestAnimationFrame(baristaLoop);
}

/* ============================================================
   일터 2) 택배 분류 — 상자 클릭
   ============================================================ */
const courierCv = $('#courier-canvas');
const coCtx = courierCv.getContext('2d');
const CO_W = courierCv.width, CO_H = courierCv.height;
const CO_NEED = 8;
let coBox = null, coLoaded = 0, coTime = 0, coState = 'idle';

function courierStart() {
  coLoaded = 0; coTime = 13; coState = 'play';
  coSpawn();
  $('#courier-result').innerHTML = '&nbsp;';
  $('#courier-result').className = 'result-line';
}
function coSpawn() {
  coBox = { x: rand(40, CO_W - 40), y: rand(46, CO_H - 130), r: 26, pop: 0 };
}
function courierUpdate() {
  if (coState !== 'play') return;
  coTime -= 1 / 60;
  if (coBox && coBox.pop < 1) coBox.pop = Math.min(1, coBox.pop + 0.18);
  if (coTime <= 0) {
    coState = 'done';
    loseFX();
    const el = $('#courier-result');
    el.textContent = `시간 초과! ${coLoaded}/${CO_NEED}개 실음... 재시작`;
    el.className = 'result-line lose';
    setTimeout(() => { if (courierCv.offsetParent) courierStart(); }, 1100);
  }
}
function courierClick(e) {
  if (coState !== 'play' || !coBox) return;
  const { x, y } = canvasPos(courierCv, e);
  if (Math.hypot(x - coBox.x, y - coBox.y) <= coBox.r + 8) {
    coLoaded++;
    snd.tick();
    const r = courierCv.getBoundingClientRect();
    fx.sparkle(r.left + (coBox.x / CO_W) * r.width, r.top + (coBox.y / CO_H) * r.height, 4);
    if (coLoaded >= CO_NEED) {
      coState = 'done';
      addMoney(350);
      state.courierCount = (state.courierCount || 0) + 1;
      $('#courier-count').textContent = state.courierCount;
      save();
      winFX(350, courierCv);
      const el = $('#courier-result');
      el.textContent = `📦 배송 완료! +${fmt(350)}`;
      el.className = 'result-line win';
      coBox = null;
      setTimeout(() => { if (courierCv.offsetParent) courierStart(); }, 800);
    } else {
      coSpawn();
    }
  }
}
function courierDraw() {
  const ctx = coCtx;
  ctx.clearRect(0, 0, CO_W, CO_H);
  // 컨베이어 바닥
  ctx.fillStyle = '#1a1530';
  ctx.fillRect(0, CO_H - 70, CO_W, 70);
  for (let x = (performance.now() / 12) % 40 - 40; x < CO_W; x += 40) {
    ctx.fillStyle = 'rgba(255,216,102,.12)';
    ctx.fillRect(x, CO_H - 70, 20, 70);
  }
  // 트럭
  ctx.font = '40px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🚚', 40, CO_H - 22);

  // 상자
  if (coBox) {
    const s = 0.5 + coBox.pop * 0.5;
    ctx.save();
    ctx.translate(coBox.x, coBox.y);
    ctx.scale(s, s);
    ctx.font = '46px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('📦', 0, 0);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  // 진행바 + 카운트
  const barW = CO_W - 24;
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fillRect(12, 12, barW, 10);
  ctx.fillStyle = coTime < 4 ? '#ff5d7a' : '#5ef0a0';
  ctx.fillRect(12, 12, barW * Math.max(0, coTime / 13), 10);
  ctx.fillStyle = '#e6e6f0'; ctx.font = '18px "Bebas Neue"'; ctx.textAlign = 'right';
  ctx.fillText(`${coLoaded} / ${CO_NEED}`, CO_W - 14, 42);
}
courierCv.addEventListener('mousedown', courierClick);
courierCv.addEventListener('touchstart', e => { e.preventDefault(); courierClick(e); });
function courierLoop() {
  if (courierCv.offsetParent) { courierUpdate(); courierDraw(); }
  requestAnimationFrame(courierLoop);
}

/* ============================================================
   일터 3) IT 코딩 — 키보드 타이핑
   ============================================================ */
const SNIPPETS = [
  'const x = 42;', 'let sum = a + b;', 'return n * 2;', 'if (x > 0) {}',
  'arr.push(item);', 'for (i=0;i<n;i++)', 'x = y === z;', 'print("hello");',
  'data.map(f);', 'a && b || c;', 'while (run) {}', 'obj.key = val;',
];
const devCodeEl = $('#dev-code');
let devTarget = '', devPos = 0;

function devNew() {
  devTarget = SNIPPETS[ri(0, SNIPPETS.length - 1)];
  devPos = 0;
  $('#dev-result').innerHTML = '&nbsp;';
  $('#dev-result').className = 'result-line';
  renderDev();
}
function renderDev() {
  let html = '';
  for (let i = 0; i < devTarget.length; i++) {
    const ch = devTarget[i] === ' ' ? '&nbsp;' : devTarget[i].replace('<', '&lt;');
    const cls = i < devPos ? 'done' : i === devPos ? 'cur' : 'todo';
    html += `<span class="${cls}">${ch}</span>`;
  }
  devCodeEl.innerHTML = html;
}
function devType(ch) {
  if (devCodeEl.offsetParent == null) return;
  if (ch === devTarget[devPos]) {
    devPos++;
    snd.tick();
    renderDev();
    if (devPos >= devTarget.length) {
      addMoney(650);
      state.devCount = (state.devCount || 0) + 1;
      $('#dev-count').textContent = state.devCount;
      save();
      winFX(650, devCodeEl);
      const el = $('#dev-result');
      el.textContent = `💻 커밋 완료! +${fmt(650)}`;
      el.className = 'result-line win';
      setTimeout(devNew, 600);
    }
  } else {
    devCodeEl.classList.remove('err');
    void devCodeEl.offsetWidth;
    devCodeEl.classList.add('err');
  }
}
document.addEventListener('keydown', e => {
  if (devCodeEl.offsetParent == null) return;
  if (e.key.length === 1) { devType(e.key); e.preventDefault(); }
});
devCodeEl.addEventListener('click', () => { if (devPos < devTarget.length) devType(devTarget[devPos]); });

/* ============================================================
   일터 4) 의사 — 정밀 진료 (움직이는 환부 클릭)
   ============================================================ */
const doctorCv = $('#doctor-canvas');
const docCtx = doctorCv.getContext('2d');
const DOC_W = doctorCv.width, DOC_H = doctorCv.height;
const DOC_NEED = 5;
let docTarget = null, docHits = 0, docTime = 0, docState = 'idle';

function doctorStart() {
  docHits = 0; docTime = 11; docState = 'play';
  docNewTarget();
  $('#doctor-result').innerHTML = '&nbsp;';
  $('#doctor-result').className = 'result-line';
}
function docNewTarget() {
  const r = 24 - docHits * 1.8;
  docTarget = {
    x: rand(40, DOC_W - 40), y: rand(50, DOC_H - 50),
    r: Math.max(15, r),
    vx: rand(-1, 1) * (1.2 + docHits * 0.4),
    vy: rand(-1, 1) * (1.2 + docHits * 0.4),
  };
}
function doctorUpdate() {
  if (docState !== 'play') return;
  docTime -= 1 / 60;
  if (docTarget) {
    docTarget.x += docTarget.vx;
    docTarget.y += docTarget.vy;
    if (docTarget.x < docTarget.r || docTarget.x > DOC_W - docTarget.r) docTarget.vx *= -1;
    if (docTarget.y < docTarget.r || docTarget.y > DOC_H - docTarget.r) docTarget.vy *= -1;
  }
  if (docTime <= 0) {
    docState = 'done';
    loseFX();
    const el = $('#doctor-result');
    el.textContent = `시간 초과! ${docHits}/${DOC_NEED} 진료... 재시작`;
    el.className = 'result-line lose';
    setTimeout(() => { if (doctorCv.offsetParent) doctorStart(); }, 1100);
  }
}
function doctorClick(e) {
  if (docState !== 'play' || !docTarget) return;
  const { x, y } = canvasPos(doctorCv, e);
  if (Math.hypot(x - docTarget.x, y - docTarget.y) <= docTarget.r) {
    docHits++;
    snd.coin();
    const r = doctorCv.getBoundingClientRect();
    fx.sparkle(r.left + (docTarget.x / DOC_W) * r.width, r.top + (docTarget.y / DOC_H) * r.height, 5);
    if (docHits >= DOC_NEED) {
      docState = 'done';
      addMoney(1300);
      state.doctorCount = (state.doctorCount || 0) + 1;
      $('#doctor-count').textContent = state.doctorCount;
      save();
      winFX(1300, doctorCv);
      const el = $('#doctor-result');
      el.textContent = `🩺 진료 완료! +${fmt(1300)}`;
      el.className = 'result-line win';
      docTarget = null;
      setTimeout(() => { if (doctorCv.offsetParent) doctorStart(); }, 850);
    } else {
      docNewTarget();
    }
  } else {
    // 빗맞음 — 시간 페널티
    docTime = Math.max(0, docTime - 0.6);
    snd.tick();
  }
}
function doctorDraw() {
  const ctx = docCtx;
  ctx.clearRect(0, 0, DOC_W, DOC_H);
  // 격자 배경
  ctx.strokeStyle = 'rgba(90,208,230,.06)'; ctx.lineWidth = 1;
  for (let x = 0; x < DOC_W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, DOC_H); ctx.stroke(); }
  for (let y = 0; y < DOC_H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(DOC_W, y); ctx.stroke(); }

  // 환부 (조준점)
  if (docTarget) {
    const t = docTarget;
    ctx.strokeStyle = '#ff5d7a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 6.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.5, 0, 6.3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,93,122,.25)';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 6.3); ctx.fill();
    // 십자선
    ctx.beginPath();
    ctx.moveTo(t.x - t.r - 6, t.y); ctx.lineTo(t.x + t.r + 6, t.y);
    ctx.moveTo(t.x, t.y - t.r - 6); ctx.lineTo(t.x, t.y + t.r + 6);
    ctx.stroke();
  }

  // 진행바 + 카운트
  const barW = DOC_W - 24;
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(12, 12, barW, 10);
  ctx.fillStyle = docTime < 3.5 ? '#ff5d7a' : '#5ad0e6';
  ctx.fillRect(12, 12, barW * Math.max(0, docTime / 11), 10);
  ctx.fillStyle = '#e6e6f0'; ctx.font = '18px "Bebas Neue"'; ctx.textAlign = 'right';
  ctx.fillText(`${docHits} / ${DOC_NEED}`, DOC_W - 14, 42);
}
doctorCv.addEventListener('mousedown', doctorClick);
doctorCv.addEventListener('touchstart', e => { e.preventDefault(); doctorClick(e); });
function doctorLoop() {
  if (doctorCv.offsetParent) { doctorUpdate(); doctorDraw(); }
  requestAnimationFrame(doctorLoop);
}

/* ============================================================
   범용 아케이드 일터 엔진 (신문/편의점/셰프/파일럿/CEO)
   type: tap | mash | timing | sequence
   ============================================================ */
const arcadeJobs = {};
function createArcadeJob(id, cfg) {
  const cv = document.getElementById(id + '-canvas');
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const resultEl = document.getElementById(id + '-result');
  const countEl = document.getElementById(id + '-count');
  const S = { phase: 'idle' };

  function setResult(txt, cls) { resultEl.innerHTML = txt; resultEl.className = 'result-line' + (cls ? ' ' + cls : ''); }
  function win(msg) {
    S.phase = 'done';
    addMoney(cfg.pay);
    state[id + 'Count'] = (state[id + 'Count'] || 0) + 1;
    if (countEl) countEl.textContent = state[id + 'Count'];
    save();
    winFX(cfg.pay, cv);
    setResult(msg, 'win');
    setTimeout(() => { if (cv.offsetParent) start(); }, 760);
  }
  function fail(msg) {
    S.phase = 'done'; loseFX(); setResult(msg, 'lose');
    setTimeout(() => { if (cv.offsetParent) start(); }, 950);
  }

  function newZone() {
    const half = cfg.zoneHalf;
    const c = rand(half + 0.06, 0.94 - half);
    return { lo: c - half, hi: c + half };
  }
  function spawnTap() { S.target = { x: rand(40, W - 40), y: rand(56, H - 56), pop: 0 }; }
  function startSeq() {
    S.seq = Array.from({ length: cfg.len }, () => Math.floor(rand(0, 4)));
    S.inputStep = 0; S.showMode = true; S.flash = -1; S.flashT = 0; S.showIdx = 0; S.showTimer = 28;
  }
  function seqTileAt(x, y) {
    const pad = 34, gap = 16;
    const tw = (W - pad * 2 - gap) / 2, th = (H - pad * 2 - gap) / 2;
    for (let i = 0; i < 4; i++) {
      const tx = pad + (i % 2) * (tw + gap), ty = pad + Math.floor(i / 2) * (th + gap);
      if (x >= tx && x <= tx + tw && y >= ty && y <= ty + th) return i;
    }
    return -1;
  }

  function start() {
    S.phase = 'play';
    setResult('&nbsp;', '');
    if (cfg.type === 'tap') { S.hits = 0; S.time = cfg.time; spawnTap(); }
    else if (cfg.type === 'mash') { S.fill = 0; S.time = cfg.time; }
    else if (cfg.type === 'timing') { S.hits = 0; S.pos = 0; S.dir = 1; S.speed = cfg.speed; S.zone = newZone(); }
    else if (cfg.type === 'sequence') startSeq();
  }

  function update() {
    if (S.phase !== 'play') return;
    if (cfg.type === 'tap') {
      if (S.target && S.target.pop < 1) S.target.pop = Math.min(1, S.target.pop + 0.18);
      S.time -= 1 / 60;
      if (S.time <= 0) fail(`시간 초과! ${S.hits}/${cfg.need}`);
    } else if (cfg.type === 'mash') {
      S.fill = Math.max(0, S.fill - 0.2);
      S.time -= 1 / 60;
      if (S.fill >= 100) win('스캔 완료! 다음 손님 +' + fmt(cfg.pay));
      else if (S.time <= 0) fail(`시간 초과! (${Math.floor(S.fill)}%)`);
    } else if (cfg.type === 'timing') {
      S.pos += S.speed / 100 * S.dir;
      if (S.pos >= 1) { S.pos = 1; S.dir = -1; }
      if (S.pos <= 0) { S.pos = 0; S.dir = 1; }
    } else if (cfg.type === 'sequence') {
      if (S.showMode) {
        if (S.flashT > 0) { S.flashT--; if (S.flashT === 0) S.flash = -1; }
        else {
          S.showTimer--;
          if (S.showTimer <= 0) {
            if (S.showIdx < S.seq.length) { S.flash = S.seq[S.showIdx]; S.flashT = 22; S.showIdx++; S.showTimer = 14; }
            else S.showMode = false;
          }
        }
      } else if (S.flashT > 0) { S.flashT--; if (S.flashT === 0) S.flash = -1; }
    }
  }

  function pointer(e) {
    if (S.phase !== 'play') return;
    const { x, y } = canvasPos(cv, e);
    if (cfg.type === 'tap') {
      if (S.target && Math.hypot(x - S.target.x, y - S.target.y) <= 30) {
        S.hits++; snd.tick();
        const r = cv.getBoundingClientRect();
        fx.sparkle(r.left + (S.target.x / W) * r.width, r.top + (S.target.y / H) * r.height, 4);
        if (S.hits >= cfg.need) win('구역 완료! +' + fmt(cfg.pay)); else spawnTap();
      }
    } else if (cfg.type === 'mash') {
      S.fill = Math.min(100, S.fill + 7); snd.tick();
    } else if (cfg.type === 'timing') {
      if (S.pos >= S.zone.lo && S.pos <= S.zone.hi) {
        S.hits++; snd.coin();
        if (S.hits >= cfg.need) win('완벽해요! +' + fmt(cfg.pay));
        else { S.zone = newZone(); S.speed += 0.5; }
      } else fail('빗나갔어요! 다시');
    } else if (cfg.type === 'sequence') {
      if (S.showMode) return;
      const tile = seqTileAt(x, y);
      if (tile < 0) return;
      S.flash = tile; S.flashT = 10;
      if (tile === S.seq[S.inputStep]) {
        snd.tick(); S.inputStep++;
        if (S.inputStep >= S.seq.length) win('결재 완료! +' + fmt(cfg.pay));
      } else fail('순서가 틀렸어요!');
    }
  }

  function bg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#15112a'); g.addColorStop(1, '#0c0a18');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function timeBar(frac, warn) {
    const barW = W - 24;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(12, 12, barW, 10);
    ctx.fillStyle = warn ? '#ff5d7a' : '#5ef0a0';
    ctx.fillRect(12, 12, barW * Math.max(0, frac), 10);
  }
  function counter(txt) {
    ctx.fillStyle = '#e6e6f0'; ctx.font = '18px "Bebas Neue"'; ctx.textAlign = 'right';
    ctx.fillText(txt, W - 14, 42);
  }

  function draw() {
    bg();
    if (cfg.type === 'tap') {
      ctx.font = '34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🏠🏠🏠🏠', W / 2, H - 36);
      if (S.target) {
        const s = 0.5 + S.target.pop * 0.5;
        ctx.save(); ctx.translate(S.target.x, S.target.y); ctx.scale(s, s);
        ctx.font = '46px sans-serif'; ctx.fillText(cfg.emoji, 0, 0); ctx.restore();
      }
      ctx.textBaseline = 'alphabetic';
      timeBar(S.time / cfg.time, S.time < 4);
      counter(`${S.hits || 0} / ${cfg.need}`);
    } else if (cfg.type === 'mash') {
      // 바코드
      ctx.fillStyle = '#e6e6f0';
      for (let x = 50, i = 0; x < W - 50; i++) { const w = (i % 3) + 1; ctx.fillRect(x, 60, w, 56); x += w + 3; }
      // 게이지
      const gx = 50, gw = W - 100, gy = H / 2 + 30, gh = 30;
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(gx, gy, gw, gh);
      const fg = ctx.createLinearGradient(gx, 0, gx + gw, 0);
      fg.addColorStop(0, '#5ad0e6'); fg.addColorStop(1, '#5ef0a0');
      ctx.fillStyle = fg; ctx.fillRect(gx, gy, gw * S.fill / 100, gh);
      ctx.fillStyle = '#fff'; ctx.font = '20px "Bebas Neue"'; ctx.textAlign = 'center';
      ctx.fillText(Math.floor(S.fill) + '%', W / 2, gy + gh + 30);
      ctx.fillStyle = '#ffd866';
      ctx.font = '700 22px "Noto Sans KR"';
      ctx.fillText(S.phase === 'play' ? '연타! 연타!' : '', W / 2, gy - 26);
      timeBar(S.time / cfg.time, S.time < 2);
    } else if (cfg.type === 'timing') {
      const barX = 30, barW = W - 60, barY = H / 2 + 20, barH = 34;
      // 트랙
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(barX, barY, barW, barH);
      // 존
      if (S.zone) {
        ctx.fillStyle = 'rgba(255,216,102,.35)';
        ctx.fillRect(barX + barW * S.zone.lo, barY, barW * (S.zone.hi - S.zone.lo), barH);
        ctx.strokeStyle = '#ffd866'; ctx.lineWidth = 2;
        ctx.strokeRect(barX + barW * S.zone.lo, barY, barW * (S.zone.hi - S.zone.lo), barH);
      }
      // 마커
      const mx = barX + barW * (S.pos || 0);
      ctx.fillStyle = cfg.themeColor || '#fff';
      ctx.fillRect(mx - 3, barY - 8, 6, barH + 16);
      // 테마 이모지
      ctx.font = '54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(cfg.emoji, mx, barY - 50);
      ctx.textBaseline = 'alphabetic';
      counter(`${S.hits || 0} / ${cfg.need}`);
    } else if (cfg.type === 'sequence') {
      const pad = 34, gap = 16;
      const tw = (W - pad * 2 - gap) / 2, th = (H - pad * 2 - gap) / 2;
      const cols = ['#ff5d7a', '#5ad0e6', '#5ef0a0', '#ffd866'];
      for (let i = 0; i < 4; i++) {
        const tx = pad + (i % 2) * (tw + gap), ty = pad + Math.floor(i / 2) * (th + gap);
        const on = S.flash === i;
        ctx.fillStyle = on ? cols[i] : 'rgba(255,255,255,.06)';
        ctx.fillRect(tx, ty, tw, th);
        ctx.strokeStyle = on ? '#fff' : cols[i]; ctx.lineWidth = on ? 4 : 2;
        ctx.strokeRect(tx, ty, tw, th);
        ctx.fillStyle = on ? '#14141f' : cols[i];
        ctx.font = '40px "Bebas Neue"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(i + 1, tx + tw / 2, ty + th / 2);
      }
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#ffd866'; ctx.font = '700 18px "Noto Sans KR"'; ctx.textAlign = 'center';
      ctx.fillText(S.phase !== 'play' ? '' : S.showMode ? '👀 순서를 기억하세요...' : '✍️ 순서대로 클릭!', W / 2, 30);
    }
  }

  cv.addEventListener('mousedown', pointer);
  cv.addEventListener('touchstart', e => { e.preventDefault(); pointer(e); });
  (function loop() {
    if (cv.offsetParent) { update(); draw(); }
    requestAnimationFrame(loop);
  })();
  return { start };
}

arcadeJobs.paperboy = createArcadeJob('paperboy', { type: 'tap', emoji: '📬', need: 10, time: 12, pay: 90 });
arcadeJobs.store = createArcadeJob('store', { type: 'mash', pay: 180, time: 6 });
arcadeJobs.chef = createArcadeJob('chef', { type: 'timing', need: 3, zoneHalf: 0.10, speed: 2.0, pay: 480, emoji: '🍳', themeColor: '#ff9d3c' });
arcadeJobs.pilot = createArcadeJob('pilot', { type: 'timing', need: 1, zoneHalf: 0.05, speed: 1.5, pay: 950, emoji: '✈️', themeColor: '#5ad0e6' });
arcadeJobs.ceo = createArcadeJob('ceo', { type: 'sequence', len: 4, pay: 1800 });

/* ============================================================
   카지노 1) 블랙잭
   ============================================================ */
const getBjBet = initBetBox($('#bj-bet'));
const BJ_SUITS = ['♠', '♥', '♦', '♣'];
const BJ_RANKS = [['A', 11], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7], ['8', 8], ['9', 9], ['10', 10], ['J', 10], ['Q', 10], ['K', 10]];
let bjBet = 0, bjPlayer = [], bjDealer = [], bjState = 'idle';

function bjCard() {
  const [r, v] = BJ_RANKS[ri(0, 12)];
  const s = BJ_SUITS[ri(0, 3)];
  return { r, v, s, red: s === '♥' || s === '♦' };
}
function bjValue(cards) {
  let sum = 0, aces = 0;
  for (const c of cards) { sum += c.v; if (c.r === 'A') aces++; }
  while (sum > 21 && aces) { sum -= 10; aces--; }
  return sum;
}
function bjRenderHand(el, cards, hideSecond) {
  el.innerHTML = '';
  cards.forEach((c, i) => {
    const d = document.createElement('div');
    if (hideSecond && i === 1) { d.className = 'pcard back'; d.textContent = '?'; }
    else { d.className = 'pcard' + (c.red ? ' red' : ''); d.textContent = c.r + c.s; }
    el.appendChild(d);
  });
}
function bjRender(hideDealer) {
  bjRenderHand($('#bj-player'), bjPlayer, false);
  bjRenderHand($('#bj-dealer'), bjDealer, hideDealer);
  $('#bj-player-score').textContent = bjValue(bjPlayer);
  $('#bj-dealer-score').textContent = hideDealer ? '?' : bjValue(bjDealer);
}
function bjButtons(on) { $('#bj-hit').disabled = !on; $('#bj-stand').disabled = !on; $('#bj-deal').disabled = on; }

$('#bj-deal').addEventListener('click', () => {
  if (bjState === 'play') return;
  const bet = getBjBet();
  if (!spend(bet)) return;
  bjBet = bet;
  bjPlayer = [bjCard(), bjCard()];
  bjDealer = [bjCard(), bjCard()];
  bjState = 'play';
  bjRender(true);
  bjButtons(true);
  $('#bj-result').textContent = 'HIT 또는 STAND를 선택하세요';
  $('#bj-result').className = 'result-line';
  if (bjValue(bjPlayer) === 21) bjStand();
});
$('#bj-hit').addEventListener('click', () => {
  if (bjState !== 'play') return;
  bjPlayer.push(bjCard());
  bjRender(true);
  snd.tick();
  const v = bjValue(bjPlayer);
  if (v > 21) bjResolve();
  else if (v === 21) bjStand();
});
$('#bj-stand').addEventListener('click', bjStand);
function bjStand() {
  if (bjState !== 'play') return;
  while (bjValue(bjDealer) < 17) bjDealer.push(bjCard());
  bjResolve();
}
function bjResolve() {
  bjState = 'done';
  bjButtons(false);
  bjRender(false);
  const p = bjValue(bjPlayer), d = bjValue(bjDealer);
  const pBJ = bjPlayer.length === 2 && p === 21;
  const dBJ = bjDealer.length === 2 && d === 21;
  const el = $('#bj-result');
  let payout = 0, msg;
  if (p > 21) { msg = `버스트! ${p} -${fmt(bjBet)}`; }
  else if (pBJ && !dBJ) { payout = Math.floor(bjBet * 2.5); msg = `블랙잭!! +${fmt(payout - bjBet)}`; }
  else if (dBJ && !pBJ) { msg = `딜러 블랙잭... -${fmt(bjBet)}`; }
  else if (d > 21 || p > d) { payout = bjBet * 2; msg = `승리! ${p} vs ${d} +${fmt(bjBet)}`; }
  else if (p < d) { msg = `패배 ${p} vs ${d} -${fmt(bjBet)}`; }
  else { payout = bjBet; msg = `무승부 ${p} vs ${d} (환불)`; }
  if (payout > 0) {
    addMoney(payout);
    if (payout > bjBet) winFX(payout, $('#bj-player'));
    el.className = 'result-line win';
  } else { loseFX(); el.className = 'result-line lose'; }
  el.textContent = msg;
}

/* ============================================================
   카지노 2) 가위바위보
   ============================================================ */
const getRpsBet = initBetBox($('#rps-bet'));
const RPS_EMO = ['✊', '✋', '✌'];
let rpsBusy = false;
document.querySelectorAll('.rps-btn').forEach(b => {
  b.addEventListener('click', () => {
    if (rpsBusy) return;
    const pick = parseInt(b.dataset.rps);
    const bet = getRpsBet();
    if (!spend(bet)) return;
    rpsBusy = true;
    const me = $('#rps-me'), cpu = $('#rps-cpu'), el = $('#rps-result');
    me.className = 'rps-hand shake'; cpu.className = 'rps-hand shake';
    me.textContent = '✊'; cpu.textContent = '✊';
    el.textContent = '가위... 바위... 보!'; el.className = 'result-line';
    setTimeout(() => {
      const c = ri(0, 2);
      me.textContent = RPS_EMO[pick]; cpu.textContent = RPS_EMO[c];
      me.className = 'rps-hand'; cpu.className = 'rps-hand';
      let outcome;
      if (pick === c) outcome = 'tie';
      else if ((pick + 2) % 3 === c) outcome = 'win';
      else outcome = 'lose';
      if (outcome === 'win') {
        const payout = Math.floor(bet * 1.9);
        addMoney(payout);
        me.classList.add('win-h'); cpu.classList.add('lose-h');
        winFX(payout, me);
        el.textContent = `승리! +${fmt(payout - bet)}`; el.className = 'result-line win';
      } else if (outcome === 'tie') {
        addMoney(bet);
        el.textContent = '비겼어요! (환불)'; el.className = 'result-line';
        snd.coin();
      } else {
        cpu.classList.add('win-h'); me.classList.add('lose-h');
        loseFX();
        el.textContent = `패배... -${fmt(bet)}`; el.className = 'result-line lose';
      }
      rpsBusy = false;
    }, 850);
  });
});

/* ============================================================
   카지노 3) 사다리타기 (아미다쿠지)
   ============================================================ */
const ladderCv = $('#ladder-canvas');
const ladCtx = ladderCv.getContext('2d');
const LAD_W = ladderCv.width, LAD_H = ladderCv.height;
const LAD_COLS = 4, LAD_LEVELS = 9;
const getLadderBet = initBetBox($('#ladder-bet'));
let ladRungs = [], ladSlots = [], ladWaypoints = [], ladT = 0, ladPlaying = false, ladBet = 0, ladDoneSlot = -1;

const ladColX = c => 40 + c * ((LAD_W - 80) / (LAD_COLS - 1));
const ladTopY = 56, ladBotY = LAD_H - 64;
const ladLevelY = l => ladTopY + (l + 1) / (LAD_LEVELS + 1) * (ladBotY - ladTopY);

function ladGen() {
  ladRungs = [];
  for (let l = 0; l < LAD_LEVELS; l++) {
    const row = [];
    for (let c = 0; c < LAD_COLS - 1; c++) {
      if (Math.random() < 0.42 && !row.includes(c - 1)) row.push(c);
    }
    ladRungs.push(row);
  }
  ladSlots = shuffle([0, 0, 1.8, 2.0]);
  ladDoneSlot = -1;
  ladPlaying = false;
}
function ladStart(startCol) {
  if (ladPlaying) return;
  const bet = getLadderBet();
  if (!spend(bet)) return;
  ladBet = bet;
  ladGen();
  // 경로 추적 + 웨이포인트
  let c = startCol;
  ladWaypoints = [{ x: ladColX(c), y: ladTopY }];
  for (let l = 0; l < LAD_LEVELS; l++) {
    ladWaypoints.push({ x: ladColX(c), y: ladLevelY(l) });
    if (ladRungs[l].includes(c - 1)) { c--; ladWaypoints.push({ x: ladColX(c), y: ladLevelY(l) }); }
    else if (ladRungs[l].includes(c)) { c++; ladWaypoints.push({ x: ladColX(c), y: ladLevelY(l) }); }
  }
  ladWaypoints.push({ x: ladColX(c), y: ladBotY });
  ladDoneSlot = c;
  ladT = 0;
  ladPlaying = true;
  document.querySelectorAll('.ladder-start').forEach(b => b.disabled = true);
  $('#ladder-result').textContent = '사다리를 타는 중...';
  $('#ladder-result').className = 'result-line';
}
function ladFinish() {
  ladPlaying = false;
  document.querySelectorAll('.ladder-start').forEach(b => b.disabled = false);
  const mult = ladSlots[ladDoneSlot];
  const el = $('#ladder-result');
  if (mult > 0) {
    const payout = Math.floor(ladBet * mult);
    addMoney(payout);
    winFX(payout, ladderCv);
    el.textContent = `×${mult} 도착! +${fmt(payout)}`;
    el.className = 'result-line win';
  } else {
    loseFX();
    el.textContent = `꽝 칸 도착... -${fmt(ladBet)}`;
    el.className = 'result-line lose';
  }
}
function ladderDraw() {
  const ctx = ladCtx;
  ctx.clearRect(0, 0, LAD_W, LAD_H);
  ctx.fillStyle = '#0e0b16'; ctx.fillRect(0, 0, LAD_W, LAD_H);
  // 세로줄
  ctx.strokeStyle = 'rgba(255,216,102,.5)'; ctx.lineWidth = 3;
  for (let c = 0; c < LAD_COLS; c++) {
    ctx.beginPath(); ctx.moveTo(ladColX(c), ladTopY); ctx.lineTo(ladColX(c), ladBotY); ctx.stroke();
  }
  // 가로 rung
  ctx.strokeStyle = 'rgba(120,220,232,.7)'; ctx.lineWidth = 3;
  ladRungs.forEach((row, l) => {
    row.forEach(c => {
      ctx.beginPath(); ctx.moveTo(ladColX(c), ladLevelY(l)); ctx.lineTo(ladColX(c + 1), ladLevelY(l)); ctx.stroke();
    });
  });
  // 시작 라벨
  ctx.font = '18px "Bebas Neue"'; ctx.textAlign = 'center'; ctx.fillStyle = '#e6e6f0';
  ['A', 'B', 'C', 'D'].forEach((s, c) => ctx.fillText(s, ladColX(c), ladTopY - 16));
  // 슬롯
  ladSlots.forEach((m, c) => {
    const x = ladColX(c);
    ctx.fillStyle = m >= 2 ? '#ffd866' : m > 0 ? '#5ad0e6' : 'rgba(255,93,122,.6)';
    ctx.font = '18px "Bebas Neue"'; ctx.textAlign = 'center';
    ctx.fillText(m > 0 ? '×' + m : '꽝', x, ladBotY + 26);
  });
  // 공
  if (ladPlaying && ladWaypoints.length > 1) {
    // 총 길이
    let total = 0; const segs = [];
    for (let i = 1; i < ladWaypoints.length; i++) {
      const dx = ladWaypoints[i].x - ladWaypoints[i - 1].x, dy = ladWaypoints[i].y - ladWaypoints[i - 1].y;
      const len = Math.hypot(dx, dy); segs.push(len); total += len;
    }
    ladT += 7;
    let dist = ladT, idx = 0;
    while (idx < segs.length && dist > segs[idx]) { dist -= segs[idx]; idx++; }
    let bx, by;
    if (idx >= segs.length) { bx = ladWaypoints[ladWaypoints.length - 1].x; by = ladWaypoints[ladWaypoints.length - 1].y; ladFinish(); }
    else {
      const a = ladWaypoints[idx], b = ladWaypoints[idx + 1], f = dist / segs[idx];
      bx = a.x + (b.x - a.x) * f; by = a.y + (b.y - a.y) * f;
    }
    ctx.fillStyle = '#ffd866'; ctx.shadowColor = 'rgba(255,216,102,.9)'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(bx, by, 8, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0;
  }
}
document.querySelectorAll('.ladder-start').forEach(b => {
  b.addEventListener('click', () => ladStart(parseInt(b.dataset.col)));
});
function ladderLoop() {
  if (ladderCv.offsetParent) ladderDraw();
  requestAnimationFrame(ladderLoop);
}

/* ============================================================
   카지노 4) 경마
   ============================================================ */
const horseCv = $('#horse-canvas');
const hoCtx = horseCv.getContext('2d');
const HO_W = horseCv.width, HO_H = horseCv.height;
const HO_N = 4;
const HO_COLORS = ['#ff5d7a', '#5ad0e6', '#5ef0a0', '#ffd866'];
const getHorseBet = initBetBox($('#horse-bet'));
let horsePick = -1, horseX = [], horseRacing = false, horseWinner = -1;
const HO_FINISH = HO_W - 46;

document.querySelectorAll('.horse-btn').forEach(b => {
  b.addEventListener('click', () => {
    if (horseRacing) return;
    document.querySelectorAll('.horse-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    horsePick = parseInt(b.dataset.horse);
    $('#horse-result').textContent = `${horsePick + 1}번 말에 베팅!`;
    $('#horse-result').className = 'result-line';
  });
});
$('#horse-start').addEventListener('click', () => {
  if (horseRacing) return;
  if (horsePick < 0) { toast('먼저 말을 고르세요!', 'bad'); return; }
  const bet = getHorseBet();
  if (!spend(bet)) return;
  horseBet = bet;
  horseX = [40, 40, 40, 40];
  horseWinner = -1;
  horseRacing = true;
  $('#horse-start').disabled = true;
  $('#horse-result').textContent = '두구두구... 🏇';
  $('#horse-result').className = 'result-line';
});
let horseBet = 0;
function horseUpdate() {
  if (!horseRacing) return;
  for (let i = 0; i < HO_N; i++) {
    horseX[i] += rand(0.6, 3.4);
    if (horseX[i] >= HO_FINISH && horseWinner < 0) horseWinner = i;
  }
  if (horseWinner >= 0) {
    horseRacing = false;
    $('#horse-start').disabled = false;
    const el = $('#horse-result');
    if (horseWinner === horsePick) {
      const payout = Math.floor(horseBet * 3.8);
      addMoney(payout);
      winFX(payout, horseCv);
      el.textContent = `🏆 ${horseWinner + 1}번 우승! +${fmt(payout)}`;
      el.className = 'result-line win';
    } else {
      loseFX();
      el.textContent = `${horseWinner + 1}번 우승... ${horsePick + 1}번 베팅 -${fmt(horseBet)}`;
      el.className = 'result-line lose';
    }
  }
}
function horseDraw() {
  const ctx = hoCtx;
  ctx.clearRect(0, 0, HO_W, HO_H);
  ctx.fillStyle = '#0e0b16'; ctx.fillRect(0, 0, HO_W, HO_H);
  const laneH = HO_H / HO_N;
  // 결승선
  ctx.fillStyle = '#fff';
  for (let y = 0; y < HO_H; y += 12) { ctx.fillStyle = (y / 12) % 2 ? '#fff' : '#333'; ctx.fillRect(HO_FINISH, y, 8, 12); }
  for (let i = 0; i < HO_N; i++) {
    const y = i * laneH + laneH / 2;
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.moveTo(0, i * laneH); ctx.lineTo(HO_W, i * laneH); ctx.stroke();
    // 말
    ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🐎', horseX[i], y);
    // 번호 배지
    ctx.fillStyle = HO_COLORS[i];
    ctx.beginPath(); ctx.arc(20, y, 12, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#14141f'; ctx.font = '14px "Bebas Neue"';
    ctx.fillText(i + 1, 20, y + 1);
  }
  ctx.textBaseline = 'alphabetic';
}
function horseLoop() {
  if (horseCv.offsetParent) { horseUpdate(); horseDraw(); }
  requestAnimationFrame(horseLoop);
}

/* ============================================================
   실시간 부자 랭킹 (Supabase 공용 DB)
   값은 배포 직전 채워집니다. 비어 있으면 로컬(내 점수만) 표시.
   ============================================================ */
const SB_URL = 'https://jidkoudikbyaqwmkicum.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZGtvdWRpa2J5YXF3bWtpY3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDk4MDksImV4cCI6MjA5NjQ4NTgwOX0.sZ0HPhtuviwtL95DlTYqwugKq6w6c4m9YdcaqrKSsMw';
const sbEnabled = () => /^https:\/\/.+\.supabase\.co/.test(SB_URL);

let lbCache = [];        // [{client_id, name, money}]
let lastMyRank = 999;
let pushTimer = 0, lastPushAt = 0;

const myClientId = (() => {
  let id = localStorage.getItem('wonrush-cid');
  if (!id) { id = 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem('wonrush-cid', id); }
  return id;
})();
let myNick = state.nick || ('플레이어' + Math.floor(Math.random() * 9000 + 1000));

function escHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function fmtShort(n) {
  n = Math.floor(n);
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '억';
  if (n >= 1e4) return Math.floor(n / 1e4).toLocaleString('ko-KR') + '만';
  return '₩' + n.toLocaleString('ko-KR');
}
function sbHeaders() { return { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }; }

async function lbFetch() {
  if (!sbEnabled()) return;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/leaderboard?select=client_id,name,money&order=money.desc&limit=100`, { headers: sbHeaders() });
    if (!r.ok) return;
    lbCache = await r.json();
    updateRank(true);
    if ($('#screen-ranking').classList.contains('active')) renderRanking();
  } catch (e) { /* 오프라인 무시 */ }
}
async function lbPush() {
  if (!sbEnabled()) return;
  lastPushAt = Date.now();
  try {
    await fetch(`${SB_URL}/rest/v1/leaderboard?on_conflict=client_id`, {
      method: 'POST',
      headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ client_id: myClientId, name: myNick.slice(0, 12), money: Math.floor(netWorth()) }),
    });
  } catch (e) { /* 무시 */ }
}
function schedulePush() {
  if (!sbEnabled()) return;
  clearTimeout(pushTimer);
  const wait = Math.max(200, 3500 - (Date.now() - lastPushAt));
  pushTimer = setTimeout(lbPush, wait);
}

function myBoard() {
  const arr = lbCache.filter(r => r.client_id !== myClientId)
    .map(r => ({ name: r.name, money: r.money, me: false }));
  arr.push({ name: myNick, money: Math.floor(netWorth()), me: true });
  arr.sort((a, b) => b.money - a.money);
  return arr;
}
function updateRank(fromFetch) {
  if (!fromFetch) schedulePush();
  const b = myBoard();
  const rank = b.findIndex(x => x.me) + 1;
  $('#rank-num').textContent = '#' + rank;
  $('#home-rank-num').textContent = rank;
  if (rank < lastMyRank && lastMyRank !== 999) {
    const badge = $('#rank-badge');
    badge.classList.remove('up'); void badge.offsetWidth; badge.classList.add('up');
    if (rank === 1) toast('👑 전 세계 1위 등극!!', 'good');
    else if (rank <= 3 && lastMyRank > 3) toast(`🏆 TOP 3 진입! ${rank}위`, 'good');
    else if (rank <= 10 && lastMyRank > 10) toast(`🏆 TOP 10 진입! ${rank}위`, 'good');
  }
  lastMyRank = rank;
}
function renderRanking() {
  const nick = $('#rank-nick');
  if (document.activeElement !== nick) nick.value = myNick;
  const status = $('#rank-status');
  if (sbEnabled()) { status.textContent = `🟢 LIVE · 등록 ${lbCache.length}명`; status.className = 'rank-status live'; }
  else { status.textContent = '⚪ 랭킹 서버 준비 중'; status.className = 'rank-status'; }
  const b = myBoard();
  const list = $('#rank-list');
  const medals = ['🥇', '🥈', '🥉'];
  const myIdx = b.findIndex(x => x.me);
  const showTop = 12;
  let html = '';
  b.slice(0, showTop).forEach((p, i) => {
    const pos = i < 3 ? medals[i] : (i + 1);
    html += `<div class="rank-row ${p.me ? 'me' : ''} top${i + 1}">
      <span class="rank-pos">${pos}</span>
      <span class="rank-name">${escHtml(p.name)}${p.me ? ' (나)' : ''}</span>
      <span class="rank-money">${fmtShort(p.money)}</span></div>`;
  });
  if (myIdx >= showTop) {
    html += `<div class="rank-sep">···</div>`;
    html += `<div class="rank-row me">
      <span class="rank-pos">${myIdx + 1}</span>
      <span class="rank-name">${escHtml(myNick)} (나)</span>
      <span class="rank-money">${fmtShort(state.money)}</span></div>`;
  }
  list.innerHTML = html;
}

$('#rank-nick').addEventListener('change', e => {
  myNick = (e.target.value.trim() || myNick).slice(0, 12);
  state.nick = myNick; save();
  lbPush();
  updateRank();
  renderRanking();
});

function lbInit() {
  updateRank(true);
  renderRanking();
  if (sbEnabled()) {
    lbPush();
    lbFetch();
    setInterval(lbFetch, 4000);
  }
}

/* ============================================================
   모의 주식 시장 (실제 기업명 변형 30종목)
   ============================================================ */
const STOCKS = [
  { n: '사성전자', e: '💻', p: 71000, v: 0.014 },
  { n: 'SG하이닉스', e: '💾', p: 128000, v: 0.020 },
  { n: '카커오', e: '💬', p: 48000, v: 0.024 },
  { n: '네이비', e: '🟩', p: 195000, v: 0.020 },
  { n: 'KG전자', e: '🔌', p: 95000, v: 0.016 },
  { n: '현태차', e: '🚗', p: 240000, v: 0.016 },
  { n: '기야차', e: '🚙', p: 98000, v: 0.017 },
  { n: '팔성사이다', e: '🥤', p: 135000, v: 0.012 },
  { n: '논심', e: '🍜', p: 410000, v: 0.011 },
  { n: '오뚝이', e: '🍲', p: 430000, v: 0.010 },
  { n: '빙구레', e: '🍦', p: 62000, v: 0.013 },
  { n: '롯테제과', e: '🍫', p: 118000, v: 0.012 },
  { n: '신나면', e: '🍥', p: 1500, v: 0.030 },
  { n: '새우캉', e: '🦐', p: 1200, v: 0.032 },
  { n: '쿠퐁', e: '📦', p: 32000, v: 0.030 },
  { n: '당콩마켓', e: '🥕', p: 8500, v: 0.035 },
  { n: '배달의시민', e: '🛵', p: 15000, v: 0.030 },
  { n: '토수', e: '💳', p: 22000, v: 0.030 },
  { n: '에플', e: '🍏', p: 305000, v: 0.014 },
  { n: '그글', e: '🔍', p: 198000, v: 0.016 },
  { n: '마이크로소포트', e: '🪟', p: 520000, v: 0.013 },
  { n: '테슬러', e: '⚡', p: 360000, v: 0.030 },
  { n: '엔비디어', e: '🎮', p: 1450000, v: 0.030 },
  { n: '아마종', e: '🛒', p: 240000, v: 0.018 },
  { n: '넷플럭스', e: '🎬', p: 720000, v: 0.020 },
  { n: '디지니', e: '🏰', p: 130000, v: 0.017 },
  { n: '나이커', e: '👟', p: 110000, v: 0.015 },
  { n: '스타박스', e: '☕', p: 98000, v: 0.014 },
  { n: '비트코언', e: '🪙', p: 95000000, v: 0.050 },
  { n: '도지코언', e: '🐕', p: 180, v: 0.070 },
];
const STOCK_HIST = 80;
let prices = {}, openPrices = {}, histories = {};
let selectedStock = null;
let stockSaveTick = 0;

function stockInit() {
  state.holdings = state.holdings || {};
  const saved = state.prices || {};
  for (const s of STOCKS) {
    prices[s.n] = saved[s.n] > 0 ? saved[s.n] : s.p;
    openPrices[s.n] = prices[s.n];
    histories[s.n] = [prices[s.n]];
  }
}
function stockFloor(s) { return Math.max(s.p * 0.05, 1); }

function stockTick() {
  for (const s of STOCKS) {
    let p = prices[s.n];
    const shock = (Math.random() - 0.5) * 2 * s.v;
    p *= (1 + 0.0004 + shock);
    if (Math.random() < 0.012) p *= (1 + (Math.random() - 0.5) * s.v * 7); // 뉴스 급등락
    prices[s.n] = Math.max(stockFloor(s), p);
    const h = histories[s.n];
    h.push(prices[s.n]);
    if (h.length > STOCK_HIST) h.shift();
  }
  state.prices = prices;
  if (++stockSaveTick % 3 === 0) save();
  updateRank(); // 총자산 변동 → 랭킹/푸시
  if ($('#screen-stocks').offsetParent) renderStockList();
  if ($('#screen-stock-detail').offsetParent) renderStockDetail();
}

function stockValue() {
  let v = 0;
  for (const s of STOCKS) {
    const h = state.holdings[s.n];
    if (h && h.shares > 0 && prices[s.n]) v += h.shares * prices[s.n];
  }
  return v;
}
function netWorth() { return state.money + stockValue(); }
function unrealizedPL() {
  let pl = 0;
  for (const s of STOCKS) {
    const h = state.holdings[s.n];
    if (h && h.shares > 0) pl += h.shares * prices[s.n] - h.cost;
  }
  return pl;
}
function changePct(name) { return (prices[name] / openPrices[name] - 1) * 100; }

function renderPort() {
  $('#port-cash').textContent = fmtShort(state.money);
  $('#port-stock').textContent = fmtShort(stockValue());
  $('#port-total').textContent = fmtShort(netWorth());
  const pl = unrealizedPL();
  const el = $('#port-pl');
  el.textContent = `평가손익 ${pl >= 0 ? '+' : '−'}${fmtShort(Math.abs(pl))}`;
  el.className = 'port-pl ' + (pl >= 0 ? 'up' : 'down');
}
function renderStockList() {
  renderPort();
  const list = $('#stock-list');
  let html = '';
  for (const s of STOCKS) {
    const h = state.holdings[s.n];
    const owned = h && h.shares > 0;
    const chg = changePct(s.n);
    html += `<div class="stock-row ${owned ? 'owned' : ''}" data-name="${escHtml(s.n)}">
      <span class="st-emoji">${s.e}</span>
      <span class="st-name">${escHtml(s.n)}${owned ? `<small>보유 ${h.shares}주</small>` : ''}</span>
      <span class="st-price">${fmt(prices[s.n])}</span>
      <span class="st-chg ${chg >= 0 ? 'up' : 'down'}">${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%</span>
    </div>`;
  }
  list.innerHTML = html;
  list.querySelectorAll('.stock-row').forEach(row => {
    row.addEventListener('click', () => openStock(row.dataset.name));
  });
}

function openStock(name) {
  selectedStock = name;
  $('#sd-qty').value = 1;
  showScreen('screen-stock-detail');
  renderStockDetail();
}
function renderStockDetail() {
  const name = selectedStock;
  if (!name) return;
  const s = STOCKS.find(x => x.n === name);
  $('#sd-name').textContent = s.e + ' ' + name;
  $('#sd-price').textContent = fmt(prices[name]);
  const chg = changePct(name);
  const chgEl = $('#sd-chg');
  chgEl.textContent = `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`;
  chgEl.className = 'sd-chg ' + (chg >= 0 ? 'up' : 'down');
  const h = state.holdings[name];
  const hEl = $('#sd-holding');
  if (h && h.shares > 0) {
    const val = h.shares * prices[name];
    const pl = val - h.cost;
    const plp = (pl / h.cost * 100);
    hEl.innerHTML = `보유 <b>${h.shares}주</b> · 평단 <b>${fmt(h.cost / h.shares)}</b> · 평가 <b>${fmt(val)}</b> · 손익 <span class="${pl >= 0 ? 'pl-up' : 'pl-down'}">${pl >= 0 ? '+' : '−'}${fmt(Math.abs(pl))} (${plp >= 0 ? '+' : ''}${plp.toFixed(1)}%)</span>`;
  } else {
    hEl.textContent = '보유 없음';
  }
  updateSdCost();
  drawStockChart(name);
}
function updateSdCost() {
  if (!selectedStock) return;
  const qty = Math.max(1, parseInt($('#sd-qty').value) || 1);
  $('#sd-cost').textContent = `주문 금액 ${fmt(prices[selectedStock] * qty)}`;
}
function drawStockChart(name) {
  const cv = $('#stock-chart'), ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, pad = 8;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0e0b16'; ctx.fillRect(0, 0, W, H);
  const h = histories[name];
  if (!h || h.length < 2) return;
  let lo = Math.min(...h), hi = Math.max(...h);
  if (hi === lo) { hi += 1; lo -= 1; }
  const x = i => pad + i / (h.length - 1) * (W - pad * 2);
  const y = p => H - pad - (p - lo) / (hi - lo) * (H - pad * 2);
  const up = h[h.length - 1] >= h[0];
  const col = up ? '#5ef0a0' : '#ff5d7a';
  // 면적
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, up ? 'rgba(94,240,160,.28)' : 'rgba(255,93,122,.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.moveTo(x(0), y(h[0]));
  for (let i = 1; i < h.length; i++) ctx.lineTo(x(i), y(h[i]));
  ctx.lineTo(x(h.length - 1), H - pad); ctx.lineTo(x(0), H - pad); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  // 라인
  ctx.beginPath();
  ctx.moveTo(x(0), y(h[0]));
  for (let i = 1; i < h.length; i++) ctx.lineTo(x(i), y(h[i]));
  ctx.strokeStyle = col; ctx.lineWidth = 2.5;
  ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
}

function stockBuy() {
  const name = selectedStock; if (!name) return;
  const qty = Math.max(1, parseInt($('#sd-qty').value) || 1);
  const cost = Math.ceil(prices[name] * qty);
  if (!spend(cost)) return;
  const h = state.holdings[name] || { shares: 0, cost: 0 };
  h.shares += qty; h.cost += cost;
  state.holdings[name] = h; save();
  snd.coin();
  const el = $('#sd-result');
  el.textContent = `📈 ${qty}주 매수 — ${fmt(cost)}`;
  el.className = 'result-line';
  renderStockDetail();
}
function stockSell() {
  const name = selectedStock; if (!name) return;
  const h = state.holdings[name];
  if (!h || h.shares <= 0) { toast('보유 주식이 없어요!', 'bad'); return; }
  let qty = Math.max(1, parseInt($('#sd-qty').value) || 1);
  qty = Math.min(qty, h.shares);
  const proceeds = Math.floor(prices[name] * qty);
  const avg = h.cost / h.shares;
  const pl = proceeds - avg * qty;
  h.cost -= avg * qty; h.shares -= qty;
  if (h.shares <= 0) { h.shares = 0; h.cost = 0; }
  state.holdings[name] = h;
  addMoney(proceeds);
  const el = $('#sd-result');
  if (pl >= 0) { winFX(proceeds, $('#stock-chart')); el.textContent = `💰 ${qty}주 매도 — ${fmt(proceeds)} (+${fmt(pl)})`; el.className = 'result-line win'; }
  else { loseFX(); el.textContent = `📉 ${qty}주 매도 — ${fmt(proceeds)} (${fmt(pl)})`; el.className = 'result-line lose'; }
  renderStockDetail();
}

document.querySelectorAll('.sd-qty [data-q]').forEach(b => {
  b.addEventListener('click', () => {
    const q = Math.max(1, (parseInt($('#sd-qty').value) || 1) + parseInt(b.dataset.q));
    $('#sd-qty').value = q; updateSdCost();
  });
});
$('#sd-maxbuy').addEventListener('click', () => {
  if (!selectedStock) return;
  const max = Math.floor(state.money / prices[selectedStock]);
  $('#sd-qty').value = Math.max(1, max); updateSdCost();
});
$('#sd-qty').addEventListener('input', updateSdCost);
$('#sd-buy').addEventListener('click', stockBuy);
$('#sd-sell').addEventListener('click', stockSell);

/* ================= 시작 ================= */
load();
state.hired = state.hired || {};
state.hired.labor = true;
renderMoney(true);
renderSoundBtn();
$('#labor-count').textContent = state.jobsDone;
$('#lotto-count').textContent = state.lottoBought;
$('#lotto-wins').textContent = state.lottoWins;
$('#barista-count').textContent = state.baristaCount || 0;
$('#courier-count').textContent = state.courierCount || 0;
$('#dev-count').textContent = state.devCount || 0;
$('#doctor-count').textContent = state.doctorCount || 0;
['paperboy', 'store', 'chef', 'pilot', 'ceo'].forEach(id => {
  const el = $('#' + id + '-count'); if (el) el.textContent = state[id + 'Count'] || 0;
});

newLaborJob();
drawLottoCover();
lottoCells.forEach(el => { el.textContent = '?'; el.className = 'lotto-cell'; });
requestAnimationFrame(rouletteLoop);
pinballLoop();
genClawPrizes();
clawLoop();
requestAnimationFrame(crashLoop);
baristaLoop();
courierLoop();
doctorLoop();
ladderLoop();
horseLoop();
ladGen();
diceUpdateInfo();
minesUpdateInfo();
renderJobList();

// 주식 시장 시작 (랭킹보다 먼저 — 총자산 계산에 필요)
stockInit();
renderStockList();
setInterval(stockTick, 2000);

// 부자 랭킹 시작 (Supabase 공용, 총자산 = 현금 + 주식평가 기준)
lbInit();

showScreen('screen-home');

// 웹폰트 로드 후 캔버스 텍스트 다시 그리기
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    drawLabor();
    if (!lottoActive) drawLottoCover();
  });
}
