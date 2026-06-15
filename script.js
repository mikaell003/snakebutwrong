
// ===== ABOUT DEVELOPER BUTTON =====

// Create button
const aboutBtn = document.createElement("button");
aboutBtn.innerText = "👨‍💻 About";
aboutBtn.style.position = "fixed";
aboutBtn.style.bottom = "20px";
aboutBtn.style.right = "20px";
aboutBtn.style.padding = "10px 15px";
aboutBtn.style.background = "#32CD32";
aboutBtn.style.color = "white";
aboutBtn.style.border = "none";
aboutBtn.style.borderRadius = "8px";
aboutBtn.style.cursor = "pointer";
aboutBtn.style.zIndex = "1000";

document.body.appendChild(aboutBtn);

// Show popup when clicked
aboutBtn.addEventListener("click", () => {
    alert(
`🐍 SnakeButWrong

Created by Michael Owen

Hi! I'm Mikael, a developer who enjoys building fun and unusual browser games.

SnakeButWrong was created from one simple idea:

"What if Snake suddenly stopped trusting your muscle memory?"

Built with:
• HTML
• CSS
• JavaScript

Thanks for playing! 🐍`
    );
});

const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
const BOX = 20, COLS = canvas.width/BOX, ROWS = canvas.height/BOX;
 
// ── Direction helpers ───────────────────────────────────────────────────
const ARROW_CHAR = {UP:'↑', DOWN:'↓', LEFT:'←', RIGHT:'→'};
const OPPOSITE   = {UP:'DOWN', DOWN:'UP', LEFT:'RIGHT', RIGHT:'LEFT'};
const KEY_TO_DIR = {ArrowUp:'UP', ArrowDown:'DOWN', ArrowLeft:'LEFT', ArrowRight:'RIGHT'};
const DIR_TO_KEY = {UP:'ArrowUp', DOWN:'ArrowDown', LEFT:'ArrowLeft', RIGHT:'ArrowRight'};
const WASD_MAP   = {w:'ArrowUp',s:'ArrowDown',a:'ArrowLeft',d:'ArrowRight',
                    W:'ArrowUp',S:'ArrowDown',A:'ArrowLeft',D:'ArrowRight'};
 
// ── Modes ───────────────────────────────────────────────────────────────
// Each mode is a mapping: logical direction pressed → actual direction result
// Keys and values are 'UP'|'DOWN'|'LEFT'|'RIGHT'
const MODE_DEFS = [
  {
    name:'Normal', cls:'badge-normal',
    badge:'background:#0d2818;color:#22c55e;border-color:#22c55e',
    desc:'controls are normal',
    remap:{UP:'UP',DOWN:'DOWN',LEFT:'LEFT',RIGHT:'RIGHT'}
  },
  {
    name:'Reversed', cls:'badge-reverse',
    badge:'background:#2a1010;color:#ef4444;border-color:#ef4444',
    desc:'all directions flipped!',
    remap:{UP:'DOWN',DOWN:'UP',LEFT:'RIGHT',RIGHT:'LEFT'}
  },
  {
    name:'Rotate Right', cls:'badge-rotright',
    badge:'background:#1a1a2e;color:#a78bfa;border-color:#a78bfa',
    desc:'everything rotated 90° right',
    remap:{UP:'RIGHT',RIGHT:'DOWN',DOWN:'LEFT',LEFT:'UP'}
  },
  {
    name:'Rotate Left', cls:'badge-rotleft',
    badge:'background:#1a2a1a;color:#facc15;border-color:#facc15',
    desc:'everything rotated 90° left',
    remap:{UP:'LEFT',LEFT:'DOWN',DOWN:'RIGHT',RIGHT:'UP'}
  },
  {
    name:'Mirror H', cls:'badge-mirror',
    badge:'background:#0f1f2e;color:#38bdf8;border-color:#38bdf8',
    desc:'left ↔ right swapped',
    remap:{UP:'UP',DOWN:'DOWN',LEFT:'RIGHT',RIGHT:'LEFT'}
  },
  {
    name:'🌀 Chaos', cls:'badge-chaos',
    badge:'background:#2a1a0d;color:#fb923c;border-color:#fb923c',
    desc:'fully random remap!',
    remap:null // built at remap time
  }
];
 
function buildChaosRemap() {
  const dirs = ['UP','DOWN','LEFT','RIGHT'];
  const shuffled = [...dirs].sort(()=>Math.random()-0.5);
  const m = {};
  dirs.forEach((d,i) => m[d] = shuffled[i]);
  return m;
}
 
// ── State ───────────────────────────────────────────────────────────────
let snake, snakeDir, nextDir, food;
let score = 0, best = 0, level = 1;
let running = false;
let currentMode, currentRemap;
let gameLoop = null;
let remapCD = 30000, lastTime = 0;
let rafID = null;
let flashTO = null, canvasFlashTO = null;
 
// ── Mode application ────────────────────────────────────────────────────
function applyRemap(logicalDir) {
  return currentRemap[logicalDir] || logicalDir;
}
 
function normaliseKey(rawKey) {
  const k = WASD_MAP[rawKey] || rawKey;
  return KEY_TO_DIR[k] || null; // returns 'UP'/'DOWN'/'LEFT'/'RIGHT' or null
}
 
function handleInput(logicalDir) {
  if (!running || !logicalDir) return;
  const actual = applyRemap(logicalDir);
  if (actual !== OPPOSITE[snakeDir]) nextDir = actual;
}
 
// ── D-pad button label update ───────────────────────────────────────────
function updateDpad() {
  // Each physical button (UP/DOWN/LEFT/RIGHT) now shows:
  //   big: the arrow for what it ACTUALLY does
  //   small label: the physical direction pressed
  const btns = ['UP','DOWN','LEFT','RIGHT'];
  btns.forEach(physDir => {
    const btn = document.getElementById('btn-'+physDir);
    if (!btn) return;
    const actualDir = applyRemap(physDir);
    const arrow = btn.querySelector('.btn-arrow');
    const label = btn.querySelector('.btn-label');
    if (arrow) arrow.textContent = ARROW_CHAR[actualDir];
    if (label) label.textContent = actualDir.toLowerCase();
    // highlight if remapped
    if (actualDir !== physDir) {
      btn.classList.add('remapped');
    } else {
      btn.classList.remove('remapped');
    }
  });
}
 
// ── Mode switch ─────────────────────────────────────────────────────────
function setMode(modeDef) {
  currentMode = modeDef;
  if (modeDef.remap === null) {
    currentRemap = buildChaosRemap();
  } else {
    currentRemap = {...modeDef.remap};
  }
 
  // Badge
  const badge = document.getElementById('mode-badge');
  badge.textContent = modeDef.name;
  badge.style.cssText =
    'display:inline-block;padding:3px 12px;border-radius:20px;' +
    'font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;' +
    'border:1.5px solid;' + modeDef.badge;
 
  updateDpad();
}
 
// ── Notifications ───────────────────────────────────────────────────────
function showFlash(msg) {
  const el = document.getElementById('flash');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(flashTO);
  flashTO = setTimeout(()=> el.classList.remove('show'), 3000);
}
 
function showCanvasFlash(msg, color) {
  const el = document.getElementById('canvas-flash');
  el.textContent = msg;
  el.style.color = color || '#facc15';
  el.classList.add('show');
  clearTimeout(canvasFlashTO);
  canvasFlashTO = setTimeout(()=> el.classList.remove('show'), 2500);
}
 
// ── Remap trigger ───────────────────────────────────────────────────────
function doRemap() {
  const pool = MODE_DEFS.filter(m => m.name !== currentMode.name);
  const next  = pool[Math.floor(Math.random()*pool.length)];
  setMode(next);
  remapCD = 30000;
 
  // Build a readable summary of what changed
  const changes = ['UP','DOWN','LEFT','RIGHT']
    .filter(d => currentRemap[d] !== d)
    .map(d => ARROW_CHAR[d]+'→'+ARROW_CHAR[currentRemap[d]])
    .join('  ');
 
  const msgShort = '⚡ ' + next.name.toUpperCase() + (changes ? ': ' + changes : '');
  showCanvasFlash(msgShort, next.badge.match(/color:([^;]+)/)?.[1] || '#facc15');
  showFlash('Controls changed → ' + next.name + ' — ' + next.desc);
}
 
// ── Game loop ───────────────────────────────────────────────────────────
function getSpeed() {
  return Math.max(70, 150 - (level-1)*10);
}
 
function randomFood() {
  let p;
  do { p = {x:Math.floor(Math.random()*COLS), y:Math.floor(Math.random()*ROWS)}; }
  while (snake.some(s=>s.x===p.x&&s.y===p.y));
  return p;
}
 
function startGame() {
  document.getElementById('overlay').style.display = 'none';
  snake   = [{x:12,y:12},{x:11,y:12},{x:10,y:12}];
  snakeDir = 'RIGHT'; nextDir = 'RIGHT';
  score = 0; level = 1;
  food = randomFood();
  setMode(MODE_DEFS[0]);
  updateHUD();
  running = true;
  remapCD = 30000;
  lastTime = performance.now();
  clearInterval(gameLoop);
  gameLoop = setInterval(tick, getSpeed());
  cancelAnimationFrame(rafID);
  rafID = requestAnimationFrame(timerLoop);
}
 
function tick() {
  if (!running) return;
  snakeDir = nextDir;
  const delta = {UP:{x:0,y:-1},DOWN:{x:0,y:1},LEFT:{x:-1,y:0},RIGHT:{x:1,y:0}}[snakeDir];
  const head = {x:snake[0].x+delta.x, y:snake[0].y+delta.y};
 
  // Collision
  if (head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||snake.some(s=>s.x===head.x&&s.y===head.y)) {
    endGame(); return;
  }
 
  snake.unshift(head);
  if (head.x===food.x && head.y===food.y) {
    score++;
    level = Math.floor(score/5)+1;
    food = randomFood();
    clearInterval(gameLoop);
    gameLoop = setInterval(tick, getSpeed());
    updateHUD();
  } else {
    snake.pop();
  }
  draw();
}
 
// ── Timer RAF loop ──────────────────────────────────────────────────────
function timerLoop(ts) {
  if (!running) return;
  const dt = ts - lastTime;
  lastTime = ts;
  remapCD -= dt;
  if (remapCD <= 0) {
    doRemap();
    // doRemap already resets remapCD to 30000
  }
  const pct = Math.max(0, remapCD / 30000);
  const bar = document.getElementById('timer-bar');
  bar.style.width = (pct*100)+'%';
  bar.style.background = pct<0.12 ? '#ef4444' : pct<0.3 ? '#facc15' : '#22c55e';
  rafID = requestAnimationFrame(timerLoop);
}
 
// ── HUD ─────────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('score-val').textContent = score;
  document.getElementById('level-val').textContent = level;
  if (score > best) {
    best = score;
    document.getElementById('best-val').textContent = best;
  }
}
 
// ── Draw ────────────────────────────────────────────────────────────────
function rr(x,y,w,h,r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}
 
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
 
  // Grid dots
  ctx.fillStyle='#151e2d';
  for(let x=0;x<COLS;x++) for(let y=0;y<ROWS;y++) ctx.fillRect(x*BOX+9,y*BOX+9,2,2);
 
  // Food
  ctx.fillStyle='#ef4444';
  ctx.beginPath();
  ctx.arc(food.x*BOX+BOX/2, food.y*BOX+BOX/2, BOX/2-2, 0, Math.PI*2);
  ctx.fill();
 
  // Snake body
  snake.forEach((seg,i) => {
    const isHead = i===0;
    ctx.fillStyle = isHead ? '#22c55e' : (i%2===0 ? '#16a34a' : '#15803d');
    rr(seg.x*BOX+(isHead?1:2), seg.y*BOX+(isHead?1:2), BOX-(isHead?2:4), BOX-(isHead?2:4), isHead?6:4);
    ctx.fill();
    if (isHead) {
      ctx.fillStyle='#0d1117';
      const horiz = snakeDir==='LEFT'||snakeDir==='RIGHT';
      const ex = snakeDir==='RIGHT'?3:snakeDir==='LEFT'?-3:0;
      const ey = snakeDir==='DOWN' ?3:snakeDir==='UP' ?-3:0;
      const cx = seg.x*BOX+BOX/2+ex, cy = seg.y*BOX+BOX/2+ey;
      const off = 3;
      ctx.beginPath(); ctx.arc(cx+(horiz?0:-off), cy+(horiz?-off:0), 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+(horiz?0: off), cy+(horiz? off:0), 2, 0, Math.PI*2); ctx.fill();
    }
  });
}
 
// ── End game ────────────────────────────────────────────────────────────
function endGame() {
  running = false;
  clearInterval(gameLoop);
  cancelAnimationFrame(rafID);
  const ov = document.getElementById('overlay');
  ov.style.display = 'flex';
  ov.innerHTML = `
    <h2>game over</h2>
    <div class="big-score">${score}</div>
    <p>best: ${best} &nbsp;·&nbsp; level: ${level}</p>
    <button class="play-btn" onclick="startGame()">play again</button>
  `;
}
 
// ── Input: keyboard ─────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const arrows = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
  const wasd   = ['w','a','s','d','W','A','S','D'];
  if ([...arrows,...wasd].includes(e.key)) e.preventDefault();
  handleInput(normaliseKey(e.key));
});
 
// ── Input: d-pad buttons ────────────────────────────────────────────────
['UP','DOWN','LEFT','RIGHT'].forEach(physDir => {
  const btn = document.getElementById('btn-'+physDir);
  if (!btn) return;
  btn.addEventListener('click', () => handleInput(physDir));
  btn.addEventListener('touchstart', e => { e.preventDefault(); handleInput(physDir); }, {passive:false});
});
 
// ── Input: canvas swipe ─────────────────────────────────────────────────
let touchStart = null;
canvas.addEventListener('touchstart', e=>{ touchStart = e.touches[0]; }, {passive:true});
canvas.addEventListener('touchend', e=>{
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.clientX;
  const dy = e.changedTouches[0].clientY - touchStart.clientY;
  if (Math.abs(dx)<10 && Math.abs(dy)<10) return;
  const logicalDir = Math.abs(dx)>Math.abs(dy) ? (dx>0?'RIGHT':'LEFT') : (dy>0?'DOWN':'UP');
  handleInput(logicalDir);
  touchStart = null;
}, {passive:true});
 
// ── Initial board render ────────────────────────────────────────────────
(function(){
  ctx.fillStyle='#0f172a';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#151e2d';
  for(let x=0;x<COLS;x++) for(let y=0;y<ROWS;y++) ctx.fillRect(x*BOX+9,y*BOX+9,2,2);
})();
