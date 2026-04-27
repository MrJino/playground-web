const FINAL_CARDS_STORAGE_KEY = 'worldcup-final-cards';
const DEFAULT_MENU_VALUE = 'boy-idol';
const MENU_QUERY_PARAM = 'menu';

let initialCards = [];
let activePool = [];
let currentRoundCards = [];
let selectedCards = [];
let currentPair = [];
let isTransitioning = false;
let hasStoredFinalWinner = false;
let lastWinnerIndex = 0;
let activeLoadRequestId = 0;

const poolGrid = document.getElementById('poolGrid');
const progressText = document.getElementById('progressText');
const battleTitle = document.getElementById('battleTitle');
const centerNote = document.getElementById('centerNote');
const historyList = document.getElementById('historyList');
const clearHistoryButton = document.getElementById('clearHistoryButton');
const confirmModal = document.getElementById('confirmModal');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const cancelConfirmButton = document.getElementById('cancelConfirmButton');
const acceptConfirmButton = document.getElementById('acceptConfirmButton');
const battleGrid = document.getElementById('battleGrid');
const leftCard = document.getElementById('leftCard');
const rightCard = document.getElementById('rightCard');
const leftImage = document.getElementById('leftImage');
const rightImage = document.getElementById('rightImage');
const leftTitle = document.getElementById('leftTitle');
const rightTitle = document.getElementById('rightTitle');
const leftText = document.getElementById('leftText');
const rightText = document.getElementById('rightText');
const battleCards = [leftCard, rightCard];
const menuToggleButtons = document.querySelectorAll('[data-menu-toggle]');
const cardSourceButtons = document.querySelectorAll('[data-card-source]');
const ROUND_TRANSITION_DURATION = 1800;
const CARD_SELECTION_DURATION = 1100;
const FINAL_CARD_SELECTION_DURATION = 1400;
let confirmAction = null;

function getMenuButtonByValue(menuValue) {
  return Array.from(cardSourceButtons).find((button) => button.dataset.menuValue === menuValue);
}

function getInitialMenuButton() {
  const params = new URLSearchParams(window.location.search);
  const menuValue = params.get(MENU_QUERY_PARAM) || DEFAULT_MENU_VALUE;

  return getMenuButtonByValue(menuValue) || getMenuButtonByValue(DEFAULT_MENU_VALUE) || cardSourceButtons[0];
}

function setActiveMenuButton(activeButton) {
  cardSourceButtons.forEach((button) => {
    const isActive = button === activeButton;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });

  const activeSubmenu = activeButton.closest('.submenu');
  const activeMenuGroup = activeSubmenu ? document.querySelector(`[aria-controls="${activeSubmenu.id}"]`) : null;

  if (activeSubmenu && activeMenuGroup) {
    activeSubmenu.classList.add('is-open');
    activeMenuGroup.classList.add('is-open');
    activeMenuGroup.setAttribute('aria-expanded', 'true');
  }
}

function updateMenuQueryParam(menuValue, shouldReplace = false) {
  if (!menuValue) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(MENU_QUERY_PARAM, menuValue);

  if (url.href === window.location.href) {
    return;
  }

  const method = shouldReplace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', url);
}

async function activateMenuButton(button, options = {}) {
  if (!button) {
    return;
  }

  const cardSource = button.dataset.cardSource;

  if (!cardSource) {
    return;
  }

  const loadRequestId = activeLoadRequestId + 1;
  activeLoadRequestId = loadRequestId;

  try {
    setActiveMenuButton(button);
    updateMenuQueryParam(button.dataset.menuValue, options.replace);
    renderCardsLoadingState();
    await loadCards(cardSource, loadRequestId);
  } catch (error) {
    console.error(error);
    centerNote.textContent = '카드 데이터를 불러오지 못했습니다.';
  }
}

function shuffle(array) {
  const cloned = [...array];

  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[randomIndex]] = [cloned[randomIndex], cloned[i]];
  }

  return cloned;
}

function getRoundLabel(cardCount) {
  if (cardCount === 1) {
    return 'Winner';
  }

  return `Round of ${cardCount}`;
}

function getRoundTarget() {
  return Math.max(1, Math.ceil(currentRoundCards.length / 2));
}

function normalizeCard(card, index, sourceDirectory) {
  const image = card.image || '';
  const isRemoteImage = /^https?:\/\//i.test(image);

  return {
    id: card.id ?? index + 1,
    name: card.name ?? `Card ${String(index + 1).padStart(2, '0')}`,
    description: card.description ?? '',
    image: image ? (isRemoteImage ? image : `${sourceDirectory}/${image}`) : '',
  };
}

async function loadCards(cardSource, loadRequestId = activeLoadRequestId) {
  const response = await window.fetch(cardSource);

  if (loadRequestId !== activeLoadRequestId) {
    return;
  }

  if (!response.ok) {
    throw new Error(`Failed to load cards from ${cardSource}`);
  }

  const payload = await response.json();

  if (loadRequestId !== activeLoadRequestId) {
    return;
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const sourceDirectory = cardSource.split('/').slice(0, -1).join('/');
  const cards = items.map((card, index) => normalizeCard(card, index, sourceDirectory));

  if (cards.length < 2) {
    throw new Error('At least two cards are required.');
  }

  initialCards = cards;
  activePool = shuffle([...initialCards]);
  currentRoundCards = [...activePool];
  selectedCards = [];
  currentPair = [];
  isTransitioning = false;
  hasStoredFinalWinner = false;

  renderPool();
  renderBattle();
}

function setBattleCardLoading(cardEl, imageEl, titleEl, textEl) {
  cardEl.classList.remove('is-entering', 'is-exiting', 'is-losing', 'is-winning-left', 'is-winning-right', 'is-final-winner', 'is-final-loser', 'is-bye-card');
  cardEl.classList.add('is-image-loading');
  imageEl.onload = null;
  imageEl.onerror = null;
  imageEl.removeAttribute('src');
  imageEl.alt = '';
  titleEl.textContent = 'Loading';
  textEl.textContent = '';
}

function renderCardsLoadingState() {
  isTransitioning = true;
  initialCards = [];
  activePool = [];
  currentRoundCards = [];
  selectedCards = [];
  currentPair = [];
  hasStoredFinalWinner = false;

  poolGrid.innerHTML = Array.from({ length: 16 }, () => '<article class="pool-card pool-card--loading"></article>').join('');
  battleGrid.hidden = false;
  battleGrid.classList.remove('is-final-winner-grid', 'is-choosing', 'is-bye-advance');
  setBattleCardLoading(leftCard, leftImage, leftTitle, leftText);
  setBattleCardLoading(rightCard, rightImage, rightTitle, rightText);
  battleTitle.textContent = 'Loading Cards';
  progressText.textContent = '';
  centerNote.textContent = '카드 데이터를 불러오는 중입니다.';
}

function readFinalCards() {
  const rawValue = window.localStorage.getItem(FINAL_CARDS_STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse final cards from localStorage.', error);
    return [];
  }
}

function writeFinalCards(cards) {
  window.localStorage.setItem(FINAL_CARDS_STORAGE_KEY, JSON.stringify(cards));
}

function removeFinalCard(storedAt) {
  const filteredCards = readFinalCards().filter((card) => card.storedAt !== storedAt);
  writeFinalCards(filteredCards);
  renderFinalCardsHistory();
}

function clearFinalCards() {
  window.localStorage.removeItem(FINAL_CARDS_STORAGE_KEY);
  renderFinalCardsHistory();
}

function openConfirmModal(message, onConfirm) {
  confirmAction = onConfirm;
  confirmModalMessage.textContent = message;
  confirmModal.hidden = false;
  document.body.classList.add('modal-open');
  acceptConfirmButton.focus();
}

function closeConfirmModal() {
  confirmModal.hidden = true;
  document.body.classList.remove('modal-open');
  confirmAction = null;
}

function handleConfirmAccept() {
  if (typeof confirmAction === 'function') {
    confirmAction();
  }

  closeConfirmModal();
}

function formatStoredAt(storedAt) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(storedAt));
}

function renderFinalCardsHistory() {
  const storedCards = readFinalCards();

  if (storedCards.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        아직 저장된 최종 카드가 없습니다.
      </div>
    `;
    return;
  }

  historyList.innerHTML = storedCards
    .slice()
    .reverse()
    .map(
      (card) => `
        <article class="history-card">
          <div class="history-card__meta">
            <time class="history-card__time" datetime="${card.storedAt}">${formatStoredAt(card.storedAt)}</time>
            <div class="history-card__actions">
              <button class="history-card__delete" type="button" data-delete-final-card="${card.storedAt}">삭제</button>
            </div>
          </div>
          <div class="history-card__body">
            ${card.image ? `<img class="history-card__image" src="${card.image}" alt="${card.name}" />` : '<div class="history-card__image history-card__image--empty"></div>'}
            <div class="history-card__content">
              <h3>${card.name}</h3>
              <p>${card.description}</p>
            </div>
          </div>
        </article>
      `,
    )
    .join('');
}

function persistFinalWinner(card) {
  if (hasStoredFinalWinner) {
    return;
  }

  const storedCards = readFinalCards();
  storedCards.push({
    id: card.id,
    name: card.name,
    description: card.description,
    image: card.image,
    storedAt: new Date().toISOString(),
  });
  writeFinalCards(storedCards);
  renderFinalCardsHistory();
  hasStoredFinalWinner = true;
}

function advanceRoundIfNeeded() {
  if (activePool.length === 1) {
    selectedCards.push(activePool[0]);
    activePool = [];
  }

  if (activePool.length > 0) {
    return false;
  }

  if (selectedCards.length === 1) {
    currentRoundCards = [...selectedCards];
    currentPair = [];
    return true;
  }

  activePool = shuffle([...selectedCards]);
  currentRoundCards = [...activePool];
  selectedCards = [];
  currentPair = [];
  return true;
}

function getPoolVisibleCards() {
  const currentRoundSortedCards = [...currentRoundCards].sort((left, right) => left.id - right.id);

  if (initialCards.length === currentRoundCards.length) {
    return currentRoundSortedCards;
  }

  const currentRoundIds = new Set(currentRoundCards.map((card) => card.id));
  const outsideCurrentRoundCards = [...initialCards]
    .filter((card) => !currentRoundIds.has(card.id))
    .sort((left, right) => left.id - right.id);
  const midpoint = Math.ceil(outsideCurrentRoundCards.length / 2);

  return [
    ...outsideCurrentRoundCards.slice(0, midpoint),
    ...currentRoundSortedCards,
    ...outsideCurrentRoundCards.slice(midpoint),
  ];
}

function renderPool() {
  const visibleCards = getPoolVisibleCards();
  const activeIds = new Set(activePool.map((card) => card.id));
  const selectedIds = new Set(selectedCards.map((card) => card.id));

  poolGrid.innerHTML = visibleCards
    .map((card) => {
      const isAlive = activeIds.has(card.id);
      const isSelected = selectedIds.has(card.id);
      const stateClass = isSelected ? 'selected' : isAlive ? '' : 'eliminated';

      return `
        <article class="pool-card ${stateClass}" data-name="${card.name}">
          ${card.image ? `<img class="pool-card__image" src="${card.image}" alt="${card.name}" />` : ''}
          <div class="pool-card__overlay">
            <span class="pool-card__overlay-name">${card.name}</span>
          </div>
        </article>
      `;
    })
    .join('');
}

function setBattleCard(card, cardEl, imageEl, titleEl, textEl) {
  cardEl.classList.add('is-image-loading');
  imageEl.onload = null;
  imageEl.onerror = null;
  imageEl.removeAttribute('src');
  imageEl.alt = card.name;
  titleEl.textContent = card.name;
  textEl.textContent = card.description;

  imageEl.onload = () => {
    cardEl.classList.remove('is-image-loading');
  };
  imageEl.onerror = () => {
    cardEl.classList.remove('is-image-loading');
  };

  if (!card.image) {
    cardEl.classList.remove('is-image-loading');
    return;
  }

  imageEl.src = card.image;
}

function renderBattle() {
  const existingFanfare = document.querySelector('.fanfare');
  if (existingFanfare) existingFanfare.remove();

  const currentRoundLabel = getRoundLabel(currentRoundCards.length);
  const roundTarget = getRoundTarget();
  progressText.textContent = `${currentRoundLabel} ${selectedCards.length} / ${roundTarget}`;

  if (currentRoundCards.length === 1 && selectedCards.length === 1) {
    const winner = selectedCards[0];
    persistFinalWinner(winner);
    battleTitle.textContent = 'Final Winner';
    centerNote.textContent = '';

    const winnerEl = lastWinnerIndex === 0 ? leftCard : rightCard;
    const loserEl = lastWinnerIndex === 0 ? rightCard : leftCard;

    loserEl.classList.add('is-final-loser');
    battleCards.forEach((card) => card.classList.remove('is-entering', 'is-exiting', 'is-losing', 'is-winning-left', 'is-winning-right'));
    battleGrid.classList.add('is-final-winner-grid');
    battleGrid.hidden = false;
    winnerEl.classList.add('is-final-winner');

    showFanfare();
    return;
  }

  battleGrid.classList.remove('is-final-winner-grid');
  battleGrid.classList.remove('is-choosing');
  battleGrid.classList.remove('is-bye-advance');
  leftCard.classList.remove('is-final-winner', 'is-final-loser', 'is-bye-card');
  rightCard.classList.remove('is-final-winner', 'is-final-loser', 'is-bye-card');

  if (activePool.length < 2) {
    centerNote.textContent = 'Not enough cards remain to continue.';
    return;
  }

  currentPair = shuffle(activePool).slice(0, 2);

  setBattleCard(currentPair[0], leftCard, leftImage, leftTitle, leftText);
  setBattleCard(currentPair[1], rightCard, rightImage, rightTitle, rightText);

  battleTitle.textContent = `${currentRoundLabel} Match`;
  centerNote.textContent = '';
  battleGrid.hidden = false;
  triggerBattleEntry();
}

function showByeAdvance(card) {
  currentPair = [];
  battleTitle.textContent = 'Bye Advance';
  progressText.textContent = `${getRoundLabel(currentRoundCards.length)} ${selectedCards.length + 1} / ${getRoundTarget()}`;
  centerNote.textContent = `${card.name} advances to the next round.`;

  battleGrid.classList.remove('is-choosing');
  battleGrid.classList.add('is-bye-advance');
  battleGrid.hidden = false;
  rightCard.classList.add('is-final-loser');
  leftCard.classList.remove('is-final-loser', 'is-entering', 'is-exiting', 'is-losing', 'is-winning-left', 'is-winning-right');
  leftCard.classList.add('is-bye-card');

  setBattleCard(card, leftCard, leftImage, leftTitle, leftText);
}

function showRoundTransition() {
  if (currentRoundCards.length <= 1) {
    return;
  }

  const existing = document.querySelector('.round-transition');
  if (existing) existing.remove();

  const transition = document.createElement('div');
  transition.className = 'round-transition';
  transition.innerHTML = `
    <div class="round-transition__title">${getRoundLabel(currentRoundCards.length)}</div>
  `;

  document.querySelector('.battle-panel').appendChild(transition);
  window.setTimeout(() => transition.remove(), ROUND_TRANSITION_DURATION);
}

function triggerBattleEntry() {
  battleCards.forEach((card) => {
    card.classList.remove('is-exiting', 'is-entering', 'is-losing', 'is-winning-left', 'is-winning-right');
    void card.offsetWidth;
    card.classList.add('is-entering');
  });
}

function showFanfare() {
  const existing = document.querySelector('.fanfare');
  if (existing) existing.remove();

  const fanfare = document.createElement('div');
  fanfare.className = 'fanfare';

  const colors = ['#f27f5d', '#3078ef', '#18a86b', '#ffd700', '#ff9f43', '#a29bfe', '#fd79a8', '#00cec9'];
  const count = 50;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'fanfare-particle';

    const isLeft = i < count / 2;
    const x = isLeft ? Math.random() * 30 : 70 + Math.random() * 30;
    const y = 15 + Math.random() * 75;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 5 + Math.random() * 10;
    const duration = 1.2 + Math.random() * 1.6;
    const delay = -(Math.random() * duration);
    const rise = 80 + Math.random() * 180;
    const drift = isLeft ? -(20 + Math.random() * 60) : 20 + Math.random() * 60;
    const spin = 360 + Math.random() * 720;
    const isSquare = Math.random() > 0.55;

    particle.style.cssText = `left:${x}%;top:${y}%;width:${size}px;height:${isSquare ? size * 0.5 : size}px;background:${color};border-radius:${isSquare ? '2px' : '50%'};--rise:${rise}px;--drift:${drift}px;--spin:${spin}deg;--duration:${duration}s;--delay:${delay}s;`;
    fanfare.appendChild(particle);
  }

  document.querySelector('.battle-panel').appendChild(fanfare);
}

function chooseCard(index) {
  if (isTransitioning || (currentRoundCards.length === 1 && selectedCards.length === 1) || currentPair.length !== 2) {
    return;
  }

  isTransitioning = true;
  battleGrid.classList.add('is-choosing');
  lastWinnerIndex = index;
  battleCards.forEach((card) => card.classList.remove('is-entering', 'is-exiting', 'is-losing', 'is-winning-left', 'is-winning-right'));

  if (index === 0) {
    leftCard.classList.add('is-winning-left');
    rightCard.classList.add('is-losing');
  } else {
    leftCard.classList.add('is-losing');
    rightCard.classList.add('is-winning-right');
  }

  const winner = currentPair[index];
  const loser = currentPair[index === 0 ? 1 : 0];
  const isFinal = currentRoundCards.length === 2;

  window.setTimeout(
    () => {
      selectedCards.push(winner);
      activePool = activePool.filter((card) => card.id !== winner.id && card.id !== loser.id);

      renderPool();

      if (isFinal) {
        advanceRoundIfNeeded();
        renderPool();
        renderBattle();
        isTransitioning = false;
        return;
      }

      if (activePool.length === 1) {
        const byeCard = activePool[0];
        showByeAdvance(byeCard);

        window.setTimeout(() => {
          selectedCards.push(byeCard);
          activePool = [];
          advanceRoundIfNeeded();
          showRoundTransition();
          window.setTimeout(() => {
            renderPool();
            renderBattle();
            isTransitioning = false;
          }, ROUND_TRANSITION_DURATION);
        }, 1400);
        return;
      }

      const didAdvanceRound = advanceRoundIfNeeded();
      if (didAdvanceRound) {
        showRoundTransition();
        window.setTimeout(() => {
          renderPool();
          renderBattle();
          isTransitioning = false;
        }, ROUND_TRANSITION_DURATION);
        return;
      }

      renderPool();
      renderBattle();
      isTransitioning = false;
    },
    isFinal ? FINAL_CARD_SELECTION_DURATION : CARD_SELECTION_DURATION,
  );
}

function handleKeyboardSelection(event, index) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    chooseCard(index);
  }
}

leftCard.addEventListener('click', () => chooseCard(0));
rightCard.addEventListener('click', () => chooseCard(1));
leftCard.addEventListener('keydown', (event) => handleKeyboardSelection(event, 0));
rightCard.addEventListener('keydown', (event) => handleKeyboardSelection(event, 1));

menuToggleButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const targetId = button.getAttribute('aria-controls');
    const submenu = document.getElementById(targetId);
    const isOpen = button.classList.toggle('is-open');

    button.setAttribute('aria-expanded', String(isOpen));
    submenu.classList.toggle('is-open', isOpen);
  });
});

cardSourceButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activateMenuButton(button);
  });
});

window.addEventListener('popstate', () => {
  activateMenuButton(getInitialMenuButton(), { replace: true });
});

historyList.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('[data-delete-final-card]');

  if (!deleteButton) {
    return;
  }

  openConfirmModal('이 카드를 정말 삭제하시겠습니까?', () => {
    removeFinalCard(deleteButton.dataset.deleteFinalCard);
  });
});

clearHistoryButton.addEventListener('click', () => {
  openConfirmModal('저장된 최종 카드를 모두 삭제하시겠습니까?', () => {
    clearFinalCards();
  });
});

cancelConfirmButton.addEventListener('click', () => {
  closeConfirmModal();
});

acceptConfirmButton.addEventListener('click', () => {
  handleConfirmAccept();
});

confirmModal.addEventListener('click', (event) => {
  if (event.target.closest('[data-close-confirm-modal]')) {
    closeConfirmModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (confirmModal.hidden) {
    return;
  }

  if (event.key === 'Escape') {
    closeConfirmModal();
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    handleConfirmAccept();
  }
});

async function initializeApp() {
  renderFinalCardsHistory();
  await activateMenuButton(getInitialMenuButton(), { replace: true });
}

initializeApp();
