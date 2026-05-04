const FINAL_CARDS_STORAGE_KEY = "worldcup-final-cards";
const DEFAULT_MENU_VALUE = "boy-idol";
const MENU_QUERY_PARAM = "menu";
const MENU_CONFIG_SOURCE = "res/menu.json";
const CLOUDFLARE_API_BASE_URL = "https://playground-api.for1self.workers.dev";

let initialCards = [];
let activePool = [];
let currentRoundCards = [];
let selectedCards = [];
let currentPair = [];
let isTransitioning = false;
let hasStoredFinalWinner = false;
let lastWinnerIndex = 0;
let activeLoadRequestId = 0;
let activeMenuValue = DEFAULT_MENU_VALUE;
let menuGroups = [];
let hasShownInitialBattlePair = false;

const poolGrid = document.getElementById("poolGrid");
const poolScroll = document.getElementById("poolScroll");
const heroPlaceholder = document.getElementById("heroPlaceholder");
const progressText = document.getElementById("progressText");
const battleTitle = document.getElementById("battleTitle");
const menuList = document.getElementById("menuList");
const openMenuSearchButton = document.getElementById("openMenuSearchButton");
const menuBrowserPanel = document.getElementById("menuBrowserPanel");
const menuSearchInput = document.getElementById("menuSearchInput");
const menuBrowserGrid = document.getElementById("menuBrowserGrid");
const menuPanel = document.getElementById("menuPanel");
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistoryButton");
const rankingButton = document.getElementById("rankingButton");
const mobilePanelBackdrop = document.getElementById("mobilePanelBackdrop");
const openMobileMenuButton = document.getElementById("openMobileMenuButton");
const openMobileSearchButton = document.getElementById("openMobileSearchButton");
const openMobileHistoryButton = document.getElementById("openMobileHistoryButton");
const confirmModal = document.getElementById("confirmModal");
const confirmModalMessage = document.getElementById("confirmModalMessage");
const cancelConfirmButton = document.getElementById("cancelConfirmButton");
const acceptConfirmButton = document.getElementById("acceptConfirmButton");
const battlePanel = document.getElementById("battlePanel");
const battleGrid = document.getElementById("battleGrid");
const leftCard = document.getElementById("leftCard");
const rightCard = document.getElementById("rightCard");
const leftImage = document.getElementById("leftImage");
const rightImage = document.getElementById("rightImage");
const leftTitle = document.getElementById("leftTitle");
const rightTitle = document.getElementById("rightTitle");
const leftText = document.getElementById("leftText");
const rightText = document.getElementById("rightText");
const leftSource = document.getElementById("leftSource");
const rightSource = document.getElementById("rightSource");
const battleCards = [leftCard, rightCard];
let menuToggleButtons = [];
let cardSourceButtons = [];
const MOBILE_PANEL_MEDIA_QUERY = "(max-width: 768px)";
const ROUND_TRANSITION_DURATION = 1800;
const CARD_SELECTION_DURATION = 1100;
const FINAL_CARD_SELECTION_DURATION = 1400;
const HANGUL_INITIAL_CONSONANTS = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];
let confirmAction = null;
let selectionAudioContext = null;

function getMenuButtonByValue(menuValue) {
  return Array.from(cardSourceButtons).find(
    (button) => button.dataset.menuValue === menuValue,
  );
}

function isMobilePanelLayout() {
  return window.matchMedia(MOBILE_PANEL_MEDIA_QUERY).matches;
}

function setMobileNavState(activePanel) {
  const isMenuOpen = activePanel === "menu";
  const isSearchOpen = activePanel === "search";
  const isHistoryOpen = activePanel === "history";

  openMobileMenuButton?.classList.toggle("is-active", isMenuOpen);
  openMobileMenuButton?.setAttribute("aria-expanded", String(isMenuOpen));
  openMobileSearchButton?.classList.toggle("is-active", isSearchOpen);
  openMobileHistoryButton?.classList.toggle("is-active", isHistoryOpen);
  openMobileHistoryButton?.setAttribute("aria-expanded", String(isHistoryOpen));
}

function closeMobilePanels() {
  menuPanel?.classList.remove("is-mobile-panel-open");
  historyPanel?.classList.remove("is-mobile-panel-open");
  document.body.classList.remove("mobile-panel-open");
  setMobileNavState(null);

  if (mobilePanelBackdrop) {
    mobilePanelBackdrop.hidden = true;
  }
}

function openMobilePanel(panelName) {
  if (!isMobilePanelLayout()) {
    return;
  }

  const isMenuPanel = panelName === "menu";
  const activePanel = isMenuPanel ? menuPanel : historyPanel;
  const inactivePanel = isMenuPanel ? historyPanel : menuPanel;
  const isAlreadyOpen = activePanel?.classList.contains("is-mobile-panel-open");

  if (isAlreadyOpen) {
    closeMobilePanels();
    return;
  }

  inactivePanel?.classList.remove("is-mobile-panel-open");
  activePanel?.classList.add("is-mobile-panel-open");
  document.body.classList.add("mobile-panel-open");
  setMobileNavState(panelName);

  if (mobilePanelBackdrop) {
    mobilePanelBackdrop.hidden = false;
  }
}

function renderMenuLoading() {
  menuList.innerHTML = `
    <div class="history-empty">
      메뉴를 불러오는 중입니다.
    </div>
  `;
}

function renderMenuError() {
  menuList.innerHTML = `
    <div class="history-empty">
      메뉴를 불러오지 못했습니다.
    </div>
  `;
}

async function loadMenuConfig() {
  renderMenuLoading();

  const response = await window.fetch(MENU_CONFIG_SOURCE);

  if (!response.ok) {
    throw new Error(`Failed to load menu config: ${response.status}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload.groups)) {
    throw new Error("Menu config must include a groups array.");
  }

  menuGroups = payload.groups;
  renderMenu(menuGroups);
  renderMenuBrowser(menuGroups);
  bindMenuEventListeners();
}

function getMenuItems(groups = menuGroups) {
  return groups.flatMap((group) => {
    const items = Array.isArray(group.items) ? group.items : [];

    return items.map((item) => ({
      ...item,
      groupLabel: group.label || "",
    }));
  });
}

function getMenuItemMenuLabel(item) {
  return item.menuLabel || item.label || "";
}

function getMenuItemBrowserLabel(item) {
  return item.browserLabel || item.label || getMenuItemMenuLabel(item);
}

function getHangulInitialConsonants(value) {
  return Array.from(String(value ?? ""))
    .map((character) => {
      const code = character.charCodeAt(0);

      if (code < 0xac00 || code > 0xd7a3) {
        return character;
      }

      const initialIndex = Math.floor((code - 0xac00) / 588);
      return HANGUL_INITIAL_CONSONANTS[initialIndex] || character;
    })
    .join("");
}

function normalizeSearchText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function compactSearchText(value) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function getMenuItemSearchText(item) {
  const labels = [
    getMenuItemMenuLabel(item),
    getMenuItemBrowserLabel(item),
    item.groupLabel || "",
  ];
  const initials = labels.map(getHangulInitialConsonants);
  const searchableParts = [...labels, ...initials];

  return searchableParts
    .flatMap((part) => [normalizeSearchText(part), compactSearchText(part)])
    .join(" ");
}

function renderMenu(groups) {
  menuList.innerHTML = groups
    .map((group, index) => {
      const submenuId = `submenu-${escapeHtml(group.id || index)}`;
      const isOpen = Boolean(group.isOpen);
      const items = Array.isArray(group.items) ? group.items : [];

      return `
        <div class="menu-section">
          <button
            class="menu-group${isOpen ? " is-open" : ""}"
            type="button"
            data-menu-toggle
            aria-expanded="${String(isOpen)}"
            aria-controls="${submenuId}"
          >
            <span>${escapeHtml(group.label || "")}</span>
            <span class="menu-arrow">+</span>
          </button>
          <div class="submenu${isOpen ? " is-open" : ""}" id="${submenuId}">
            ${items
              .map(
                (item) => `
                  <button
                    class="submenu-item"
                    type="button"
                    data-menu-value="${escapeHtml(item.value || "")}"
                    data-card-source="${escapeHtml(item.cardSource || "")}"
                  >
                    ${
                      item.icon
                        ? `<img class="submenu-item__icon" src="${escapeHtml(item.icon)}" alt="" aria-hidden="true" />`
                        : ""
                    }
                    <span>${escapeHtml(getMenuItemMenuLabel(item))}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");
}

function renderMenuBrowser(groups = menuGroups, searchTerm = "") {
  const normalizedSearchTerm = normalizeSearchText(searchTerm);
  const compactSearchTerm = compactSearchText(searchTerm);
  const items = getMenuItems(groups).filter((item) => {
    const searchText = getMenuItemSearchText(item);

    return (
      !normalizedSearchTerm ||
      searchText.includes(normalizedSearchTerm) ||
      searchText.includes(compactSearchTerm)
    );
  });

  if (items.length === 0) {
    menuBrowserGrid.innerHTML = `
      <div class="menu-browser-empty">
        검색 결과가 없습니다.
      </div>
    `;
    return;
  }

  menuBrowserGrid.innerHTML = items
    .map(
      (item) => `
        <button
          class="menu-browser-card"
          type="button"
          data-menu-choice="${escapeHtml(item.value || "")}"
        >
          ${
            item.icon
              ? `<img class="menu-browser-card__icon" src="${escapeHtml(item.icon)}" alt="" aria-hidden="true" />`
              : ""
          }
          <span class="menu-browser-card__group">${escapeHtml(item.groupLabel || "")}</span>
          <strong>${escapeHtml(getMenuItemBrowserLabel(item))}</strong>
        </button>
      `,
    )
    .join("");
}

function hasMenuQueryParam() {
  const params = new URLSearchParams(window.location.search);
  return params.has(MENU_QUERY_PARAM);
}

function showMenuBrowser(options = {}) {
  activeLoadRequestId += 1;
  isTransitioning = false;
  activeMenuValue = DEFAULT_MENU_VALUE;
  cardSourceButtons.forEach((button) => {
    button.classList.remove("is-active");
    button.setAttribute("aria-current", "false");
  });
  heroPlaceholder.hidden = false;
  poolScroll.hidden = true;
  poolGrid.innerHTML = "";
  progressText.textContent = "";
  battlePanel.hidden = true;
  menuBrowserPanel.hidden = false;
  rankingButton.href = getRankingUrl(DEFAULT_MENU_VALUE);
  rankingButton.setAttribute("aria-label", "기본 메뉴 랭킹화면으로 이동");

  if (options.updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.delete(MENU_QUERY_PARAM);
    window.history.pushState({}, "", url);
  }

  if (options.focusSearch) {
    menuSearchInput.focus();
  }
}

function getMenuLabel(button) {
  return button?.textContent?.trim() || "현재 메뉴";
}

function getRankingUrl(menuValue) {
  const url = new URL("./ranking/", window.location.href);
  url.searchParams.set(MENU_QUERY_PARAM, menuValue || DEFAULT_MENU_VALUE);
  return url.href;
}

function updateRankingLink(button) {
  if (!rankingButton || !button) {
    return;
  }

  const menuValue = button.dataset.menuValue || DEFAULT_MENU_VALUE;
  rankingButton.href = getRankingUrl(menuValue);
  rankingButton.setAttribute(
    "aria-label",
    `${getMenuLabel(button)} 랭킹화면으로 이동`,
  );
}

function getInitialMenuButton() {
  const params = new URLSearchParams(window.location.search);
  const menuValue = params.get(MENU_QUERY_PARAM);

  if (!params.has(MENU_QUERY_PARAM)) {
    return null;
  }

  return (
    getMenuButtonByValue(menuValue) ||
    getMenuButtonByValue(DEFAULT_MENU_VALUE) ||
    cardSourceButtons[0]
  );
}

function setActiveMenuButton(activeButton) {
  cardSourceButtons.forEach((button) => {
    const isActive = button === activeButton;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "true" : "false");
  });

  const activeSubmenu = activeButton.closest(".submenu");
  const activeMenuGroup = activeSubmenu
    ? document.querySelector(`[aria-controls="${activeSubmenu.id}"]`)
    : null;

  if (activeSubmenu && activeMenuGroup) {
    activeSubmenu.classList.add("is-open");
    activeMenuGroup.classList.add("is-open");
    activeMenuGroup.setAttribute("aria-expanded", "true");
  }

  updateRankingLink(activeButton);
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

  const method = shouldReplace ? "replaceState" : "pushState";
  window.history[method]({}, "", url);
}

function getActiveMenuValue() {
  const activeButton = document.querySelector("[data-card-source].is-active");
  return (
    activeButton?.dataset.menuValue || activeMenuValue || DEFAULT_MENU_VALUE
  );
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
    menuBrowserPanel.hidden = true;
    battlePanel.hidden = false;
    closeMobilePanels();
    setActiveMenuButton(button);
    activeMenuValue = button.dataset.menuValue || DEFAULT_MENU_VALUE;
    updateMenuQueryParam(button.dataset.menuValue, options.replace);
    renderCardsLoadingState();
    await loadCards(cardSource, loadRequestId);
  } catch (error) {
    console.error(error);
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
    return "Winner";
  }

  return `Round of ${cardCount}`;
}

function getRoundTarget() {
  return Math.max(1, Math.ceil(currentRoundCards.length / 2));
}

function normalizeCard(card, index, sourceDirectory) {
  const image = card.image || "";
  const isRemoteImage = /^https?:\/\//i.test(image);
  const normalizedImage = image
    ? isRemoteImage
      ? image
      : `${sourceDirectory}/${image}`
    : "";

  return {
    id: card.id ?? index + 1,
    name: card.name ?? `Card ${String(index + 1).padStart(2, "0")}`,
    description: card.description ?? "",
    image: normalizedImage,
    imageSource: card.imageSource || card.source || card.credit || "",
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
  const sourceDirectory = cardSource.split("/").slice(0, -1).join("/");
  const cards = items.map((card, index) =>
    normalizeCard(card, index, sourceDirectory),
  );

  if (cards.length < 2) {
    throw new Error("At least two cards are required.");
  }

  initialCards = cards;
  activePool = shuffle([...initialCards]);
  currentRoundCards = [...activePool];
  selectedCards = [];
  currentPair = [];
  isTransitioning = false;
  hasStoredFinalWinner = false;
  hasShownInitialBattlePair = false;

  renderPool();
  renderBattle();
}

function setBattleCardLoading(cardEl, imageEl, titleEl, textEl, sourceEl) {
  cardEl.classList.remove(
    "is-entering",
    "is-exiting",
    "is-losing",
    "is-winning-left",
    "is-winning-right",
    "is-final-winner",
    "is-final-loser",
    "is-bye-card",
  );
  cardEl.classList.add("is-image-loading");
  imageEl.onload = null;
  imageEl.onerror = null;
  imageEl.removeAttribute("src");
  imageEl.alt = "";
  titleEl.textContent = "Loading";
  textEl.textContent = "";
  sourceEl.textContent = "";
}

function renderCardsLoadingState() {
  isTransitioning = true;
  heroPlaceholder.hidden = true;
  poolScroll.hidden = false;
  initialCards = [];
  activePool = [];
  currentRoundCards = [];
  selectedCards = [];
  currentPair = [];
  hasStoredFinalWinner = false;
  hasShownInitialBattlePair = false;

  poolGrid.innerHTML = Array.from(
    { length: 16 },
    () => '<article class="pool-card pool-card--loading"></article>',
  ).join("");
  battleGrid.hidden = false;
  battleGrid.classList.remove(
    "is-final-winner-grid",
    "is-choosing",
    "is-bye-advance",
  );
  setBattleCardLoading(leftCard, leftImage, leftTitle, leftText, leftSource);
  setBattleCardLoading(rightCard, rightImage, rightTitle, rightText, rightSource);
  battleTitle.textContent = "Loading Cards";
  progressText.textContent = "";
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
    console.error("Failed to parse final cards from localStorage.", error);
    return [];
  }
}

function writeFinalCards(cards) {
  window.localStorage.setItem(FINAL_CARDS_STORAGE_KEY, JSON.stringify(cards));
}

function removeFinalCard(storedAt) {
  const filteredCards = readFinalCards().filter(
    (card) => card.storedAt !== storedAt,
  );
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
  document.body.classList.add("modal-open");
  acceptConfirmButton.focus();
}

function closeConfirmModal() {
  confirmModal.hidden = true;
  document.body.classList.remove("modal-open");
  confirmAction = null;
}

function handleConfirmAccept() {
  if (typeof confirmAction === "function") {
    confirmAction();
  }

  closeConfirmModal();
}

function formatStoredAt(storedAt) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(storedAt));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
    .join("");
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
  persistCloudflareWinner(card);
}

async function persistCloudflareWinner(card) {
  const menuValue = getActiveMenuValue();

  try {
    const response = await window.fetch(
      `${CLOUDFLARE_API_BASE_URL}/api/winners`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          menu: menuValue,
          cardId: card.id,
          cardName: card.name,
          description: card.description,
          image: card.image,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to save Cloudflare winner: ${response.status}`);
    }

  } catch (error) {
    console.error(error);
  }
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
  const currentRoundSortedCards = [...currentRoundCards].sort(
    (left, right) => left.id - right.id,
  );

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
  const currentRoundIds = new Set(currentRoundCards.map((card) => card.id));

  poolGrid.innerHTML = visibleCards
    .map((card) => {
      const isAlive = activeIds.has(card.id);
      const isSelected = selectedIds.has(card.id);
      const isCurrentRound = currentRoundIds.has(card.id);
      const stateClasses = [
        isSelected ? "selected" : isAlive ? "" : "eliminated",
        isCurrentRound ? "is-current-round" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <article class="pool-card ${stateClasses}" data-name="${card.name}">
          ${card.image ? `<img class="pool-card__image" src="${card.image}" alt="${card.name}" />` : ""}
          <div class="pool-card__overlay">
            <span class="pool-card__overlay-name">${card.name}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function getImageSourceLabel(card) {
  if (card.imageSource) {
    return card.imageSource;
  }

  if (!card.image) {
    return "";
  }

  try {
    const { hostname } = new URL(card.image);
    const normalizedHost = hostname.replace(/^www\./, "");

    if (normalizedHost.includes("wikimedia.org")) {
      return "Wikimedia Commons";
    }

    if (normalizedHost.includes("assembly.go.kr")) {
      return "대한민국 국회";
    }

    if (normalizedHost.includes("amazonaws.com")) {
      return "누구뽑지";
    }

    return normalizedHost;
  } catch (error) {
    return "Local asset";
  }
}

function setBattleCard(card, cardEl, imageEl, titleEl, textEl, sourceEl) {
  cardEl.classList.add("is-image-loading");
  imageEl.onload = null;
  imageEl.onerror = null;
  imageEl.removeAttribute("src");
  imageEl.alt = card.name;
  titleEl.textContent = card.name;
  textEl.textContent = card.description;
  const imageSourceLabel = getImageSourceLabel(card);
  sourceEl.textContent = imageSourceLabel ? `이미지 출처: ${imageSourceLabel}` : "";

  imageEl.onload = () => {
    cardEl.classList.remove("is-image-loading");
  };
  imageEl.onerror = () => {
    cardEl.classList.remove("is-image-loading");
  };

  if (!card.image) {
    cardEl.classList.remove("is-image-loading");
    return;
  }

  imageEl.src = card.image;
}

function renderBattle() {
  const existingFanfare = document.querySelector(".fanfare");
  if (existingFanfare) existingFanfare.remove();

  const currentRoundLabel = getRoundLabel(currentRoundCards.length);
  const roundTarget = getRoundTarget();
  progressText.textContent = `${selectedCards.length} / ${roundTarget}`;

  if (currentRoundCards.length === 1 && selectedCards.length === 1) {
    const winner = selectedCards[0];
    persistFinalWinner(winner);
    battleTitle.textContent = "Final Winner";

    const winnerEl = lastWinnerIndex === 0 ? leftCard : rightCard;
    const loserEl = lastWinnerIndex === 0 ? rightCard : leftCard;

    loserEl.classList.add("is-final-loser");
    battleCards.forEach((card) =>
      card.classList.remove(
        "is-entering",
        "is-exiting",
        "is-losing",
        "is-winning-left",
        "is-winning-right",
      ),
    );
    battleGrid.classList.add("is-final-winner-grid");
    battleGrid.hidden = false;
    winnerEl.classList.add("is-final-winner");

    showFanfare();
    return;
  }

  battleGrid.classList.remove("is-final-winner-grid");
  battleGrid.classList.remove("is-choosing");
  battleGrid.classList.remove("is-bye-advance");
  leftCard.classList.remove("is-final-winner", "is-final-loser", "is-bye-card");
  rightCard.classList.remove(
    "is-final-winner",
    "is-final-loser",
    "is-bye-card",
  );

  if (activePool.length < 2) {
    return;
  }

  currentPair = shuffle(activePool).slice(0, 2);

  setBattleCard(currentPair[0], leftCard, leftImage, leftTitle, leftText, leftSource);
  setBattleCard(currentPair[1], rightCard, rightImage, rightTitle, rightText, rightSource);

  battleTitle.textContent = `${currentRoundLabel} Match`;
  battleGrid.hidden = false;

  if (!hasShownInitialBattlePair) {
    hasShownInitialBattlePair = true;
    battleCards.forEach((card) =>
      card.classList.remove(
        "is-entering",
        "is-exiting",
        "is-losing",
        "is-winning-left",
        "is-winning-right",
      ),
    );
    return;
  }

  triggerBattleEntry();
}

function showByeAdvance(card) {
  currentPair = [];
  battleTitle.textContent = "Bye Advance";
  progressText.textContent = `${selectedCards.length + 1} / ${getRoundTarget()}`;

  battleGrid.classList.remove("is-choosing");
  battleGrid.classList.add("is-bye-advance");
  battleGrid.hidden = false;
  rightCard.classList.add("is-final-loser");
  leftCard.classList.remove(
    "is-final-loser",
    "is-entering",
    "is-exiting",
    "is-losing",
    "is-winning-left",
    "is-winning-right",
  );
  leftCard.classList.add("is-bye-card");

  setBattleCard(card, leftCard, leftImage, leftTitle, leftText, leftSource);
}

function showRoundTransition() {
  if (currentRoundCards.length <= 1) {
    return;
  }

  const existing = document.querySelector(".round-transition");
  if (existing) existing.remove();

  const transition = document.createElement("div");
  transition.className = "round-transition";
  transition.innerHTML = `
    <div class="round-transition__title">${getRoundLabel(currentRoundCards.length)}</div>
  `;

  document.querySelector(".battle-panel").appendChild(transition);
  window.setTimeout(() => transition.remove(), ROUND_TRANSITION_DURATION);
}

function triggerBattleEntry() {
  battleCards.forEach((card) => {
    card.classList.remove(
      "is-exiting",
      "is-entering",
      "is-losing",
      "is-winning-left",
      "is-winning-right",
    );
    void card.offsetWidth;
    card.classList.add("is-entering");
  });
}

function showFanfare() {
  const existing = document.querySelector(".fanfare");
  if (existing) existing.remove();

  playFanfareSound();

  const fanfare = document.createElement("div");
  fanfare.className = "fanfare";

  const colors = [
    "#f27f5d",
    "#3078ef",
    "#18a86b",
    "#ffd700",
    "#ff9f43",
    "#a29bfe",
    "#fd79a8",
    "#00cec9",
  ];
  const count = 50;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.className = "fanfare-particle";

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

    particle.style.cssText = `left:${x}%;top:${y}%;width:${size}px;height:${isSquare ? size * 0.5 : size}px;background:${color};border-radius:${isSquare ? "2px" : "50%"};--rise:${rise}px;--drift:${drift}px;--spin:${spin}deg;--duration:${duration}s;--delay:${delay}s;`;
    fanfare.appendChild(particle);
  }

  document.querySelector(".battle-panel").appendChild(fanfare);
}

function getAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    return null;
  }

  selectionAudioContext = selectionAudioContext || new AudioContext();

  if (selectionAudioContext.state === "suspended") {
    selectionAudioContext.resume();
  }

  return selectionAudioContext;
}

function playSelectionSound() {
  const audioContext = getAudioContext();

  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.14, now + 0.012);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
  masterGain.connect(audioContext.destination);

  const delay = audioContext.createDelay();
  const feedback = audioContext.createGain();
  const echoGain = audioContext.createGain();

  delay.delayTime.setValueAtTime(0.065, now);
  feedback.gain.setValueAtTime(0.18, now);
  echoGain.gain.setValueAtTime(0.26, now);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(echoGain);
  echoGain.connect(masterGain);

  const notes = [
    { frequency: 493.88, start: 0, duration: 0.16, peak: 0.45 },
    { frequency: 739.99, start: 0.028, duration: 0.18, peak: 0.34 },
    { frequency: 987.77, start: 0.07, duration: 0.22, peak: 0.24 },
  ];

  notes.forEach((note) => {
    const oscillator = audioContext.createOscillator();
    const noteGain = audioContext.createGain();
    const startTime = now + note.start;
    const endTime = startTime + note.duration;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency * 1.025, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      note.frequency,
      endTime,
    );

    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(note.peak, startTime + 0.01);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(noteGain);
    noteGain.connect(masterGain);
    noteGain.connect(delay);
    oscillator.start(startTime);
    oscillator.stop(endTime + 0.02);
  });
}

function playFanfareSound() {
  const audioContext = getAudioContext();

  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.2, now + 0.04);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
  masterGain.connect(audioContext.destination);

  const notes = [
    { frequency: 523.25, start: 0, duration: 0.28 },
    { frequency: 659.25, start: 0.09, duration: 0.3 },
    { frequency: 783.99, start: 0.18, duration: 0.34 },
    { frequency: 1046.5, start: 0.34, duration: 0.52 },
  ];

  notes.forEach((note) => {
    const oscillator = audioContext.createOscillator();
    const noteGain = audioContext.createGain();
    const startTime = now + note.start;
    const endTime = startTime + note.duration;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(note.frequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      note.frequency * 1.015,
      endTime,
    );

    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(0.55, startTime + 0.025);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(noteGain);
    noteGain.connect(masterGain);
    oscillator.start(startTime);
    oscillator.stop(endTime + 0.03);
  });
}

function chooseCard(index) {
  if (
    isTransitioning ||
    (currentRoundCards.length === 1 && selectedCards.length === 1) ||
    currentPair.length !== 2
  ) {
    return;
  }

  playSelectionSound();
  isTransitioning = true;
  battleGrid.classList.add("is-choosing");
  lastWinnerIndex = index;
  battleCards.forEach((card) =>
    card.classList.remove(
      "is-entering",
      "is-exiting",
      "is-losing",
      "is-winning-left",
      "is-winning-right",
    ),
  );

  if (index === 0) {
    leftCard.classList.add("is-winning-left");
    rightCard.classList.add("is-losing");
  } else {
    leftCard.classList.add("is-losing");
    rightCard.classList.add("is-winning-right");
  }

  const winner = currentPair[index];
  const loser = currentPair[index === 0 ? 1 : 0];
  const isFinal = currentRoundCards.length === 2;

  window.setTimeout(
    () => {
      selectedCards.push(winner);
      activePool = activePool.filter(
        (card) => card.id !== winner.id && card.id !== loser.id,
      );

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
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    chooseCard(index);
  }
}

leftCard.addEventListener("click", () => chooseCard(0));
rightCard.addEventListener("click", () => chooseCard(1));
leftCard.addEventListener("keydown", (event) =>
  handleKeyboardSelection(event, 0),
);
rightCard.addEventListener("keydown", (event) =>
  handleKeyboardSelection(event, 1),
);

function bindMenuEventListeners() {
  menuToggleButtons = Array.from(document.querySelectorAll("[data-menu-toggle]"));
  cardSourceButtons = Array.from(document.querySelectorAll("[data-card-source]"));

  menuToggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("aria-controls");
      const submenu = document.getElementById(targetId);
      const isOpen = button.classList.toggle("is-open");

      button.setAttribute("aria-expanded", String(isOpen));
      submenu?.classList.toggle("is-open", isOpen);
    });
  });

  cardSourceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateMenuButton(button);
    });
  });
}

menuSearchInput.addEventListener("input", () => {
  renderMenuBrowser(menuGroups, menuSearchInput.value);
});

openMenuSearchButton.addEventListener("click", () => {
  closeMobilePanels();
  showMenuBrowser({ updateUrl: true, focusSearch: true });
});

menuBrowserGrid.addEventListener("click", (event) => {
  const menuChoice = event.target.closest("[data-menu-choice]");

  if (!menuChoice) {
    return;
  }

  const menuButton = getMenuButtonByValue(menuChoice.dataset.menuChoice);
  activateMenuButton(menuButton);
});

window.addEventListener("popstate", () => {
  if (!hasMenuQueryParam()) {
    showMenuBrowser();
    return;
  }

  activateMenuButton(getInitialMenuButton(), { replace: true });
});

historyList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-final-card]");

  if (!deleteButton) {
    return;
  }

  openConfirmModal("이 카드를 정말 삭제하시겠습니까?", () => {
    removeFinalCard(deleteButton.dataset.deleteFinalCard);
  });
});

clearHistoryButton.addEventListener("click", () => {
  openConfirmModal("저장된 최종 카드를 모두 삭제하시겠습니까?", () => {
    clearFinalCards();
  });
});

openMobileMenuButton?.addEventListener("click", () => {
  openMobilePanel("menu");
});

openMobileSearchButton?.addEventListener("click", () => {
  closeMobilePanels();
  showMenuBrowser({ updateUrl: true, focusSearch: true });
  setMobileNavState("search");
});

openMobileHistoryButton?.addEventListener("click", () => {
  openMobilePanel("history");
});

mobilePanelBackdrop?.addEventListener("click", () => {
  closeMobilePanels();
});

window.addEventListener("resize", () => {
  if (!isMobilePanelLayout()) {
    closeMobilePanels();
  }
});

cancelConfirmButton.addEventListener("click", () => {
  closeConfirmModal();
});

acceptConfirmButton.addEventListener("click", () => {
  handleConfirmAccept();
});

confirmModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-confirm-modal]")) {
    closeConfirmModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("mobile-panel-open")) {
    closeMobilePanels();
  }

  if (confirmModal.hidden) {
    return;
  }

  if (event.key === "Escape") {
    closeConfirmModal();
  }

  if (event.key === "Enter") {
    event.preventDefault();
    handleConfirmAccept();
  }
});

async function initializeApp() {
  renderFinalCardsHistory();
  try {
    await loadMenuConfig();
  } catch (error) {
    console.error(error);
    renderMenuError();
    return;
  }

  if (!hasMenuQueryParam()) {
    showMenuBrowser();
    return;
  }

  await activateMenuButton(getInitialMenuButton(), { replace: true });
}

initializeApp();
