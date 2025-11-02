// Simple 'Dodge Blocks' game (enhanced UI)
const canvas = document.getElementById('game');

const playerImg = new Image();
playerImg.src = 'assets/player.png';

const enemyImgs = [
  Object.assign(new Image(), { src: 'assets/enemy1.png' }),
  Object.assign(new Image(), { src: 'assets/enemy2.png' }),
];

const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');
const pauseBtn = document.getElementById('pause');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const githubBtn = document.getElementById('github');
const vfx = document.getElementById('vfx');
const bgCanvas = document.getElementById('bg');
const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;

// load best score
let bestScore = parseInt(localStorage.getItem('dodge_best') || '0', 10);
bestEl.textContent = bestScore;

// audio setup
let audioCtx = null;
let muted = (localStorage.getItem('dodge_muted') === 'true');
const muteBtn = document.getElementById('mute');
if(muteBtn){ muteBtn.setAttribute('aria-pressed', String(muted)); muteBtn.textContent = muted ? '🔇' : '🔊'; }
const volSlider = document.getElementById('volume');
let storedVol = parseFloat(localStorage.getItem('dodge_vol'));
if(!isNaN(storedVol) && volSlider) volSlider.value = Math.round(storedVol * 100);

function ensureAudio(){
  if(audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  // master gain for volume slider
  audioCtx.masterGain = audioCtx.createGain();
  const initVol = (storedVol != null && !isNaN(storedVol)) ? storedVol : 0.8;
  audioCtx.masterGain.gain.value = initVol;
  audioCtx.masterGain.connect(audioCtx.destination);
}

function playBeep(freq=440, time=0.08, type='sine', gain=0.12){
  if(muted) return;
  try{ ensureAudio(); const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = gain; o.connect(g); g.connect(audioCtx.masterGain); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + time); o.stop(audioCtx.currentTime + time + 0.02);}catch(e){/* audio blocked */}
}

function playScore(){ playBeep(880, 0.12, 'sine', 0.08); }
function playHit(){ playBeep(120, 0.18, 'sawtooth', 0.18); }
function playMove(){ playBeep(520, 0.05, 'triangle', 0.04); }

if(muteBtn){
  muteBtn.addEventListener('click', ()=>{
    muted = !muted; localStorage.setItem('dodge_muted', String(muted));
    muteBtn.setAttribute('aria-pressed', String(muted)); muteBtn.textContent = muted ? '🔇' : '🔊';
    if(!muted) ensureAudio();
    if(muted){ stopMusic(); stopBeat(); } else { /* don't auto-start on unmute; user can press Play */ }
  });
}

if(volSlider){
  volSlider.addEventListener('input', e=>{
    const v = Number(e.target.value)/100;
    localStorage.setItem('dodge_vol', String(v));
    try{ if(audioCtx && audioCtx.masterGain) audioCtx.masterGain.gain.value = v; }catch(e){}
  });
}

// ambient music nodes
let padOsc = null;
let padGain = null;
let musicRunning = false;
function startMusic(){
  if(musicRunning || muted) return;
  ensureAudio();
  padOsc = audioCtx.createOscillator();
  const o2 = audioCtx.createOscillator();
  padGain = audioCtx.createGain();
  padOsc.type = 'sine'; padOsc.frequency.value = 110;
  o2.type = 'triangle'; o2.frequency.value = 220; o2.detune.value = -12;
  padOsc.connect(padGain); o2.connect(padGain); padGain.connect(audioCtx.masterGain);
  padGain.gain.value = 0.0001;
  padOsc.start(); o2.start();
  // fade in
  padGain.gain.linearRampToValueAtTime(0.07, audioCtx.currentTime + 2.8);
  musicRunning = true;
  // also start the beat loop
  startBeat();
  // start melodic riff
  startRiff();
}

function stopMusic(){
  if(!musicRunning) return;
  try{ padGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6); setTimeout(()=>{ try{ padOsc.stop(); padOsc.disconnect(); padOsc=null; }catch(e){} }, 800); }catch(e){}
  musicRunning = false;
  // stop beat when music stops
  stopBeat();
  // stop melodic riff
  stopRiff();
}

// --- Melodic riff (original, evocative) ---
let riffHandle = null;
let riffVoice = null;
function playRiffNote(noteFreq, time, dur=0.25){
  if(!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(noteFreq, time);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(0.10, time + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  o.connect(g); g.connect(audioCtx.masterGain);
  o.start(time); o.stop(time + dur + 0.02);
}

function startRiff(){
  if(riffHandle || muted) return;
  ensureAudio();
  // a small sequence that hints at the melody (original composition)
  const pattern = [440, 523.25, 659.25, 523.25, 440, 392, 440, 523.25]; // A4, C5, E5, C5, A4, G4, A4, C5 (evocative, not copied)
  let step = 0;
  const interval = 500; // ms per step to align with beat
  riffHandle = setInterval(()=>{
    const now = audioCtx.currentTime + 0.02;
    const freq = pattern[step % pattern.length];
    playRiffNote(freq, now, 0.28);
    step = (step + 1) % pattern.length;
  }, interval);
}

function stopRiff(){
  if(!riffHandle) return;
  clearInterval(riffHandle); riffHandle = null;
}

// --- Synth beat (short original loop, inspired vibe) ---
let beatHandle = null;
function playKick(time){
  if(!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, time);
  o.frequency.exponentialRampToValueAtTime(50, time + 0.15);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(0.8, time + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
  o.connect(g); g.connect(audioCtx.masterGain);
  o.start(time); o.stop(time + 0.5);
}

function playHat(time){
  if(!audioCtx) return;
  // simple noise-based hat
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass'; filter.frequency.value = 7000;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(0.08, time + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
  src.connect(filter); filter.connect(g); g.connect(audioCtx.masterGain);
  src.start(time); src.stop(time + 0.15);
}

function startBeat(){
  if(beatHandle || muted) return;
  ensureAudio();
  // schedule a simple 4/4 pattern using setInterval
  const interval = 500; // ms
  let step = 0;
  beatHandle = setInterval(()=>{
    const now = audioCtx.currentTime;
    // kick on 0 and 2
    if(step % 4 === 0 || step % 4 === 2) playKick(now + 0.001);
    // hat on every 2nd 8th (simple)
    if(step % 2 === 0) playHat(now + 0.001);
    step = (step + 1) % 4;
  }, interval);
}

function stopBeat(){
  if(!beatHandle) return;
  clearInterval(beatHandle); beatHandle = null;
}

let W = canvas.width = 480;
let H = canvas.height = 640;
let running = false; // start paused until user hits Play

window.addEventListener('resize', fitCanvas);
function fitCanvas(){
  const ratio = W / H;
  const avail = Math.min(window.innerWidth * 0.9, 720);
  canvas.style.width = avail + 'px';
  canvas.style.height = (avail / ratio) + 'px';
}
fitCanvas();

// Player (slightly larger for better visibility)
const player = {
  x: W / 2 - 28,
  y: H - 90,
  w: 70,
  h: 70,
  speed: 6
};

// Blocks
let blocks = [];
let spawnTimer = 0;
let spawnRate = 60; // frames
let gravity = 2;
let score = 0;
let frames = 0;

// particles for small neon sparks
let particles = [];

function spawnParticle(x,y,color){
  particles.push({x,y,vx:(Math.random()-0.5)*2,vy:(Math.random()-0.5)*2,life:40,color});
}

// background particles for ambient motion
let bgParticles = [];
function spawnBg(){
  if(!bgCanvas) return;
  if(bgParticles.length < 80 && Math.random() < 0.9) bgParticles.push({x:Math.random()*W,y:Math.random()*H,r:2+Math.random()*8,vx:(Math.random()-0.5)*0.8,vy:-0.2-Math.random()*0.8,alpha:0.2+Math.random()*0.7});
}

function updateBg(){
  if(!bgCtx) return;
  for(let i=bgParticles.length-1;i>=0;i--){
    const p = bgParticles[i];
    p.x += p.vx; p.y += p.vy;
    p.alpha -= 0.001;
    if(p.y < -20 || p.alpha <= 0) bgParticles.splice(i,1);
  }
}

function drawBg(){
  if(!bgCtx) return;
  bgCtx.clearRect(0,0,W,H);
  for(const p of bgParticles){
    const rad = bgCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3);
    rad.addColorStop(0,'rgba(124,58,237,'+ (p.alpha*0.6) +')');
    rad.addColorStop(1,'rgba(6,182,212,0)');
    bgCtx.fillStyle = rad;
    bgCtx.beginPath(); bgCtx.arc(p.x,p.y,p.r,0,Math.PI*2); bgCtx.fill();
  }
}

function spawnBlock(){
  const bw = 60;
  const bh = 120;
  const bx = Math.random() * (W - bw);
  const img = enemyImgs[Math.floor(Math.random() * enemyImgs.length)];
  blocks.push({x: bx, y: -bh, w: bw, h: bh, vy: gravity, img});
}

function update(){
  if(!running) return;
  frames++;
  spawnTimer++;
  if(spawnTimer >= spawnRate){
    spawnTimer = 0;
    spawnBlock();
    // make it harder over time
    if(spawnRate > 12 && frames % 300 === 0) spawnRate -= 4;
    if(frames % 200 === 0) gravity += 0.2;
  }

  // move blocks
  for(let i=blocks.length-1;i>=0;i--){
    const b = blocks[i];
    b.vy += 0.02;
    b.y += b.vy;
    if(b.y > H){
      blocks.splice(i,1);
      score += 1;
      scoreEl.textContent = score;
      try{ playScore(); }catch(e){}
    }
  }

  // player bounds clamp
  if(keys.left) player.x -= player.speed;
  if(keys.right) player.x += player.speed;
  player.x = Math.max(0, Math.min(W - player.w, player.x));

  // play subtle move sound when moving
  if((keys.left || keys.right) && frames % 6 === 0){ try{ playMove(); }catch(e){} }

  // collision
  for(const b of blocks){
    if(rectIntersect(player,b)){
      running = false;
      pauseBtn.textContent = 'Restart';
      // spawn hit particles
      for(let i=0;i<12;i++) spawnParticle(player.x + player.w/2, player.y + player.h/2, '#ef4444');
      // update best
      if(score > bestScore){ bestScore = score; localStorage.setItem('dodge_best', String(bestScore)); bestEl.textContent = bestScore; }
      try{ playHit(); }catch(e){}
    }
  }
}

function rectIntersect(a,b){
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

function draw(){
  // background
  // subtle gradient backdrop
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#061122');
  g.addColorStop(1,'#02101b');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // player
  // player neon (bigger + stronger glow)
  ctx.save();
  ctx.shadowBlur = 25;
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
  ctx.restore();

  // spotlight over player
  const sp = ctx.createRadialGradient(player.x+player.w/2, player.y+player.h/2, 0, player.x+player.w/2, player.y+player.h/2, 140);
  sp.addColorStop(0,'rgba(16,185,129,0.10)');
  sp.addColorStop(1,'rgba(2,6,11,0)');
  ctx.fillStyle = sp; ctx.fillRect(0,0,W,H);

  // blocks with neon glow
  for(const b of blocks){
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.drawImage(b.img, b.x, b.y, b.w, b.h);
  ctx.restore();
}

  // particles
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life/40);
    ctx.fillRect(p.x, p.y, 3, 3);
    ctx.globalAlpha = 1;
  }

  if(!running){
    // overlay handled by DOM; draw subtle overlay when paused
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0,0,W,H);
  }
}

function roundRect(ctx,x,y,w,h,r,fill){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
  if(fill) ctx.fill();
}

function loop(){
  bgTick();
  update();
  draw();
  requestAnimationFrame(loop);
}

// Input
const keys = {left:false,right:false};
window.addEventListener('keydown', e=>{
  if(e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
  if(e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  if(e.key === ' ') { running = !running; pauseBtn.textContent = running ? 'Pause' : 'Resume'; overlay.style.display = running ? 'none' : 'flex'; }
});
window.addEventListener('keyup', e=>{
  if(e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
  if(e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
});

leftBtn.addEventListener('mousedown', ()=> keys.left = true);
leftBtn.addEventListener('mouseup', ()=> keys.left = false);
rightBtn.addEventListener('mousedown', ()=> keys.right = true);
rightBtn.addEventListener('mouseup', ()=> keys.right = false);
pauseBtn.addEventListener('click', ()=>{
  if(!running){
    // restart from paused/game over
    blocks = []; score = 0; frames = 0; gravity = 2; spawnRate = 60; running = true; pauseBtn.textContent = 'Pause'; scoreEl.textContent = score; overlay.style.display = 'none';
    if(!muted) startMusic();
    return;
  }
  running = !running;
  pauseBtn.textContent = running ? 'Pause' : 'Resume';
  overlay.style.display = running ? 'none' : 'flex';
  if(running){ if(!muted) startMusic(); } else { stopMusic(); }
});

// Start
// start loop
requestAnimationFrame(loop);

// overlay/start handling
startBtn.addEventListener('click', ()=>{
  overlay.style.display = 'none';
  running = true; pauseBtn.textContent = 'Pause';
  if(!muted) startMusic();
});
githubBtn.addEventListener('click', ()=>{ window.open('https://github.com/Techyhub-stack/web-game','_blank'); });

// particle physics update
function updateParticles(){
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--;
    if(p.life <= 0) particles.splice(i,1);
  }
}

// integrate bg update/draw into main loop
function bgTick(){ spawnBg(); updateBg(); drawBg(); }

// integrate particles into main update
const _update = update;
update = function(){ _update(); updateParticles(); };

// small helper for high DPI
function setCanvasSize(w,h){
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
setCanvasSize(W,H);

// Prevent text selection during button press
['mousedown','touchstart'].forEach(evt => document.addEventListener(evt, e=>{ if(e.target.tagName === 'BUTTON') e.preventDefault(); }));
