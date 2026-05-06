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
const wordMenuButtons = document.querySelectorAll("[data-word-menu]");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistoryButton");
const confirmModal = document.getElementById("confirmModal");
const confirmModalMessage = document.getElementById("confirmModalMessage");
const cancelConfirmButton = document.getElementById("cancelConfirmButton");
const acceptConfirmButton = document.getElementById("acceptConfirmButton");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const BASE_Y = HEIGHT - 54;
const GAME_HISTORY_STORAGE_KEY = "typing-game-history";
const MAX_HISTORY_ITEMS = 20;
const LETTER_SETS = {
  ko: "가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후기니디리미비시이지치키티피히",
  en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
};
const WORD_SETS = {
  "boy-idol-name": {
    ko: {
      1: ["뷔", "진", "정국", "지민", "슈가", "알엠", "차은우", "백현"],
      2: ["제이홉", "민규", "도겸", "원우", "호시", "연준", "수빈", "범규"],
      3: ["박지훈", "한유진", "김지웅", "김태형", "김석진", "전정국", "박지민", "민윤기"],
      4: ["차은우", "황민현", "강다니엘", "이도현", "최연준", "최수빈", "김남준"],
      5: ["방탄소년단뷔", "방탄소년단진", "방탄소년단정국", "세븐틴민규", "투모로우바이투게더연준"],
    },
    en: {
      1: ["V", "JIN", "JUNGKOOK", "JIMIN", "SUGA", "RM", "BAEKHYUN"],
      2: ["JHOPE", "MINGYU", "DK", "WONWOO", "HOSHI", "YEONJUN", "SOOBIN"],
      3: ["PARKJIHOON", "HANYUJIN", "KIMJIWOONG", "CHAEUNWOO", "HWANGMINHYUN"],
      4: ["KANGDANIEL", "KIMTAEHYUNG", "KIMSEOKJIN", "JEONJUNGKOOK", "PARKJIMIN"],
      5: ["BTSJUNGKOOK", "SEVENTEENMINGYU", "TXTYEONJUN", "ZEROBASEONEHANYUJIN"],
    },
  },
  "girl-idol-name": {
    ko: {
      1: ["장원영", "안유진", "카리나", "윈터", "민지", "하니", "해린", "태연"],
      2: ["리즈", "레이", "가을", "이서", "지젤", "닝닝", "다니엘", "혜인"],
      3: ["김채원", "사쿠라", "허윤진", "카즈하", "홍은채", "아이린", "슬기", "조이"],
      4: ["제니", "지수", "로제", "리사", "나연", "정연", "모모", "사나"],
      5: ["아이브장원영", "아이브안유진", "에스파카리나", "뉴진스민지", "르세라핌김채원"],
    },
    en: {
      1: ["WONYOUNG", "YUJIN", "KARINA", "WINTER", "MINJI", "HANNI", "HAERIN", "TAEYEON"],
      2: ["LIZ", "REI", "GAEUL", "LEESEO", "GISELLE", "NINGNING", "DANIELLE", "HYEIN"],
      3: ["KIMCHAEWON", "SAKURA", "HUHYUNJIN", "KAZUHA", "HONGEUNCHAE"],
      4: ["JENNIE", "JISOO", "ROSE", "LISA", "NAYEON", "JEONGYEON", "MOMO", "SANA"],
      5: ["IVEWONYOUNG", "IVEYUJIN", "AESPAKARINA", "NEWJEANSMINJI", "LESSERAFIMCHAEWON"],
    },
  },
  food: {
    ko: {
      1: ["밥", "국", "물", "빵", "면", "죽", "떡", "차"],
      2: ["김밥", "라면", "우동", "만두", "피자", "치킨", "국수", "갈비", "카레", "초밥"],
      3: ["된장국", "김치전", "비빔밥", "떡볶이", "샌드위치", "스파게티", "오므라이스", "짜장면"],
      4: ["부대찌개", "김치찌개", "감자탕", "삼계탕", "해물파전", "불고기덮밥", "치즈버거"],
      5: ["제육볶음", "닭갈비볶음", "고등어구이", "순두부찌개", "콩나물국밥", "크림파스타"],
    },
    en: {
      1: ["RICE", "SOUP", "BREAD", "NOODLE", "CAKE", "MILK", "TEA", "MEAT"],
      2: ["PIZZA", "PASTA", "BURGER", "SALAD", "SUSHI", "CURRY", "STEAK", "TOAST"],
      3: ["CHICKEN", "PANCAKE", "DUMPLING", "SAUSAGE", "OMELET", "COOKIE", "KIMCHI"],
      4: ["SANDWICH", "SPAGHETTI", "BIBIMBAP", "RAMEN", "SEAFOOD", "HOTDOG"],
      5: ["TTEOKBOKKI", "CHEESEBURGER", "FRIEDCHICKEN", "KIMCHISTEW", "BULGOGI"],
    },
  },
  mood: {
    ko: {
      1: ["행복", "기쁨", "슬픔", "분노", "평온", "불안", "설렘", "외로움"],
      2: ["즐거움", "쓸쓸함", "뿌듯함", "답답함", "상쾌함", "긴장감", "포근함", "후련함"],
      3: ["자신감", "우울함", "무기력", "만족감", "불편함", "안도감", "초조함", "서운함"],
      4: ["행복하다", "기분좋다", "속상하다", "화가난다", "마음편함", "두근두근", "울적하다"],
      5: ["기대된다", "불안하다", "편안하다", "신난다", "부끄럽다", "감동이다", "짜증난다"],
    },
    en: {
      1: ["HAPPY", "SAD", "ANGRY", "CALM", "PROUD", "TIRED", "LONELY", "EXCITED"],
      2: ["JOYFUL", "WORRIED", "RELAXED", "NERVOUS", "BORED", "PEACEFUL", "UPSET"],
      3: ["CONFIDENT", "ANXIOUS", "GRATEFUL", "ASHAMED", "RELIEVED", "JEALOUS"],
      4: ["DELIGHTED", "FRUSTRATED", "DEPRESSED", "HOPEFUL", "RESTLESS"],
      5: ["OVERWHELMED", "DISAPPOINTED", "EMBARRASSED", "SATISFIED"],
    },
  },
  animal: {
    ko: {
      1: ["개", "고양이", "소", "말", "양", "돼지", "닭", "오리"],
      2: ["토끼", "사자", "호랑이", "기린", "코끼리", "원숭이", "여우", "늑대"],
      3: ["다람쥐", "고슴도치", "너구리", "펭귄", "돌고래", "악어", "하마", "캥거루"],
      4: ["북극곰", "수달", "알파카", "치타", "얼룩말", "코알라", "판다", "바다표범"],
      5: ["침팬지", "플라밍고", "카멜레온", "오랑우탄", "사막여우", "청설모"],
    },
    en: {
      1: ["DOG", "CAT", "COW", "HORSE", "SHEEP", "PIG", "DUCK", "BIRD"],
      2: ["RABBIT", "LION", "TIGER", "GIRAFFE", "MONKEY", "WOLF", "FOX", "BEAR"],
      3: ["SQUIRREL", "PENGUIN", "DOLPHIN", "CROCODILE", "KANGAROO", "HAMSTER"],
      4: ["ELEPHANT", "CHEETAH", "ZEBRA", "KOALA", "PANDA", "SEAL"],
      5: ["CHIMPANZEE", "FLAMINGO", "CHAMELEON", "ORANGUTAN"],
    },
  },
  transport: {
    ko: {
      1: ["차", "배", "기차", "버스", "택시", "지하철", "자전거", "비행기"],
      2: ["승용차", "트럭", "오토바이", "스쿠터", "전철", "고속버스", "여객선", "헬기"],
      3: ["구급차", "소방차", "경찰차", "화물차", "전기차", "캠핑카", "유람선", "요트"],
      4: ["고속철도", "통근열차", "마을버스", "시외버스", "화물열차", "경비행기"],
      5: ["자동차", "수상택시", "공항버스", "관광버스", "자기부상열차", "컨테이너선"],
    },
    en: {
      1: ["CAR", "BUS", "TAXI", "TRAIN", "SHIP", "BIKE", "PLANE", "BOAT"],
      2: ["TRUCK", "SUBWAY", "SCOOTER", "FERRY", "HELICOPTER", "VAN"],
      3: ["AMBULANCE", "FIRETRUCK", "POLICECAR", "AIRPLANE", "BICYCLE", "YACHT"],
      4: ["MOTORCYCLE", "SAILBOAT", "SPEEDBOAT", "AIRPORTBUS", "CAMPERVAN"],
      5: ["HIGHSPEEDTRAIN", "CONTAINERSHIP", "ELECTRICCAR", "FREIGHTTRAIN"],
    },
  },
  country: {
    ko: {
      1: ["한국", "미국", "일본", "중국", "영국", "독일", "프랑스", "호주"],
      2: ["캐나다", "브라질", "인도", "베트남", "태국", "스페인", "이탈리아", "멕시코"],
      3: ["그리스", "스웨덴", "노르웨이", "핀란드", "덴마크", "스위스", "폴란드", "튀르키예"],
      4: ["뉴질랜드", "아르헨티나", "인도네시아", "필리핀", "싱가포르", "네덜란드"],
      5: ["사우디아라비아", "아랍에미리트", "남아프리카공화국", "체코공화국"],
    },
    en: {
      1: ["KOREA", "JAPAN", "CHINA", "INDIA", "FRANCE", "GERMANY", "CANADA", "BRAZIL"],
      2: ["AMERICA", "ENGLAND", "AUSTRALIA", "THAILAND", "VIETNAM", "SPAIN", "ITALY"],
      3: ["MEXICO", "GREECE", "SWEDEN", "NORWAY", "FINLAND", "DENMARK", "POLAND"],
      4: ["SWITZERLAND", "NETHERLANDS", "INDONESIA", "PHILIPPINES", "SINGAPORE"],
      5: ["NEWZEALAND", "ARGENTINA", "SOUTHAFRICA", "SAUDIARABIA"],
    },
  },
  capital: {
    ko: {
      1: ["서울", "도쿄", "베이징", "런던", "파리", "로마", "베를린", "오타와"],
      2: ["워싱턴", "캔버라", "마드리드", "방콕", "하노이", "마닐라", "자카르타"],
      3: ["브라질리아", "뉴델리", "멕시코시티", "아테네", "스톡홀름", "오슬로", "헬싱키"],
      4: ["코펜하겐", "암스테르담", "웰링턴", "부에노스아이레스", "싱가포르"],
      5: ["프리토리아", "아부다비", "리야드", "앙카라", "바르샤바"],
    },
    en: {
      1: ["SEOUL", "TOKYO", "BEIJING", "LONDON", "PARIS", "ROME", "BERLIN", "OTTAWA"],
      2: ["WASHINGTON", "CANBERRA", "MADRID", "BANGKOK", "HANOI", "MANILA", "JAKARTA"],
      3: ["BRASILIA", "NEWDELHI", "MEXICOCITY", "ATHENS", "STOCKHOLM", "OSLO"],
      4: ["HELSINKI", "COPENHAGEN", "AMSTERDAM", "WELLINGTON", "SINGAPORE"],
      5: ["BUENOSAIRES", "PRETORIA", "ABUDHABI", "RIYADH", "ANKARA", "WARSAW"],
    },
  },
  en: {
    1: Array.from(LETTER_SETS.en),
    2: ["GO", "UP", "ON", "IN", "NO", "OK", "BY", "ME", "WE", "IT", "DO", "BE", "SO", "TO"],
    3: ["CAT", "SUN", "SKY", "JET", "BOX", "KEY", "MAP", "RUN", "WIN", "ORB", "RAY", "RED", "ICE"],
    4: ["MOON", "STAR", "SHIP", "FIRE", "CODE", "TYPE", "GAME", "WAVE", "BOMB", "ZONE", "NOVA", "BEAM"],
    5: ["ROBOT", "LASER", "ROCKET", "PIXEL", "ALIEN", "POWER", "ORBIT", "COMET", "TYPER", "BLAST", "SPACE"],
  },
};
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
let currentLanguage = "ko";
let currentWordMenu = "boy-idol-name";
let isComposing = false;
let pendingMenuButton = null;
let isPausedForConfirm = false;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function readHistory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GAME_HISTORY_STORAGE_KEY) || "[]");

    if (Array.isArray(parsed)) {
      return parsed.reduce((histories, item) => {
        const menuValue = item.menuValue || "food";
        histories[menuValue] = histories[menuValue] || [];
        histories[menuValue].push(item);
        return histories;
      }, {});
    }

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to parse typing game history.", error);
    return {};
  }
}

function writeHistory(histories) {
  window.localStorage.setItem(GAME_HISTORY_STORAGE_KEY, JSON.stringify(histories));
}

function getCurrentMenuHistory(histories = readHistory()) {
  const items = histories[currentWordMenu];
  return Array.isArray(items) ? items : [];
}

function writeCurrentMenuHistory(items) {
  const histories = readHistory();
  histories[currentWordMenu] = items;
  writeHistory(histories);
}

function getWordMenuLabel(menuValue = currentWordMenu) {
  return document.querySelector(`[data-word-menu="${menuValue}"]`)?.textContent?.trim() || menuValue;
}

function getWordMenuButtonLabel(button) {
  return button?.textContent?.trim() || "선택한 메뉴";
}

function selectWordMenu(button) {
  currentWordMenu = button.dataset.wordMenu;
  wordMenuButtons.forEach((item) => {
    const isActive = item === button;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-current", isActive ? "true" : "false");
  });

  typingInput.value = "";
  renderHistory();
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
    return "";
  }

  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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
          <h3>SCORE ${String(item.score).padStart(4, "0")}</h3>
          <p>LEVEL ${escapeHtml(item.level)}</p>
        </article>
      `,
    )
    .join("");
}

function saveHistoryEntry() {
  const entry = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    score,
    level,
    menuValue: currentWordMenu,
    menuLabel: getWordMenuLabel(currentWordMenu),
    playedAt: new Date().toISOString(),
  };
  const nextItems = [entry, ...getCurrentMenuHistory()].slice(0, MAX_HISTORY_ITEMS);
  writeCurrentMenuHistory(nextItems);
  renderHistory();
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
  return currentLanguage === "en" ? normalized.toUpperCase() : normalized;
}

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getWordSetForCurrentMenu(language, wordLevel) {
  if (currentWordMenu === "all") {
    return Object.entries(WORD_SETS)
      .filter(([key]) => key !== "en")
      .flatMap(([, set]) => set[language]?.[wordLevel] || []);
  }

  return WORD_SETS[currentWordMenu]?.[language]?.[wordLevel] || [];
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
  const words = getWordSetForCurrentMenu("ko", Math.max(1, Math.min(5, level)));

  if (words.length > 0) {
    return words[Math.floor(Math.random() * words.length)];
  }

  const { syllableCount, batchimCount } = getKoreanLevelSpec();
  const batchimSlots = new Set();

  while (batchimSlots.size < batchimCount) {
    batchimSlots.add(Math.floor(Math.random() * syllableCount));
  }

  return Array.from({ length: syllableCount }, (_, index) => composeHangulSyllable(batchimSlots.has(index))).join("");
}

function getEnglishTargetLength() {
  return Math.max(1, Math.min(5, level));
}

function randomTargetText() {
  if (currentLanguage === "ko") {
    return randomKoreanTargetText();
  }

  const words = getWordSetForCurrentMenu("en", getEnglishTargetLength());
  const fallbackWords = words.length > 0 ? words : WORD_SETS.en[getEnglishTargetLength()];
  return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
}

function spawnTarget() {
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
    vy: 32 + level * 4 + GAME_SPEED.speedBonus + Math.random() * 12,
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
  saveHistoryEntry();
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

typingInput.addEventListener("compositionstart", () => {
  isComposing = true;
});

typingInput.addEventListener("compositionend", () => {
  isComposing = false;
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentLanguage = button.dataset.language;
    languageButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    typingInput.lang = currentLanguage;
    typingInput.value = "";
  });
});

wordMenuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.wordMenu === currentWordMenu) {
      return;
    }

    if (running) {
      openMenuConfirm(button);
      return;
    }

    selectWordMenu(button);
  });
});

cancelConfirmButton.addEventListener("click", closeMenuConfirm);

confirmModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-confirm-modal]")) {
    closeMenuConfirm();
  }
});

acceptConfirmButton.addEventListener("click", () => {
  if (!pendingMenuButton) {
    closeMenuConfirm();
    return;
  }

  const nextMenuButton = pendingMenuButton;
  isPausedForConfirm = false;
  confirmModal.hidden = true;
  pendingMenuButton = null;
  selectWordMenu(nextMenuButton);
  startGame();
});

historyList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-history]");

  if (!deleteButton) {
    return;
  }

  writeCurrentMenuHistory(getCurrentMenuHistory().filter((item) => item.id !== deleteButton.dataset.deleteHistory));
  renderHistory();
});

clearHistoryButton.addEventListener("click", () => {
  writeCurrentMenuHistory([]);
  renderHistory();
});

document.addEventListener("keydown", (event) => {
  if (event.isComposing) {
    return;
  }

  if (event.key === "Escape" && !confirmModal.hidden) {
    closeMenuConfirm();
    return;
  }

  if (!confirmModal.hidden) {
    return;
  }

  if (event.key === "Enter" && (!running || gameOver)) {
    startGame();
    return;
  }

  if (event.key === "Enter" && running) {
    event.preventDefault();
    handleInput(typingInput.value);
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
renderHistory();
draw();
