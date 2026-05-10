const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreText = document.getElementById('scoreText');
const lifeText = document.getElementById('lifeText');
const levelText = document.getElementById('levelText');
const selectedMenuText = document.getElementById('selectedMenuText');
const typingInput = document.getElementById('typingInput');
const startPanel = document.getElementById('startPanel');
const startPanelMenuText = document.getElementById('startPanelMenuText');
const gameOverPanel = document.getElementById('gameOverPanel');
const finalScoreText = document.getElementById('finalScoreText');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const menuPanel = document.getElementById('menuPanel');
const historyPanel = document.getElementById('historyPanel');
const mobilePanelBackdrop = document.getElementById('mobilePanelBackdrop');
const openMobileMenuButton = document.getElementById('openMobileMenuButton');
const openMobileHistoryButton = document.getElementById('openMobileHistoryButton');
const languageButtons = document.querySelectorAll('[data-language]');
const wordMenuButtons = document.querySelectorAll('[data-word-menu]');
const historyList = document.getElementById('historyList');
const clearHistoryButton = document.getElementById('clearHistoryButton');
const confirmModal = document.getElementById('confirmModal');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const cancelConfirmButton = document.getElementById('cancelConfirmButton');
const acceptConfirmButton = document.getElementById('acceptConfirmButton');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const BASE_Y = HEIGHT - 54;
const DEFENSE_LINE_Y = BASE_Y - 8;
const BASE_SURFACE_Y = BASE_Y;
const GAME_HISTORY_STORAGE_KEY = 'typing-game-history';
const MAX_HISTORY_ITEMS = 20;
const LETTER_SETS = {
  ko: '가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후기니디리미비시이지치키티피히',
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
};
const WORD_SETS_URL = './res/words.json';
const MOBILE_PANEL_MEDIA_QUERY = '(max-width: 720px)';
let wordSets = {};
let wordSetsLoadPromise = null;
const HANGUL_CHO = [0, 2, 3, 5, 6, 7, 9, 11, 12, 14, 15, 16, 17, 18];
const HANGUL_JUNG = [0, 2, 4, 6, 8, 13, 18, 20];
const HANGUL_JONG = [1, 4, 8, 16, 17, 21];
const GAME_SPEED = {
  startLevel: 1,
  spawnDelay: 2100,
  minSpawnDelay: 1150,
  speedBonus: -22,
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
let currentLanguage = 'ko';
let currentWordMenu = 'boy-idol-name';
let isComposing = false;
let pendingMenuButton = null;
let isPausedForConfirm = false;
let audioContext = null;
let musicTimer = null;
let musicStep = 0;

const MUSIC_BPM = 138;
const MUSIC_STEP_SECONDS = 60 / MUSIC_BPM / 2;
const MUSIC_MELODY = [784, 0, 784, 880, 988, 0, 880, 784, 659, 0, 659, 740, 784, 0, 587, 659];
const MUSIC_BASS = [196, 196, 247, 247, 220, 220, 165, 165];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeWordSetsData(data) {
  if (!data || !Array.isArray(data.items)) {
    return {};
  }

  return data.items.reduce((sets, item) => {
    if (item?.id && item.words && typeof item.words === 'object') {
      sets[item.id] = item.words;
    }

    return sets;
  }, {});
}

function loadWordSets() {
  if (wordSetsLoadPromise) {
    return wordSetsLoadPromise;
  }

  wordSetsLoadPromise = fetch(WORD_SETS_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${WORD_SETS_URL}: ${response.status}`);
      }

      return response.json();
    })
    .then((data) => {
      wordSets = normalizeWordSetsData(data);
      return wordSets;
    })
    .catch((error) => {
      console.error('Failed to load typing game word sets.', error);
      wordSets = {};
      return wordSets;
    });

  return wordSetsLoadPromise;
}

function readHistory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GAME_HISTORY_STORAGE_KEY) || '[]');

    if (Array.isArray(parsed)) {
      return parsed.reduce((histories, item) => {
        const menuValue = item.menuValue || 'food';
        const language = item.language || 'ko';
        histories[menuValue] = histories[menuValue] || {};
        histories[menuValue][language] = histories[menuValue][language] || [];
        histories[menuValue][language].push(item);
        return histories;
      }, {});
    }

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return Object.entries(parsed).reduce((histories, [menuValue, menuHistory]) => {
      if (Array.isArray(menuHistory)) {
        histories[menuValue] = { ko: menuHistory };
        return histories;
      }

      histories[menuValue] = menuHistory && typeof menuHistory === 'object' ? menuHistory : {};
      return histories;
    }, {});
  } catch (error) {
    console.error('Failed to parse typing game history.', error);
    return {};
  }
}

function writeHistory(histories) {
  window.localStorage.setItem(GAME_HISTORY_STORAGE_KEY, JSON.stringify(histories));
}

function getCurrentMenuHistory(histories = readHistory()) {
  const items = histories[currentWordMenu]?.[currentLanguage];
  return Array.isArray(items) ? items : [];
}

function writeCurrentMenuHistory(items) {
  const histories = readHistory();
  histories[currentWordMenu] = histories[currentWordMenu] || {};
  histories[currentWordMenu][currentLanguage] = items;
  writeHistory(histories);
}

function getWordMenuLabel(menuValue = currentWordMenu) {
  return document.querySelector(`[data-word-menu="${menuValue}"]`)?.textContent?.trim() || menuValue;
}

function getWordMenuButtonLabel(button) {
  return button?.textContent?.trim() || '선택한 메뉴';
}

function updateSelectedMenuText() {
  const menuLabel = getWordMenuLabel();
  selectedMenuText.textContent = menuLabel;
  startPanelMenuText.textContent = menuLabel;
}

function getWordMenuButton(menuValue) {
  return document.querySelector(`[data-word-menu="${menuValue}"]`);
}

function updateMenuQueryParam(menuValue) {
  const url = new URL(window.location.href);
  url.searchParams.set('menu', menuValue);
  window.history.pushState({ menu: menuValue }, '', url);
}

function showStartScreen() {
  running = false;
  gameOver = false;
  stopMusic();
  resetGame();
  document.body.classList.remove('is-playing');
  startPanel.hidden = false;
  gameOverPanel.hidden = true;
  typingInput.value = '';
}

function selectWordMenu(button, options = {}) {
  currentWordMenu = button.dataset.wordMenu;
  wordMenuButtons.forEach((item) => {
    const isActive = item === button;
    item.classList.toggle('is-active', isActive);
    item.setAttribute('aria-current', isActive ? 'true' : 'false');
  });

  if (options.updateUrl !== false) {
    updateMenuQueryParam(currentWordMenu);
  }

  typingInput.value = '';
  updateSelectedMenuText();
  renderHistory();
}

function applyMenuFromQueryParam() {
  const menuValue = new URLSearchParams(window.location.search).get('menu');
  const button = getWordMenuButton(menuValue);

  if (button) {
    selectWordMenu(button, { updateUrl: false });
  }
}

function isMobilePanelLayout() {
  return window.matchMedia(MOBILE_PANEL_MEDIA_QUERY).matches;
}

function isMobileGameLayout() {
  return window.matchMedia(MOBILE_PANEL_MEDIA_QUERY).matches;
}

function updateAppViewportHeight() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
}

function setMobileNavState(activePanel) {
  const isMenuOpen = activePanel === 'menu';
  const isHistoryOpen = activePanel === 'history';

  openMobileMenuButton?.classList.toggle('is-active', isMenuOpen);
  openMobileMenuButton?.setAttribute('aria-expanded', String(isMenuOpen));
  openMobileHistoryButton?.classList.toggle('is-active', isHistoryOpen);
  openMobileHistoryButton?.setAttribute('aria-expanded', String(isHistoryOpen));
}

function closeMobilePanels() {
  menuPanel?.classList.remove('is-mobile-panel-open');
  historyPanel?.classList.remove('is-mobile-panel-open');
  document.body.classList.remove('mobile-panel-open');
  setMobileNavState(null);

  if (mobilePanelBackdrop) {
    mobilePanelBackdrop.hidden = true;
  }
}

function hasOpenMobilePanel() {
  return Boolean(menuPanel?.classList.contains('is-mobile-panel-open') || historyPanel?.classList.contains('is-mobile-panel-open'));
}

function openMobilePanel(panelName) {
  if (!isMobilePanelLayout()) {
    return;
  }

  const isMenuPanel = panelName === 'menu';
  const activePanel = isMenuPanel ? menuPanel : historyPanel;
  const inactivePanel = isMenuPanel ? historyPanel : menuPanel;
  const isAlreadyOpen = activePanel?.classList.contains('is-mobile-panel-open');

  if (isAlreadyOpen) {
    closeMobilePanels();
    return;
  }

  inactivePanel?.classList.remove('is-mobile-panel-open');
  activePanel?.classList.add('is-mobile-panel-open');
  document.body.classList.add('mobile-panel-open');
  setMobileNavState(panelName);

  if (mobilePanelBackdrop) {
    mobilePanelBackdrop.hidden = false;
  }
}

function openMenuConfirm(button) {
  pendingMenuButton = button;
  isPausedForConfirm = true;
  confirmModalMessage.textContent = `${getWordMenuButtonLabel(button)} 새로운 게임을 진행하시겠습니까?`;
  confirmModal.hidden = false;
  acceptConfirmButton.focus();
}

function closeMenuConfirm() {
  pendingMenuButton = null;
  isPausedForConfirm = false;
  confirmModal.hidden = true;
  if (running && !gameOver) {
    lastTime = performance.now();
    typingInput.focus();
  }
}

function formatPlayedAt(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderHistory() {
  const items = getCurrentMenuHistory();

  if (items.length === 0) {
    historyList.innerHTML = `<div class="history-empty">${escapeHtml(getWordMenuLabel())} 기록이 없습니다.</div>`;
    return;
  }

  historyList.innerHTML = items
    .map(
      (item) => `
        <article class="history-card">
          <div class="history-card__meta">
            <time datetime="${escapeHtml(item.playedAt)}">${escapeHtml(formatPlayedAt(item.playedAt))}</time>
            <button class="history-card__delete" type="button" data-delete-history="${escapeHtml(item.id)}">삭제</button>
          </div>
          <h3>SCORE ${String(item.score).padStart(4, '0')}</h3>
          <p>LEVEL ${escapeHtml(item.level)}</p>
        </article>
      `,
    )
    .join('');
}

function saveHistoryEntry() {
  const entry = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    score,
    level,
    language: currentLanguage,
    menuValue: currentWordMenu,
    menuLabel: getWordMenuLabel(currentWordMenu),
    playedAt: new Date().toISOString(),
  };
  const nextItems = [entry, ...getCurrentMenuHistory()].slice(0, MAX_HISTORY_ITEMS);
  writeCurrentMenuHistory(nextItems);
  renderHistory();
}

function getAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  return audioContext;
}

function playTone(frequency, startTime, duration, volume, type = 'square') {
  const context = getAudioContext();

  if (!context || !frequency) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function scheduleMusicStep() {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const startTime = context.currentTime + 0.03;
  const melody = MUSIC_MELODY[musicStep % MUSIC_MELODY.length];
  const bass = MUSIC_BASS[Math.floor(musicStep / 2) % MUSIC_BASS.length];

  playTone(bass, startTime, MUSIC_STEP_SECONDS * 0.9, 0.018, 'square');

  if (melody) {
    playTone(melody, startTime, MUSIC_STEP_SECONDS * 0.45, 0.012, 'square');
    playTone(melody * 2, startTime + 0.012, MUSIC_STEP_SECONDS * 0.28, 0.004, 'triangle');
  }

  musicStep += 1;
}

function startMusic() {
  const context = getAudioContext();

  if (!context || musicTimer) {
    return;
  }

  context.resume();
  musicStep = 0;
  scheduleMusicStep();
  musicTimer = window.setInterval(scheduleMusicStep, MUSIC_STEP_SECONDS * 1000);
}

function stopMusic() {
  if (musicTimer) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}

function playLaunchSound() {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const startTime = context.currentTime;
  playTone(392, startTime, 0.06, 0.035, 'square');
  playTone(784, startTime + 0.035, 0.08, 0.025, 'triangle');
  playTone(1175, startTime + 0.075, 0.04, 0.014, 'square');
}

function playHitSound() {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const startTime = context.currentTime;
  playTone(1047, startTime, 0.07, 0.034, 'square');
  playTone(1568, startTime + 0.035, 0.06, 0.024, 'triangle');
  playTone(523, startTime + 0.08, 0.1, 0.02, 'square');
}

function resetGame() {
  targets = [];
  missiles = [];
  explosions = [];
  score = 0;
  lives = 3;
  level = GAME_SPEED.startLevel;
  spawnTimer = 0;
  spawnDelay = GAME_SPEED.spawnDelay;
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
  return currentLanguage === 'en' ? normalized.toUpperCase() : normalized;
}

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getWordSetForCurrentMenu(language, wordLevel) {
  if (currentWordMenu === 'all') {
    return Object.entries(wordSets)
      .filter(([key]) => key !== 'en')
      .flatMap(([, set]) => set[language]?.[wordLevel] || []);
  }

  return wordSets[currentWordMenu]?.[language]?.[wordLevel] || [];
}

function getKoreanLevelSpec() {
  let remainingLevel = level;

  for (let syllableCount = 1; syllableCount <= 5; syllableCount += 1) {
    const steps = syllableCount + 1;

    if (remainingLevel <= steps) {
      return {
        syllableCount,
        batchimCount: remainingLevel - 1,
      };
    }

    remainingLevel -= steps;
  }

  return {
    syllableCount: 5,
    batchimCount: 5,
  };
}

function composeHangulSyllable(hasBatchim) {
  const cho = randomFrom(HANGUL_CHO);
  const jung = randomFrom(HANGUL_JUNG);
  const jong = hasBatchim ? randomFrom(HANGUL_JONG) : 0;

  return String.fromCharCode(0xac00 + (cho * 21 + jung) * 28 + jong);
}

function randomKoreanTargetText() {
  const words = getWordSetForCurrentMenu('ko', Math.max(1, Math.min(5, level)));

  if (words.length > 0) {
    return words[Math.floor(Math.random() * words.length)];
  }

  const { syllableCount, batchimCount } = getKoreanLevelSpec();
  const batchimSlots = new Set();

  while (batchimSlots.size < batchimCount) {
    batchimSlots.add(Math.floor(Math.random() * syllableCount));
  }

  return Array.from({ length: syllableCount }, (_, index) => composeHangulSyllable(batchimSlots.has(index))).join('');
}

function getEnglishTargetLength() {
  return Math.max(1, Math.min(5, level));
}

function randomTargetText() {
  if (currentLanguage === 'ko') {
    return randomKoreanTargetText();
  }

  const words = getWordSetForCurrentMenu('en', getEnglishTargetLength());
  const fallbackWords = words.length > 0 ? words : wordSets.en?.en?.[getEnglishTargetLength()] || Array.from(LETTER_SETS.en);
  return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
}

function spawnTarget() {
  const text = randomTargetText();
  const textLength = Array.from(text).length;
  const targetScale = isMobileGameLayout() ? 1.22 : 1;
  const size = Math.floor((34 + Math.floor(Math.random() * 10)) * targetScale);
  const fontSize = Math.max(20, Math.floor(size * (textLength === 1 ? 0.72 : 0.54)));
  const width = Math.max(size + 10, textLength * fontSize * 0.72 + 30);
  targets.push({
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    text,
    x: width / 2 + 22 + Math.random() * (WIDTH - width - 44),
    y: -36,
    vy: 32 + level * 4 + GAME_SPEED.speedBonus + Math.random() * 12,
    size,
    width,
    fontSize,
    hit: false,
    wobble: Math.random() * Math.PI * 2,
  });
}

function updateHud() {
  scoreText.textContent = String(score).padStart(4, '0');
  lifeText.textContent = '★'.repeat(lives) + '☆'.repeat(Math.max(0, 3 - lives));
  levelText.textContent = String(level);
}

function getBarrelAim(target) {
  const pivot = {
    x: WIDTH / 2,
    y: BASE_Y - 16,
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
      x: pivot.x + forward.x * 54,
      y: pivot.y + forward.y * 54,
    },
    missileStart: {
      x: pivot.x + forward.x * 64,
      y: pivot.y + forward.y * 64,
    },
  };
}

async function startGame() {
  await loadWordSets();
  resetGame();
  running = true;
  startMusic();
  document.body.classList.add('is-playing');
  startPanel.hidden = true;
  gameOverPanel.hidden = true;
  typingInput.focus();
  lastTime = performance.now();
  requestAnimationFrame(tick);
}

function endGame() {
  running = false;
  gameOver = true;
  stopMusic();
  document.body.classList.remove('is-playing');
  finalScoreText.textContent = `SCORE ${String(score).padStart(4, '0')}`;
  gameOverPanel.hidden = false;
  saveHistoryEntry();
}

function handleInput(value) {
  const text = normalizeText(value);

  if (!text || !running || gameOver) {
    typingInput.value = '';
    return;
  }

  const match = targets.filter((target) => !target.hit && normalizeText(target.text) === text).sort((a, b) => b.y - a.y)[0];

  if (!match) {
    flashBase('#ff4f6d');
    typingInput.value = '';
    return;
  }

  typingInput.value = '';
  match.hit = true;
  const barrelAim = getBarrelAim(match);
  missiles.push({
    x: barrelAim.missileStart.x,
    y: barrelAim.missileStart.y,
    target: match,
    speed: 680,
    trail: [],
  });
  playLaunchSound();
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
      color: ['#ffd45d', '#ff7a3d', '#ff4f6d', '#f8f6d8'][i % 4],
    });
  }
}

function tick(now) {
  if (!running) {
    draw();
    return;
  }

  if (isPausedForConfirm) {
    lastTime = now;
    draw();
    requestAnimationFrame(tick);
    return;
  }

  const dt = Math.min(40, now - lastTime);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(tick);
}

function update(dt) {
  const seconds = dt / 1000;
  spawnTimer += dt;

  level = GAME_SPEED.startLevel + Math.floor(score / 16);
  spawnDelay = Math.max(GAME_SPEED.minSpawnDelay, GAME_SPEED.spawnDelay - level * 45);

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

    if (target.y > DEFENSE_LINE_Y) {
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
      playHitSound();
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
  pixelRect(0, 0, WIDTH, HEIGHT, '#050812');

  for (const star of stars) {
    pixelRect(star.x, star.y, star.size, star.size, star.size === 3 ? '#64c7ff' : '#f8f6d8');
  }

  ctx.strokeStyle = 'rgba(100, 199, 255, 0.12)';
  ctx.lineWidth = 2;
  for (let y = 78; y < HEIGHT; y += 78) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

function drawTargets() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const target of targets) {
    if (target.dead) continue;

    const x = target.x + Math.sin(target.wobble) * 4;
    const y = target.y;
    const halfW = target.width / 2;
    const halfH = target.size / 2;
    const body = target.hit ? '#31435f' : '#1b2033';
    const border = target.hit ? '#ffd45d' : '#6dff8c';

    pixelRect(x - halfW - 5, y - halfH - 5, target.width + 10, target.size + 10, '#070913');
    pixelRect(x - halfW, y - halfH, target.width, target.size, body);
    pixelRect(x - halfW, y - halfH, target.width, 4, border);
    pixelRect(x - halfW, y + halfH - 4, target.width, 4, border);
    pixelRect(x - halfW, y - halfH, 4, target.size, border);
    pixelRect(x + halfW - 4, y - halfH, 4, target.size, border);

    ctx.font = `700 ${target.fontSize}px "Courier New", monospace`;
    ctx.fillStyle = target.hit ? '#ffd45d' : '#f8f6d8';
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
    pixelRect(-4, -12, 8, 18, '#f8f6d8');
    pixelRect(-7, 4, 14, 8, '#ff4f6d');
    pixelRect(-2, -18, 4, 8, '#64c7ff');
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

function drawLauncherDome(center) {
  pixelRect(center - 54, BASE_Y + 8, 108, 18, '#070913');
  pixelRect(center - 46, BASE_Y - 4, 92, 18, '#070913');
  pixelRect(center - 36, BASE_Y - 16, 72, 16, '#070913');
  pixelRect(center - 24, BASE_Y - 26, 48, 12, '#070913');

  pixelRect(center - 44, BASE_Y + 8, 88, 12, '#46506e');
  pixelRect(center - 36, BASE_Y - 2, 72, 14, '#46506e');
  pixelRect(center - 26, BASE_Y - 13, 52, 12, '#24304a');
  pixelRect(center - 16, BASE_Y - 22, 32, 8, '#1b2033');
}

function drawBarrelSocket() {
  ctx.fillStyle = '#64c7ff';
  ctx.beginPath();
  ctx.arc(0, -2, 13, Math.PI, 0);
  ctx.lineTo(13, 5);
  ctx.arc(0, 5, 13, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
}

function drawBase() {
  const center = WIDTH / 2;
  const activeMissile = missiles[missiles.length - 1];
  const barrelAim = getBarrelAim(activeMissile?.target);

  pixelRect(0, BASE_SURFACE_Y, WIDTH, HEIGHT - BASE_SURFACE_Y, '#111827');
  pixelRect(0, BASE_SURFACE_Y, WIDTH, 5, '#64c7ff');
  pixelRect(0, BASE_Y + 54, WIDTH, 4, 'rgba(100, 199, 255, 0.32)');

  pixelRect(center - 128, BASE_Y + 28, 256, 48, '#070913');
  pixelRect(center - 118, BASE_Y + 22, 236, 48, '#24304a');
  pixelRect(center - 102, BASE_Y + 32, 204, 11, '#46506e');
  pixelRect(center - 96, BASE_Y + 46, 192, 7, '#64c7ff');
  pixelRect(center - 80, BASE_Y + 58, 160, 7, '#147a37');

  drawLauncherDome(center);

  ctx.save();
  ctx.translate(barrelAim.pivot.x, barrelAim.pivot.y);
  ctx.rotate(barrelAim.angle);
  drawBarrelSocket();
  pixelRect(-9, -36, 18, 32, '#070913');
  pixelRect(-7, -34, 14, 30, '#6dff8c');
  pixelRect(-4, -48, 8, 14, '#f8f6d8');
  pixelRect(-5, -50, 10, 6, '#070913');
  ctx.restore();

  pixelRect(center - 132, BASE_Y + 14, 34, 14, '#ff4f6d');
  pixelRect(center + 98, BASE_Y + 14, 34, 14, '#ff4f6d');
  pixelRect(center - 148, BASE_Y + 34, 22, 8, '#ffd45d');
  pixelRect(center + 126, BASE_Y + 34, 22, 8, '#ffd45d');
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

typingInput.addEventListener('compositionstart', () => {
  isComposing = true;
});

typingInput.addEventListener('compositionend', () => {
  isComposing = false;
});

languageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentLanguage = button.dataset.language;
    languageButtons.forEach((item) => item.classList.toggle('is-active', item === button));
    typingInput.lang = currentLanguage;
    typingInput.value = '';
    renderHistory();
  });
});

wordMenuButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.wordMenu === currentWordMenu) {
      return;
    }

    if (running) {
      openMenuConfirm(button);
      return;
    }

    selectWordMenu(button);
    showStartScreen();
    closeMobilePanels();
  });
});

cancelConfirmButton.addEventListener('click', closeMenuConfirm);

confirmModal.addEventListener('click', (event) => {
  if (event.target.closest('[data-close-confirm-modal]')) {
    closeMenuConfirm();
  }
});

acceptConfirmButton.addEventListener('click', () => {
  if (!pendingMenuButton) {
    closeMenuConfirm();
    return;
  }

  const nextMenuButton = pendingMenuButton;
  isPausedForConfirm = false;
  confirmModal.hidden = true;
  pendingMenuButton = null;
  selectWordMenu(nextMenuButton);
  showStartScreen();
  closeMobilePanels();
});

openMobileMenuButton?.addEventListener('click', () => {
  openMobilePanel('menu');
});

openMobileHistoryButton?.addEventListener('click', () => {
  openMobilePanel('history');
});

mobilePanelBackdrop?.addEventListener('click', () => {
  closeMobilePanels();
});

window.addEventListener('resize', () => {
  updateAppViewportHeight();

  if (!isMobilePanelLayout()) {
    closeMobilePanels();
  }
});

window.visualViewport?.addEventListener('resize', updateAppViewportHeight);
window.visualViewport?.addEventListener('scroll', updateAppViewportHeight);

historyList.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('[data-delete-history]');

  if (!deleteButton) {
    return;
  }

  writeCurrentMenuHistory(getCurrentMenuHistory().filter((item) => item.id !== deleteButton.dataset.deleteHistory));
  renderHistory();
});

clearHistoryButton.addEventListener('click', () => {
  writeCurrentMenuHistory([]);
  renderHistory();
});

document.addEventListener('keydown', (event) => {
  if (event.isComposing) {
    return;
  }

  if (event.key === 'Escape' && hasOpenMobilePanel()) {
    closeMobilePanels();
    return;
  }

  if (event.key === 'Escape' && !confirmModal.hidden) {
    closeMenuConfirm();
    return;
  }

  if (!confirmModal.hidden) {
    return;
  }

  if (event.key === 'Enter' && (!running || gameOver)) {
    startGame();
    return;
  }

  if (event.key === 'Enter' && running) {
    event.preventDefault();
    handleInput(typingInput.value);
    return;
  }

  if (event.key === 'Escape' && running) {
    running = false;
    stopMusic();
    document.body.classList.remove('is-playing');
    startPanel.hidden = false;
    return;
  }

  typingInput.focus();
});

window.addEventListener('pointerdown', (event) => {
  if (event.target.closest('.mobile-nav, .menu-panel, .history-panel, .confirm-modal')) {
    return;
  }

  if (!running) {
    return;
  }

  typingInput.focus();
});

makeStars();
updateAppViewportHeight();
resetGame();
applyMenuFromQueryParam();
updateSelectedMenuText();
loadWordSets();
renderHistory();
draw();
