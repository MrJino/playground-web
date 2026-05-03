const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("scoreText");
const lifeText = document.getElementById("lifeText");
const levelText = document.getElementById("levelText");
const typingInput = document.getElementById("typingInput");
const startPanel = document.getElementById("startPanel");
const gameOverPanel = document.getElementById("gameOverPanel");
const finalScoreText = document.getElementById("finalScoreText");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const languageButtons = document.querySelectorAll("[data-language]");
const difficultyButtons = document.querySelectorAll("[data-difficulty]");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const BASE_Y = HEIGHT - 54;
const LETTER_SETS = {
  ko: "가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후기니디리미비시이지치키티피히",
  en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
};
const WORD_SETS = {
  ko: {
    1: Array.from(LETTER_SETS.ko),
    2: ["하늘", "바다", "구름", "별빛", "달빛", "사과", "학교", "친구", "우주", "게임", "타자", "번개", "폭발", "희망"],
    3: ["바나나", "고양이", "강아지", "비행기", "컴퓨터", "미사일", "우주선", "손가락", "키보드", "별자리", "초록빛"],
    4: ["오토바이", "대한민국", "타자연습", "우주기지", "별빛축제", "로켓발사", "방어작전", "게임시작", "하늘정원"],
    5: ["미사일기지", "우주방어선", "타자연습장", "초록에너지", "하늘전투기", "별빛수호대", "로켓발사대", "키보드전사"],
  },
  en: {
    1: Array.from(LETTER_SETS.en),
    2: ["GO", "UP", "ON", "IN", "NO", "OK", "BY", "ME", "WE", "IT", "DO", "BE", "SO", "TO"],
    3: ["CAT", "SUN", "SKY", "JET", "BOX", "KEY", "MAP", "RUN", "WIN", "ORB", "RAY", "RED", "ICE"],
    4: ["MOON", "STAR", "SHIP", "FIRE", "CODE", "TYPE", "GAME", "WAVE", "BOMB", "ZONE", "NOVA", "BEAM"],
    5: ["ROBOT", "LASER", "ROCKET", "PIXEL", "ALIEN", "POWER", "ORBIT", "COMET", "TYPER", "BLAST", "SPACE"],
  },
};
const DIFFICULTIES = {
  easy: {
    label: "EASY",
    startLevel: 1,
    spawnDelay: 2600,
    minSpawnDelay: 1500,
    speedBonus: -30,
  },
  normal: {
    label: "NORMAL",
    startLevel: 1,
    spawnDelay: 2100,
    minSpawnDelay: 1150,
    speedBonus: -22,
  },
  hard: {
    label: "HARD",
    startLevel: 2,
    spawnDelay: 1650,
    minSpawnDelay: 820,
    speedBonus: -8,
  },
};

let targets = [];
let missiles = [];
let explosions = [];
let stars = [];
let score = 0;
let lives = 3;
let level = 1;
let spawnTimer = 0;
let spawnDelay = 1180;
let lastTime = 0;
let running = false;
let gameOver = false;
let currentLanguage = "ko";
let currentDifficulty = "normal";
let isComposing = false;

function resetGame() {
  const difficulty = DIFFICULTIES[currentDifficulty];
  targets = [];
  missiles = [];
  explosions = [];
  score = 0;
  lives = 3;
  level = difficulty.startLevel;
  spawnTimer = 0;
  spawnDelay = difficulty.spawnDelay;
  gameOver = false;
  updateHud();
}

function makeStars() {
  stars = Array.from({ length: 80 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    size: Math.random() > 0.78 ? 3 : 2,
    drift: 8 + Math.random() * 22,
  }));
}

function normalizeText(value) {
  const normalized = value.trim();
  return currentLanguage === "en" ? normalized.toUpperCase() : normalized;
}

function getTargetLength() {
  return Math.max(1, Math.min(5, level));
}

function randomTargetText() {
  const words = WORD_SETS[currentLanguage][getTargetLength()];
  return words[Math.floor(Math.random() * words.length)];
}

function spawnTarget() {
  const difficulty = DIFFICULTIES[currentDifficulty];
  const text = randomTargetText();
  const textLength = Array.from(text).length;
  const size = 34 + Math.floor(Math.random() * 10);
  const fontSize = Math.max(20, Math.floor(size * (textLength === 1 ? 0.72 : 0.54)));
  const width = Math.max(size + 10, textLength * fontSize * 0.72 + 30);
  targets.push({
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    text,
    x: width / 2 + 22 + Math.random() * (WIDTH - width - 44),
    y: -36,
    vy: 32 + level * 4 + difficulty.speedBonus + Math.random() * 12,
    size,
    width,
    fontSize,
    hit: false,
    wobble: Math.random() * Math.PI * 2,
  });
}

function updateHud() {
  scoreText.textContent = String(score).padStart(4, "0");
  lifeText.textContent = "★".repeat(lives) + "☆".repeat(Math.max(0, 3 - lives));
  levelText.textContent = String(level);
}

function getBarrelAim(target) {
  const pivot = {
    x: WIDTH / 2,
    y: BASE_Y - 28,
  };
  const rawAngle = target ? Math.atan2(target.y - pivot.y, target.x - pivot.x) + Math.PI / 2 : 0;
  const angle = Math.max(-1.15, Math.min(1.15, rawAngle));
  const forward = {
    x: Math.sin(angle),
    y: -Math.cos(angle),
  };

  return {
    angle,
    pivot,
    muzzle: {
      x: pivot.x + forward.x * 70,
      y: pivot.y + forward.y * 70,
    },
    missileStart: {
      x: pivot.x + forward.x * 82,
      y: pivot.y + forward.y * 82,
    },
  };
}

function startGame() {
  resetGame();
  running = true;
  document.body.classList.add("is-playing");
  startPanel.hidden = true;
  gameOverPanel.hidden = true;
  typingInput.focus();
  lastTime = performance.now();
  requestAnimationFrame(tick);
}

function endGame() {
  running = false;
  gameOver = true;
  document.body.classList.remove("is-playing");
  finalScoreText.textContent = `SCORE ${String(score).padStart(4, "0")}`;
  gameOverPanel.hidden = false;
}

function handleInput(value) {
  const text = normalizeText(value);

  if (!text || !running || gameOver) {
    typingInput.value = "";
    return;
  }

  const match = targets
    .filter((target) => !target.hit && normalizeText(target.text) === text)
    .sort((a, b) => b.y - a.y)[0];

  if (!match) {
    const hasPrefix = targets.some((target) => !target.hit && normalizeText(target.text).startsWith(text));

    if (hasPrefix) {
      return;
    }

    flashBase("#ff4f6d");
    typingInput.value = "";
    return;
  }

  typingInput.value = "";
  match.hit = true;
  const barrelAim = getBarrelAim(match);
  missiles.push({
    x: barrelAim.missileStart.x,
    y: barrelAim.missileStart.y,
    target: match,
    speed: 680,
    trail: [],
  });
}

function flashBase(color) {
  explosions.push({
    x: WIDTH / 2,
    y: BASE_Y,
    age: 0,
    life: 150,
    color,
    baseFlash: true,
  });
}

function createExplosion(x, y) {
  for (let i = 0; i < 18; i += 1) {
    const angle = (Math.PI * 2 * i) / 18;
    const speed = 70 + Math.random() * 150;
    explosions.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life: 420 + Math.random() * 220,
      color: [ "#ffd45d", "#ff7a3d", "#ff4f6d", "#f8f6d8" ][i % 4],
    });
  }
}

function tick(now) {
  if (!running) {
    draw();
    return;
  }

  const dt = Math.min(40, now - lastTime);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(tick);
}

function update(dt) {
  const difficulty = DIFFICULTIES[currentDifficulty];
  const seconds = dt / 1000;
  spawnTimer += dt;

  level = difficulty.startLevel + Math.floor(score / 16);
  spawnDelay = Math.max(difficulty.minSpawnDelay, difficulty.spawnDelay - level * 45);

  if (spawnTimer >= spawnDelay) {
    spawnTimer = 0;
    spawnTarget();
  }

  for (const star of stars) {
    star.y += star.drift * seconds;
    if (star.y > HEIGHT) {
      star.y = 0;
      star.x = Math.random() * WIDTH;
    }
  }

  for (const target of targets) {
    if (target.hit) continue;
    target.y += target.vy * seconds;
    target.wobble += seconds * 3;

    if (target.y > BASE_Y - 20) {
      target.hit = true;
      lives -= 1;
      createExplosion(target.x, BASE_Y - 8);
      updateHud();
      if (lives <= 0) {
        endGame();
      }
    }
  }

  for (const missile of missiles) {
    const target = missile.target;
    const dx = target.x - missile.x;
    const dy = target.y - missile.y;
    const distance = Math.hypot(dx, dy);
    const step = missile.speed * seconds;

    missile.trail.push({ x: missile.x, y: missile.y });
    if (missile.trail.length > 8) missile.trail.shift();

    if (distance <= step || distance < 12) {
      missile.done = true;
      target.dead = true;
      score += 1;
      updateHud();
      createExplosion(target.x, target.y);
      continue;
    }

    missile.x += (dx / distance) * step;
    missile.y += (dy / distance) * step;
  }

  for (const burst of explosions) {
    burst.age += dt;
    if (!burst.baseFlash) {
      burst.x += (burst.vx || 0) * seconds;
      burst.y += (burst.vy || 0) * seconds;
      burst.vy = (burst.vy || 0) + 160 * seconds;
    }
  }

  missiles = missiles.filter((missile) => !missile.done);
  targets = targets.filter((target) => !target.dead && target.y < HEIGHT + 60);
  explosions = explosions.filter((burst) => burst.age < burst.life);
}

function pixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawTargets();
  drawMissiles();
  drawExplosions();
  drawBase();
}

function drawBackground() {
  pixelRect(0, 0, WIDTH, HEIGHT, "#050812");

  for (const star of stars) {
    pixelRect(star.x, star.y, star.size, star.size, star.size === 3 ? "#64c7ff" : "#f8f6d8");
  }

  ctx.strokeStyle = "rgba(100, 199, 255, 0.12)";
  ctx.lineWidth = 2;
  for (let y = 78; y < HEIGHT; y += 78) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

function drawTargets() {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const target of targets) {
    if (target.dead) continue;

    const x = target.x + Math.sin(target.wobble) * 4;
    const y = target.y;
    const halfW = target.width / 2;
    const halfH = target.size / 2;
    const body = target.hit ? "#31435f" : "#1b2033";
    const border = target.hit ? "#ffd45d" : "#6dff8c";

    pixelRect(x - halfW - 5, y - halfH - 5, target.width + 10, target.size + 10, "#070913");
    pixelRect(x - halfW, y - halfH, target.width, target.size, body);
    pixelRect(x - halfW, y - halfH, target.width, 4, border);
    pixelRect(x - halfW, y + halfH - 4, target.width, 4, border);
    pixelRect(x - halfW, y - halfH, 4, target.size, border);
    pixelRect(x + halfW - 4, y - halfH, 4, target.size, border);

    ctx.font = `700 ${target.fontSize}px "Courier New", monospace`;
    ctx.fillStyle = target.hit ? "#ffd45d" : "#f8f6d8";
    ctx.fillText(target.text, x, y + 1);
  }
}

function drawMissiles() {
  for (const missile of missiles) {
    missile.trail.forEach((point, index) => {
      const alpha = (index + 1) / missile.trail.length;
      pixelRect(point.x - 3, point.y - 3, 6, 6, `rgba(255, 212, 93, ${alpha})`);
    });

    const dx = missile.target.x - missile.x;
    const dy = missile.target.y - missile.y;
    const angle = Math.atan2(dy, dx) + Math.PI / 2;

    ctx.save();
    ctx.translate(Math.round(missile.x), Math.round(missile.y));
    ctx.rotate(angle);
    pixelRect(-4, -12, 8, 18, "#f8f6d8");
    pixelRect(-7, 4, 14, 8, "#ff4f6d");
    pixelRect(-2, -18, 4, 8, "#64c7ff");
    ctx.restore();
  }
}

function drawExplosions() {
  for (const burst of explosions) {
    const progress = burst.age / burst.life;
    const size = burst.baseFlash ? 34 * (1 - progress) : 8 + 18 * (1 - progress);
    ctx.globalAlpha = Math.max(0, 1 - progress);
    pixelRect(burst.x - size / 2, burst.y - size / 2, size, size, burst.color);
    ctx.globalAlpha = 1;
  }
}

function drawBase() {
  const center = WIDTH / 2;
  const activeMissile = missiles[missiles.length - 1];
  const barrelAim = getBarrelAim(activeMissile?.target);

  pixelRect(0, BASE_Y + 20, WIDTH, HEIGHT - BASE_Y, "#111827");
  pixelRect(0, BASE_Y + 20, WIDTH, 6, "#64c7ff");
  pixelRect(0, BASE_Y + 64, WIDTH, 4, "rgba(100, 199, 255, 0.32)");

  pixelRect(center - 148, BASE_Y + 26, 296, 70, "#070913");
  pixelRect(center - 136, BASE_Y + 18, 272, 70, "#24304a");
  pixelRect(center - 118, BASE_Y + 30, 236, 14, "#46506e");
  pixelRect(center - 110, BASE_Y + 52, 220, 8, "#64c7ff");
  pixelRect(center - 92, BASE_Y + 68, 184, 8, "#147a37");

  pixelRect(center - 58, BASE_Y - 4, 116, 34, "#070913");
  pixelRect(center - 48, BASE_Y - 14, 96, 40, "#46506e");
  pixelRect(center - 34, BASE_Y - 28, 68, 24, "#1b2033");

  ctx.save();
  ctx.translate(barrelAim.pivot.x, barrelAim.pivot.y);
  ctx.rotate(barrelAim.angle);
  pixelRect(-18, -6, 36, 16, "#070913");
  pixelRect(-14, -10, 28, 18, "#64c7ff");
  pixelRect(-12, -48, 24, 44, "#070913");
  pixelRect(-9, -46, 18, 42, "#6dff8c");
  pixelRect(-5, -64, 10, 18, "#f8f6d8");
  pixelRect(-6, -66, 12, 7, "#070913");
  if (activeMissile) {
    pixelRect(-10, -74, 20, 8, "#ffd45d");
  }
  ctx.restore();

  pixelRect(center - 150, BASE_Y + 12, 42, 18, "#ff4f6d");
  pixelRect(center + 108, BASE_Y + 12, 42, 18, "#ff4f6d");
  pixelRect(center - 168, BASE_Y + 36, 28, 10, "#ffd45d");
  pixelRect(center + 140, BASE_Y + 36, 28, 10, "#ffd45d");
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

typingInput.addEventListener("input", (event) => {
  if (isComposing || event.isComposing) {
    return;
  }

  handleInput(event.target.value);
});

typingInput.addEventListener("compositionstart", () => {
  isComposing = true;
});

typingInput.addEventListener("compositionend", (event) => {
  isComposing = false;
  handleInput(event.target.value);
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentLanguage = button.dataset.language;
    languageButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    typingInput.lang = currentLanguage;
    typingInput.value = "";
  });
});

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentDifficulty = button.dataset.difficulty;
    difficultyButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    level = DIFFICULTIES[currentDifficulty].startLevel;
    updateHud();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.isComposing) {
    return;
  }

  if (event.key === "Enter" && (!running || gameOver)) {
    startGame();
    return;
  }

  if (event.key === "Escape" && running) {
    running = false;
    document.body.classList.remove("is-playing");
    startPanel.hidden = false;
    return;
  }

  typingInput.focus();
});

window.addEventListener("pointerdown", () => {
  typingInput.focus();
});

makeStars();
resetGame();
draw();
