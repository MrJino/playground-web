let activeModuleId = document.body.dataset.adminModule || null;
let topics = [];
let words = [];
let selectedTopicId = null;
let selectedWordId = null;
let topicFilterText = '';
let wordFilterText = '';
let wordPageOffset = 0;
let hasMoreWords = false;
let isLoadingMoreWords = false;
let wordRequestSerial = 0;
const WORD_PAGE_SIZE = 10;
let favoriteTopics = [];
let favoriteCards = [];
let selectedFavoriteTopicId = null;
let selectedFavoriteCardId = null;
let favoriteTopicFilterText = '';
let favoriteCardPageOffset = 0;
let hasMoreFavoriteCards = false;
let isLoadingMoreFavoriteCards = false;
const FAVORITE_CARD_PAGE_SIZE = 50;
let isBusy = false;
let pendingDeleteWord = null;
let pendingDeleteFavoriteCard = null;
let hasLoadedWordsQuiz = false;
let hasLoadedPickYourFavorite = false;

const moduleButtons = document.querySelectorAll('[data-module-id]');
const modulePanels = document.querySelectorAll('[data-module-panel]');
const wordsQuizPanel = document.getElementById('wordsQuizPanel');
const favoritePanel = document.getElementById('favoritePanel');
const statusLine = document.getElementById('statusLine');

const topicList = document.getElementById('topicList');
const topicDialog = document.getElementById('topicDialog');
const topicForm = document.getElementById('topicForm');
const topicIdInput = document.getElementById('topicIdInput');
const topicTitleInput = document.getElementById('topicTitleInput');
const topicDescriptionInput = document.getElementById('topicDescriptionInput');
const topicModeText = document.getElementById('topicModeText');
const newTopicButton = document.getElementById('newTopicButton');
const deleteTopicButton = document.getElementById('deleteTopicButton');
const cancelTopicButton = document.getElementById('cancelTopicButton');
const topicFilterInput = document.getElementById('topicFilterInput');

const wordList = document.getElementById('wordList');
const wordListTitle = document.getElementById('wordListTitle');
const wordCountText = document.getElementById('wordCountText');
const wordFilterInput = document.getElementById('wordFilterInput');
const wordDialog = document.getElementById('wordDialog');
const wordForm = document.getElementById('wordForm');
const wordIdInput = document.getElementById('wordIdInput');
const wordTopicInput = document.getElementById('wordTopicInput');
const wordTopicSelectButton = document.getElementById('wordTopicSelectButton');
const wordTopicSelectMenu = document.getElementById('wordTopicSelectMenu');
const abbreviationInput = document.getElementById('abbreviationInput');
const fullNameInput = document.getElementById('fullNameInput');
const wordDescriptionInput = document.getElementById('wordDescriptionInput');
const wordModeText = document.getElementById('wordModeText');
const newWordButton = document.getElementById('newWordButton');
const cancelWordButton = document.getElementById('cancelWordButton');
const deleteWordDialog = document.getElementById('deleteWordDialog');
const deleteWordMessage = document.getElementById('deleteWordMessage');
const cancelDeleteWordButton = document.getElementById('cancelDeleteWordButton');
const confirmDeleteWordButton = document.getElementById('confirmDeleteWordButton');
const wordDetailDialog = document.getElementById('wordDetailDialog');
const wordDetailAbbreviation = document.getElementById('wordDetailAbbreviation');
const wordDetailFullName = document.getElementById('wordDetailFullName');
const wordDetailDescription = document.getElementById('wordDetailDescription');
const closeWordDetailButton = document.getElementById('closeWordDetailButton');
const favoriteStatusLine = document.getElementById('favoriteStatusLine');
const favoriteTopicList = document.getElementById('favoriteTopicList');
const favoriteTopicDialog = document.getElementById('favoriteTopicDialog');
const favoriteTopicForm = document.getElementById('favoriteTopicForm');
const favoriteTopicIdInput = document.getElementById('favoriteTopicIdInput');
const favoriteTopicValueInput = document.getElementById('favoriteTopicValueInput');
const favoriteTopicLabelInput = document.getElementById('favoriteTopicLabelInput');
const favoriteTopicCountryInput = document.getElementById('favoriteTopicCountryInput');
const favoriteTopicIconInput = document.getElementById('favoriteTopicIconInput');
const favoriteTopicEraInput = document.getElementById('favoriteTopicEraInput');
const favoriteTopicModeText = document.getElementById('favoriteTopicModeText');
const newFavoriteTopicButton = document.getElementById('newFavoriteTopicButton');
const deleteFavoriteTopicButton = document.getElementById('deleteFavoriteTopicButton');
const cancelFavoriteTopicButton = document.getElementById('cancelFavoriteTopicButton');
const favoriteTopicFilterInput = document.getElementById('favoriteTopicFilterInput');
const favoriteCardList = document.getElementById('favoriteCardList');
const favoriteCardListTitle = document.getElementById('favoriteCardListTitle');
const favoriteCardCountText = document.getElementById('favoriteCardCountText');
const favoriteCardDialog = document.getElementById('favoriteCardDialog');
const favoriteCardForm = document.getElementById('favoriteCardForm');
const favoriteCardIdInput = document.getElementById('favoriteCardIdInput');
const favoriteCardTopicInput = document.getElementById('favoriteCardTopicInput');
const favoriteCardTopicSelectButton = document.getElementById('favoriteCardTopicSelectButton');
const favoriteCardTopicSelectMenu = document.getElementById('favoriteCardTopicSelectMenu');
const favoriteCardNameInput = document.getElementById('favoriteCardNameInput');
const favoriteCardDescriptionInput = document.getElementById('favoriteCardDescriptionInput');
const favoriteCardImageInput = document.getElementById('favoriteCardImageInput');
const favoriteCardModeText = document.getElementById('favoriteCardModeText');
const newFavoriteCardButton = document.getElementById('newFavoriteCardButton');
const cancelFavoriteCardButton = document.getElementById('cancelFavoriteCardButton');
const deleteFavoriteCardDialog = document.getElementById('deleteFavoriteCardDialog');
const deleteFavoriteCardMessage = document.getElementById('deleteFavoriteCardMessage');
const cancelDeleteFavoriteCardButton = document.getElementById('cancelDeleteFavoriteCardButton');
const confirmDeleteFavoriteCardButton = document.getElementById('confirmDeleteFavoriteCardButton');
const favoriteCardPreviewDialog = document.getElementById('favoriteCardPreviewDialog');
const favoriteCardPreviewMedia = document.getElementById('favoriteCardPreviewMedia');
const favoriteCardPreviewName = document.getElementById('favoriteCardPreviewName');
const favoriteCardPreviewDescription = document.getElementById('favoriteCardPreviewDescription');
const closeFavoriteCardPreviewButton = document.getElementById('closeFavoriteCardPreviewButton');
const {
  fetchTopics,
  saveTopic,
  deleteTopic,
  fetchQuizWords: fetchWords,
  saveQuizWord: saveWord,
  deleteQuizWord: deleteWord,
  fetchFavoriteTopics,
  saveFavoriteTopic,
  deleteFavoriteTopic,
  fetchFavoriteCards,
  saveFavoriteCard,
  deleteFavoriteCard,
} = window.PlaygroundCloudflareApi;

function on(element, eventName, handler) {
  element?.addEventListener(eventName, handler);
}

function setDisabled(element, disabled) {
  if (element) {
    element.disabled = disabled;
  }
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

const KOREAN_INITIALS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

function getKoreanInitials(value) {
  return String(value)
    .split('')
    .map((character) => {
      const code = character.charCodeAt(0);

      if (code < 0xac00 || code > 0xd7a3) {
        return character;
      }

      return KOREAN_INITIALS[Math.floor((code - 0xac00) / 588)];
    })
    .join('');
}

function getTopicSearchText(topic) {
  const text = `${topic.title} ${topic.description || ''}`.toLowerCase();
  return `${text} ${getKoreanInitials(text)}`;
}

function getFavoriteTopicSearchText(topic) {
  const text = `${topic.label} ${topic.value} ${topic.country || ''} ${topic.era ?? ''}`.toLowerCase();
  return `${text} ${getKoreanInitials(text)}`;
}

function setStatus(message = '') {
  if (statusLine) {
    statusLine.textContent = message;
  }
}

function setFavoriteStatus(message = '') {
  if (favoriteStatusLine) {
    favoriteStatusLine.textContent = message;
  }
}

function setBusy(nextBusy) {
  isBusy = nextBusy;
  setDisabled(newTopicButton, isBusy);
  setDisabled(newWordButton, isBusy || selectedTopicId === null);
  setDisabled(topicForm?.querySelector('[type="submit"]'), isBusy);
  setDisabled(wordForm?.querySelector('[type="submit"]'), isBusy || topics.length === 0);
  setDisabled(deleteTopicButton, isBusy || !topicIdInput?.value);
  setDisabled(confirmDeleteWordButton, isBusy || pendingDeleteWord === null);
  setDisabled(newFavoriteTopicButton, isBusy);
  setDisabled(newFavoriteCardButton, isBusy || selectedFavoriteTopicId === null);
  setDisabled(favoriteTopicForm?.querySelector('[type="submit"]'), isBusy);
  setDisabled(favoriteCardForm?.querySelector('[type="submit"]'), isBusy || favoriteTopics.length === 0);
  setDisabled(deleteFavoriteTopicButton, isBusy || !favoriteTopicIdInput?.value);
  setDisabled(confirmDeleteFavoriteCardButton, isBusy || pendingDeleteFavoriteCard === null);
}

function getSelectedTopic() {
  return topics.find((topic) => topic.id === selectedTopicId) || null;
}

function getSelectedWord() {
  return words.find((word) => word.id === selectedWordId) || null;
}

function resetTopicForm() {
  topicIdInput.value = '';
  topicTitleInput.value = '';
  topicDescriptionInput.value = '';
  topicModeText.textContent = '새 topic';
}

function openTopicDialog() {
  topicDialog.showModal();
  topicTitleInput.focus();
}

function closeTopicDialog() {
  topicDialog.close();
}

function fillTopicForm(topic) {
  topicIdInput.value = String(topic.id);
  topicTitleInput.value = topic.title;
  topicDescriptionInput.value = topic.description;
  topicModeText.textContent = `#${topic.id} 편집`;
}

function closeWordTopicMenu() {
  if (!wordTopicSelectMenu || !wordTopicSelectButton) {
    return;
  }

  wordTopicSelectMenu.hidden = true;
  wordTopicSelectButton.setAttribute('aria-expanded', 'false');
}

function setWordTopicValue(topicId) {
  const normalizedTopicId = topicId === null || topicId === '' ? '' : String(topicId);
  const topic = topics.find((item) => String(item.id) === normalizedTopicId);
  wordTopicInput.value = normalizedTopicId;
  wordTopicSelectButton.textContent = topic ? topic.title : 'Topic 선택';

  wordTopicSelectMenu.querySelectorAll('[data-topic-option]').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.topicOption === normalizedTopicId);
    button.setAttribute('aria-selected', button.dataset.topicOption === normalizedTopicId ? 'true' : 'false');
  });
}

function resetWordForm() {
  selectedWordId = null;
  wordIdInput.value = '';
  abbreviationInput.value = '';
  fullNameInput.value = '';
  wordDescriptionInput.value = '';
  setWordTopicValue(selectedTopicId);
  wordModeText.textContent = '새 quiz word';
}

function openWordDialog() {
  wordDialog.showModal();
  abbreviationInput.focus();
}

function closeWordDialog() {
  if (wordDialog.open) {
    wordDialog.close();
  }
}

function openDeleteWordDialog(word) {
  if (!word) {
    return;
  }

  pendingDeleteWord = word;
  deleteWordMessage.textContent = `${word.abbreviation} quiz word를 삭제할까요?`;
  setBusy(isBusy);
  deleteWordDialog.showModal();
}

function closeDeleteWordDialog() {
  if (deleteWordDialog.open) {
    deleteWordDialog.close();
  }
  pendingDeleteWord = null;
  setBusy(isBusy);
}

function openWordDetailDialog(word) {
  if (!word) {
    return;
  }

  wordDetailAbbreviation.textContent = word.abbreviation;
  wordDetailFullName.textContent = word.fullName;
  wordDetailDescription.textContent = word.description || '설명 없음';
  wordDetailDialog.showModal();
}

function closeWordDetailDialog() {
  if (wordDetailDialog.open) {
    wordDetailDialog.close();
  }
}

function getSelectedFavoriteTopic() {
  return favoriteTopics.find((topic) => topic.id === selectedFavoriteTopicId) || null;
}

function resetFavoriteTopicForm() {
  favoriteTopicIdInput.value = '';
  favoriteTopicValueInput.value = '';
  favoriteTopicLabelInput.value = '';
  favoriteTopicCountryInput.value = '';
  favoriteTopicIconInput.value = '';
  favoriteTopicEraInput.value = '';
  favoriteTopicModeText.textContent = '새 favorite topic';
}

function fillFavoriteTopicForm(topic) {
  favoriteTopicIdInput.value = String(topic.id);
  favoriteTopicValueInput.value = topic.value;
  favoriteTopicLabelInput.value = topic.label;
  favoriteTopicCountryInput.value = topic.country;
  favoriteTopicIconInput.value = topic.icon;
  favoriteTopicEraInput.value = topic.era === null ? '' : String(topic.era);
  favoriteTopicModeText.textContent = `#${topic.id} 편집`;
}

function openFavoriteTopicDialog() {
  favoriteTopicDialog.showModal();
  favoriteTopicValueInput.focus();
}

function closeFavoriteTopicDialog() {
  if (favoriteTopicDialog.open) {
    favoriteTopicDialog.close();
  }
}

function closeFavoriteCardTopicMenu() {
  if (!favoriteCardTopicSelectMenu || !favoriteCardTopicSelectButton) {
    return;
  }

  favoriteCardTopicSelectMenu.hidden = true;
  favoriteCardTopicSelectButton.setAttribute('aria-expanded', 'false');
}

function setFavoriteCardTopicValue(topicId) {
  const normalizedTopicId = topicId === null || topicId === '' ? '' : String(topicId);
  const topic = favoriteTopics.find((item) => String(item.id) === normalizedTopicId);
  favoriteCardTopicInput.value = normalizedTopicId;
  favoriteCardTopicSelectButton.textContent = topic ? topic.label : 'Topic 선택';

  favoriteCardTopicSelectMenu.querySelectorAll('[data-favorite-topic-option]').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.favoriteTopicOption === normalizedTopicId);
    button.setAttribute('aria-selected', button.dataset.favoriteTopicOption === normalizedTopicId ? 'true' : 'false');
  });
}

function resetFavoriteCardForm() {
  selectedFavoriteCardId = null;
  favoriteCardIdInput.value = '';
  favoriteCardNameInput.value = '';
  favoriteCardDescriptionInput.value = '';
  favoriteCardImageInput.value = '';
  setFavoriteCardTopicValue(selectedFavoriteTopicId);
  favoriteCardModeText.textContent = '새 favorite card';
}

function fillFavoriteCardForm(card) {
  selectedFavoriteCardId = card.id;
  favoriteCardIdInput.value = String(card.id);
  setFavoriteCardTopicValue(card.topicId);
  favoriteCardNameInput.value = card.name;
  favoriteCardDescriptionInput.value = card.description;
  favoriteCardImageInput.value = card.image;
  favoriteCardModeText.textContent = `#${card.id} 편집`;
}

function openFavoriteCardDialog() {
  favoriteCardDialog.showModal();
  favoriteCardNameInput.focus();
}

function closeFavoriteCardDialog() {
  if (favoriteCardDialog.open) {
    favoriteCardDialog.close();
  }
}

function openDeleteFavoriteCardDialog(card) {
  if (!card) {
    return;
  }

  pendingDeleteFavoriteCard = card;
  deleteFavoriteCardMessage.textContent = `${card.name} favorite card를 삭제할까요?`;
  setBusy(isBusy);
  deleteFavoriteCardDialog.showModal();
}

function closeDeleteFavoriteCardDialog() {
  if (deleteFavoriteCardDialog.open) {
    deleteFavoriteCardDialog.close();
  }
  pendingDeleteFavoriteCard = null;
  setBusy(isBusy);
}

function openFavoriteCardPreview(card) {
  if (!card || !favoriteCardPreviewDialog) {
    return;
  }

  favoriteCardPreviewMedia.innerHTML = card.image
    ? `<img src="${escapeHtml(card.image)}" alt="" />`
    : `<div class="favorite-preview-placeholder" aria-hidden="true">${escapeHtml(card.name.slice(0, 1) || '?')}</div>`;
  favoriteCardPreviewName.textContent = card.name;
  favoriteCardPreviewDescription.textContent = card.description || '설명 없음';
  favoriteCardPreviewDialog.showModal();
}

function closeFavoriteCardPreview() {
  if (favoriteCardPreviewDialog?.open) {
    favoriteCardPreviewDialog.close();
  }
}

function renderFavoriteTopicOptions() {
  favoriteCardTopicSelectMenu.innerHTML = favoriteTopics
    .map(
      (topic) => `
        <button class="custom-select__option" type="button" role="option" data-favorite-topic-option="${topic.id}">
          ${escapeHtml(topic.label)}
        </button>
      `,
    )
    .join('');
  setFavoriteCardTopicValue(favoriteCardTopicInput.value || selectedFavoriteTopicId);
}

function renderFavoriteTopics() {
  if (favoriteTopics.length === 0) {
    favoriteTopicList.innerHTML = '<div class="empty-state">등록된 favorite topic이 없습니다.</div>';
    favoriteCardListTitle.textContent = 'All Favorite Cards';
    return;
  }

  const normalizedFilter = favoriteTopicFilterText.trim().toLowerCase();
  const visibleTopics = normalizedFilter
    ? favoriteTopics.filter((topic) => getFavoriteTopicSearchText(topic).includes(normalizedFilter))
    : favoriteTopics;

  if (visibleTopics.length === 0) {
    favoriteTopicList.innerHTML = '<div class="empty-state">필터와 일치하는 favorite topic이 없습니다.</div>';
    const topic = getSelectedFavoriteTopic();
    favoriteCardListTitle.textContent = topic ? `${topic.label} Cards` : 'All Favorite Cards';
    return;
  }

  favoriteTopicList.innerHTML = visibleTopics
    .map((topic) => {
      const activeClass = topic.id === selectedFavoriteTopicId ? ' is-current' : '';
      const details = [topic.value, topic.era === null ? null : `${topic.era}`, topic.country].filter(Boolean).join(' · ');
      return `
        <article class="item-card topic-item${activeClass}" data-favorite-topic-id="${topic.id}">
          <button class="topic-item__content" type="button" data-favorite-topic-id="${topic.id}">
            <strong>${escapeHtml(topic.label)}</strong>
            <span>${escapeHtml(details || '추가 정보 없음')}</span>
          </button>
          <div class="topic-item__actions">
            <button class="icon-button" type="button" data-favorite-topic-action="edit" data-favorite-topic-id="${topic.id}" aria-label="${escapeHtml(topic.label)} 편집" title="편집">✎</button>
            <button class="icon-button icon-button--danger" type="button" data-favorite-topic-action="delete" data-favorite-topic-id="${topic.id}" aria-label="${escapeHtml(topic.label)} 삭제" title="삭제">×</button>
          </div>
        </article>
      `;
    })
    .join('');

  const topic = getSelectedFavoriteTopic();
  favoriteCardListTitle.textContent = topic ? `${topic.label} Cards` : 'Favorite Cards';
}

function renderFavoriteCards() {
  const topic = getSelectedFavoriteTopic();
  favoriteCardCountText.textContent = hasMoreFavoriteCards ? `${favoriteCards.length}+개` : `${favoriteCards.length}개`;
  favoriteCardListTitle.textContent = topic ? `${topic.label} Cards` : 'All Favorite Cards';

  if (favoriteCards.length === 0) {
    favoriteCardList.innerHTML = '<div class="empty-state">등록된 favorite card가 없습니다.</div>';
    return;
  }

  favoriteCardList.innerHTML = favoriteCards
    .map((card) => {
      const activeClass = card.id === selectedFavoriteCardId ? ' is-current' : '';
      const thumbMarkup = card.image
        ? `<img class="favorite-card-thumb" src="${escapeHtml(card.image)}" alt="" loading="lazy" />`
        : `<div class="favorite-card-thumb favorite-card-thumb--empty" aria-hidden="true">${escapeHtml(card.name.slice(0, 1) || '?')}</div>`;
      return `
        <article class="item-card favorite-card-item${activeClass}" data-favorite-card-id="${card.id}">
          <button class="favorite-card-thumb-button" type="button" data-favorite-card-action="preview" data-favorite-card-id="${card.id}" aria-label="${escapeHtml(card.name)} 미리보기">
            ${thumbMarkup}
          </button>
          <div class="favorite-card-content">
            <strong>${escapeHtml(card.name)}</strong>
            <p>${escapeHtml(card.description || '설명 없음')}</p>
          </div>
          <div class="word-item__actions favorite-card-actions">
            <button class="icon-button" type="button" data-favorite-card-action="edit" data-favorite-card-id="${card.id}" aria-label="${escapeHtml(card.name)} 편집" title="편집">✎</button>
            <button class="icon-button icon-button--danger" type="button" data-favorite-card-action="delete" data-favorite-card-id="${card.id}" aria-label="${escapeHtml(card.name)} 삭제" title="삭제">×</button>
          </div>
        </article>
      `;
    })
    .join('');

  if (isLoadingMoreFavoriteCards) {
    favoriteCardList.insertAdjacentHTML('beforeend', '<div class="empty-state">favorite cards를 더 불러오는 중입니다.</div>');
  }
}

function renderFavoriteAll() {
  renderFavoriteTopicOptions();
  renderFavoriteTopics();
  renderFavoriteCards();
  setBusy(isBusy);
}

function updateFavoriteTopicSelectionState() {
  favoriteTopicList.querySelectorAll('.topic-item[data-favorite-topic-id]').forEach((item) => {
    item.classList?.toggle('is-current', Number(item.dataset.favoriteTopicId) === selectedFavoriteTopicId);
  });

  const topic = getSelectedFavoriteTopic();
  favoriteCardListTitle.textContent = topic ? `${topic.label} Cards` : 'All Favorite Cards';
}

async function selectFavoriteTopic(topicId) {
  selectedFavoriteTopicId = topicId;
  selectedFavoriteCardId = null;
  favoriteCardPageOffset = 0;
  hasMoreFavoriteCards = false;
  const topic = getSelectedFavoriteTopic();

  if (topic) {
    fillFavoriteTopicForm(topic);
  } else {
    resetFavoriteTopicForm();
  }

  resetFavoriteCardForm();
  updateFavoriteTopicSelectionState();
  favoriteCardList.innerHTML = '<div class="empty-state">favorite cards를 불러오는 중입니다.</div>';
  favoriteCards = topic
    ? await fetchFavoriteCards(topic.id)
    : await fetchFavoriteCards(null, { limit: FAVORITE_CARD_PAGE_SIZE, offset: 0 });
  hasMoreFavoriteCards = !topic && favoriteCards.length === FAVORITE_CARD_PAGE_SIZE;
  favoriteCardPageOffset = favoriteCards.length;
  renderFavoriteCards();
  setBusy(isBusy);
}

async function loadMoreFavoriteCardsIfNeeded() {
  if (selectedFavoriteTopicId !== null || !hasMoreFavoriteCards || isLoadingMoreFavoriteCards || isBusy) {
    return;
  }

  isLoadingMoreFavoriteCards = true;
  const previousScrollTop = favoriteCardList.scrollTop;

  try {
    const nextCards = await fetchFavoriteCards(null, { limit: FAVORITE_CARD_PAGE_SIZE, offset: favoriteCardPageOffset });
    favoriteCards = [...favoriteCards, ...nextCards];
    favoriteCardPageOffset += nextCards.length;
    hasMoreFavoriteCards = nextCards.length === FAVORITE_CARD_PAGE_SIZE;
  } catch (error) {
    setFavoriteStatus(error instanceof Error ? error.message : 'favorite cards를 더 불러오지 못했습니다.');
  } finally {
    isLoadingMoreFavoriteCards = false;
    renderFavoriteCards();
    favoriteCardList.scrollTop = previousScrollTop;
  }
}

async function loadPickYourFavorite() {
  setBusy(true);
  setFavoriteStatus('데이터를 불러오는 중입니다.');
  favoriteTopicList.innerHTML = '<div class="empty-state">favorite topics를 불러오는 중입니다.</div>';
  favoriteCardList.innerHTML = '<div class="empty-state">favorite cards를 불러오는 중입니다.</div>';

  try {
    favoriteTopics = await fetchFavoriteTopics();
    const selectedStillExists = favoriteTopics.some((topic) => topic.id === selectedFavoriteTopicId);
    selectedFavoriteTopicId = selectedStillExists ? selectedFavoriteTopicId : null;
    favoriteCards =
      selectedFavoriteTopicId === null
        ? await fetchFavoriteCards(null, { limit: FAVORITE_CARD_PAGE_SIZE, offset: 0 })
        : await fetchFavoriteCards(selectedFavoriteTopicId);
    hasMoreFavoriteCards = selectedFavoriteTopicId === null && favoriteCards.length === FAVORITE_CARD_PAGE_SIZE;
    favoriteCardPageOffset = favoriteCards.length;

    const topic = getSelectedFavoriteTopic();
    if (topic) {
      fillFavoriteTopicForm(topic);
    } else {
      resetFavoriteTopicForm();
    }

    resetFavoriteCardForm();
    renderFavoriteAll();
    setFavoriteStatus('데이터를 불러왔습니다.');
  } catch (error) {
    favoriteTopics = [];
    favoriteCards = [];
    renderFavoriteAll();
    setFavoriteStatus(error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.');
  } finally {
    setBusy(false);
  }
}

async function removeFavoriteTopic(topic) {
  if (!topic || !window.confirm(`${topic.label} topic과 하위 favorite cards를 삭제할까요?`)) {
    return;
  }

  setBusy(true);
  setFavoriteStatus('favorite topic을 삭제 중입니다.');

  try {
    await deleteFavoriteTopic(topic.id);
    selectedFavoriteTopicId = null;
    selectedFavoriteCardId = null;
    await loadPickYourFavorite();
    closeFavoriteTopicDialog();
    setFavoriteStatus(`${topic.label} favorite topic을 삭제했습니다.`);
  } catch (error) {
    setFavoriteStatus(error instanceof Error ? error.message : 'favorite topic을 삭제하지 못했습니다.');
  } finally {
    setBusy(false);
  }
}

async function removeFavoriteCard(card) {
  if (!card) {
    return;
  }

  setBusy(true);
  setFavoriteStatus('favorite card를 삭제 중입니다.');

  try {
    await deleteFavoriteCard(card.id);
    selectedFavoriteCardId = null;
    resetFavoriteCardForm();
    favoriteCards =
      selectedFavoriteTopicId === null
        ? await fetchFavoriteCards(null, { limit: FAVORITE_CARD_PAGE_SIZE, offset: 0 })
        : await fetchFavoriteCards(selectedFavoriteTopicId);
    hasMoreFavoriteCards = selectedFavoriteTopicId === null && favoriteCards.length === FAVORITE_CARD_PAGE_SIZE;
    favoriteCardPageOffset = favoriteCards.length;
    renderFavoriteAll();
    closeFavoriteCardDialog();
    closeDeleteFavoriteCardDialog();
    setFavoriteStatus(`${card.name} favorite card를 삭제했습니다.`);
  } catch (error) {
    setFavoriteStatus(error instanceof Error ? error.message : 'favorite card를 삭제하지 못했습니다.');
  } finally {
    setBusy(false);
  }
}

async function removeWord(word) {
  if (!word) {
    return;
  }

  setBusy(true);
  setStatus('quiz word를 삭제 중입니다.');

  try {
    await deleteWord(word.id);
    selectedWordId = null;
    resetWordForm();
    await reloadWords();
    renderAll();
    closeWordDialog();
    closeDeleteWordDialog();
    setStatus(`${word.abbreviation} quiz word를 삭제했습니다.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'quiz word를 삭제하지 못했습니다.');
  } finally {
    setBusy(false);
  }
}

async function removeTopic(topic) {
  if (!topic || !window.confirm(`${topic.title} topic와 하위 quiz words를 삭제할까요?`)) {
    return;
  }

  setBusy(true);
  setStatus('topic를 삭제 중입니다.');

  try {
    await deleteTopic(topic.id);
    selectedTopicId = null;
    selectedWordId = null;
    await loadWordsQuiz();
    closeTopicDialog();
    setStatus(`${topic.title} topic를 삭제했습니다.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'topic를 삭제하지 못했습니다.');
  } finally {
    setBusy(false);
  }
}

function fillWordForm(word) {
  selectedWordId = word.id;
  wordIdInput.value = String(word.id);
  setWordTopicValue(word.topicId);
  abbreviationInput.value = word.abbreviation;
  fullNameInput.value = word.fullName;
  wordDescriptionInput.value = word.description;
  wordModeText.textContent = `#${word.id} 편집`;
}

function renderTopicOptions() {
  wordTopicSelectMenu.innerHTML = topics
    .map(
      (topic) => `
        <button class="custom-select__option" type="button" role="option" data-topic-option="${topic.id}">
          ${escapeHtml(topic.title)}
        </button>
      `,
    )
    .join('');
  setWordTopicValue(wordTopicInput.value || selectedTopicId);
}

function renderTopics() {
  if (topics.length === 0) {
    topicList.innerHTML = '<div class="empty-state">등록된 topic가 없습니다.</div>';
    wordListTitle.textContent = 'Quiz Words';
    return;
  }

  const normalizedFilter = topicFilterText.trim().toLowerCase();
  const visibleTopics = normalizedFilter ? topics.filter((topic) => getTopicSearchText(topic).includes(normalizedFilter)) : topics;

  if (visibleTopics.length === 0) {
    topicList.innerHTML = '<div class="empty-state">필터와 일치하는 topic이 없습니다.</div>';
    const topic = getSelectedTopic();
    wordListTitle.textContent = topic ? `${topic.title}` : 'All';
    return;
  }

  topicList.innerHTML = visibleTopics
    .map((topic) => {
      const activeClass = topic.id === selectedTopicId ? ' is-current' : '';
      return `
        <article class="item-card topic-item${activeClass}" data-topic-id="${topic.id}">
          <button class="topic-item__content" type="button" data-topic-id="${topic.id}">
            <strong>${escapeHtml(topic.title)}</strong>
            <span>${escapeHtml(topic.description || '설명 없음')}</span>
          </button>
          <div class="topic-item__actions">
            <button class="icon-button" type="button" data-topic-action="edit" data-topic-id="${topic.id}" aria-label="${escapeHtml(topic.title)} 편집" title="편집">✎</button>
            <button class="icon-button icon-button--danger" type="button" data-topic-action="delete" data-topic-id="${topic.id}" aria-label="${escapeHtml(topic.title)} 삭제" title="삭제">×</button>
          </div>
        </article>
      `;
    })
    .join('');

  const topic = getSelectedTopic();
  wordListTitle.textContent = topic ? `${topic.title}` : 'All';
}

function renderWords() {
  const topic = getSelectedTopic();
  wordCountText.textContent = hasMoreWords ? `${words.length}+개` : `${words.length}개`;
  wordListTitle.textContent = topic ? `${topic.title}` : 'All ';

  if (words.length === 0) {
    wordList.innerHTML = wordFilterText.trim()
      ? '<div class="empty-state">검색어와 일치하는 quiz word가 없습니다.</div>'
      : '<div class="empty-state">등록된 quiz word가 없습니다.</div>';
    return;
  }

  wordList.innerHTML = words
    .map((word) => {
      const activeClass = word.id === selectedWordId ? ' is-current' : '';
      return `
        <article class="item-card word-item${activeClass}" data-word-id="${word.id}">
          <div class="word-item__content">
            <strong>${escapeHtml(word.abbreviation)}</strong>
            <span>${escapeHtml(word.fullName)}</span>
            <p>${escapeHtml(word.description || '설명 없음')}</p>
          </div>
          <div class="word-item__actions">
            <button class="icon-button" type="button" data-word-action="edit" data-word-id="${word.id}" aria-label="${escapeHtml(word.abbreviation)} 편집" title="편집">✎</button>
            <button class="icon-button icon-button--danger" type="button" data-word-action="delete" data-word-id="${word.id}" aria-label="${escapeHtml(word.abbreviation)} 삭제" title="삭제">×</button>
          </div>
        </article>
      `;
    })
    .join('');

  if (isLoadingMoreWords) {
    wordList.insertAdjacentHTML('beforeend', '<div class="empty-state">quiz words를 더 불러오는 중입니다.</div>');
  }
}

function updateTopicSelectionState() {
  topicList.querySelectorAll('.topic-item[data-topic-id]').forEach((item) => {
    item.classList?.toggle('is-current', Number(item.dataset.topicId) === selectedTopicId);
  });

  const topic = getSelectedTopic();
  wordListTitle.textContent = topic ? `${topic.title}` : 'All';
}

function renderAll() {
  renderTopicOptions();
  renderTopics();
  renderWords();
  setBusy(isBusy);
}

function getWordFetchOptions(offset = 0) {
  return {
    q: wordFilterText.trim(),
    limit: WORD_PAGE_SIZE,
    offset,
  };
}

async function reloadWords() {
  const requestSerial = ++wordRequestSerial;
  wordPageOffset = 0;
  hasMoreWords = false;
  words = [];
  wordList.innerHTML = '<div class="empty-state">quiz words를 불러오는 중입니다.</div>';

  const nextWords = await fetchWords(selectedTopicId, getWordFetchOptions(0));

  if (requestSerial !== wordRequestSerial) {
    return;
  }

  words = nextWords;
  hasMoreWords = nextWords.length === WORD_PAGE_SIZE;
  wordPageOffset = nextWords.length;
  renderWords();
  setBusy(isBusy);
}

async function selectTopic(topicId) {
  selectedTopicId = topicId;
  selectedWordId = null;
  const topic = getSelectedTopic();

  if (topic) {
    fillTopicForm(topic);
  } else {
    resetTopicForm();
  }

  resetWordForm();
  updateTopicSelectionState();
  await reloadWords();
}

async function loadMoreWordsIfNeeded() {
  if (!hasMoreWords || isLoadingMoreWords || isBusy) {
    return;
  }

  isLoadingMoreWords = true;
  const previousScrollTop = wordList.scrollTop;

  try {
    const nextWords = await fetchWords(selectedTopicId, getWordFetchOptions(wordPageOffset));
    words = [...words, ...nextWords];
    wordPageOffset += nextWords.length;
    hasMoreWords = nextWords.length === WORD_PAGE_SIZE;
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'quiz words를 더 불러오지 못했습니다.');
  } finally {
    isLoadingMoreWords = false;
    renderWords();
    wordList.scrollTop = previousScrollTop;
  }
}

async function loadWordsQuiz() {
  setBusy(true);
  setStatus('데이터를 불러오는 중입니다.');
  topicList.innerHTML = '<div class="empty-state">topics를 불러오는 중입니다.</div>';
  wordList.innerHTML = '<div class="empty-state">quiz words를 불러오는 중입니다.</div>';

  try {
    topics = await fetchTopics();
    const selectedStillExists = topics.some((topic) => topic.id === selectedTopicId);
    selectedTopicId = selectedStillExists ? selectedTopicId : null;
    words = await fetchWords(selectedTopicId, getWordFetchOptions(0));
    hasMoreWords = words.length === WORD_PAGE_SIZE;
    wordPageOffset = words.length;

    const topic = getSelectedTopic();
    if (topic) {
      fillTopicForm(topic);
    } else {
      resetTopicForm();
    }

    resetWordForm();
    renderAll();
    setStatus('데이터를 불러왔습니다.');
  } catch (error) {
    topics = [];
    words = [];
    renderAll();
    setStatus(error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.');
  } finally {
    setBusy(false);
  }
}

async function setActiveModule(moduleId) {
  activeModuleId = moduleId || activeModuleId || moduleButtons[0]?.dataset.moduleId || null;

  moduleButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.moduleId === activeModuleId);
  });

  modulePanels.forEach((panel) => {
    panel.classList.toggle('is-hidden', panel.dataset.modulePanel !== activeModuleId);
  });

  if (activeModuleId === 'words-quiz' && wordsQuizPanel && !hasLoadedWordsQuiz) {
    hasLoadedWordsQuiz = true;
    await loadWordsQuiz();
  }

  if (activeModuleId === 'pick-your-favorite' && favoritePanel && !hasLoadedPickYourFavorite) {
    hasLoadedPickYourFavorite = true;
    await loadPickYourFavorite();
  }
}

moduleButtons.forEach((button) => {
  on(button.querySelector('.module-button__select'), 'click', async () => {
    await setActiveModule(button.dataset.moduleId);
  });
});

on(newTopicButton, 'click', () => {
  resetTopicForm();
  setBusy(false);
  openTopicDialog();
});

on(newWordButton, 'click', () => {
  resetWordForm();
  setBusy(false);
  openWordDialog();
});

on(newFavoriteTopicButton, 'click', () => {
  resetFavoriteTopicForm();
  setBusy(false);
  openFavoriteTopicDialog();
});

on(newFavoriteCardButton, 'click', () => {
  resetFavoriteCardForm();
  setBusy(false);
  openFavoriteCardDialog();
});

on(cancelTopicButton, 'click', closeTopicDialog);
on(cancelWordButton, 'click', closeWordDialog);
on(cancelFavoriteTopicButton, 'click', closeFavoriteTopicDialog);
on(cancelFavoriteCardButton, 'click', closeFavoriteCardDialog);

on(wordTopicSelectButton, 'click', () => {
  const willOpen = wordTopicSelectMenu.hidden;
  wordTopicSelectMenu.hidden = !willOpen;
  wordTopicSelectButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
});

on(favoriteCardTopicSelectButton, 'click', () => {
  const willOpen = favoriteCardTopicSelectMenu.hidden;
  favoriteCardTopicSelectMenu.hidden = !willOpen;
  favoriteCardTopicSelectButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
});

on(wordTopicSelectMenu, 'click', (event) => {
  const option = event.target.closest('[data-topic-option]');

  if (!option) {
    return;
  }

  setWordTopicValue(option.dataset.topicOption);
  closeWordTopicMenu();
  wordTopicSelectButton.focus();
});

on(favoriteCardTopicSelectMenu, 'click', (event) => {
  const option = event.target.closest('[data-favorite-topic-option]');

  if (!option) {
    return;
  }

  setFavoriteCardTopicValue(option.dataset.favoriteTopicOption);
  closeFavoriteCardTopicMenu();
  favoriteCardTopicSelectButton.focus();
});

document.addEventListener('click', (event) => {
  if (event.target.closest('#wordTopicSelect')) {
    return;
  }

  closeWordTopicMenu();

  if (event.target.closest('#favoriteCardTopicSelect')) {
    return;
  }

  closeFavoriteCardTopicMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeWordTopicMenu();
    closeFavoriteCardTopicMenu();
  }
});

on(topicList, 'click', async (event) => {
  const actionButton = event.target.closest('[data-topic-action]');

  if (actionButton) {
    const topic = topics.find((item) => item.id === Number(actionButton.dataset.topicId));

    if (!topic) {
      return;
    }

    if (actionButton.dataset.topicAction === 'edit') {
      selectedTopicId = topic.id;
      fillTopicForm(topic);
      updateTopicSelectionState();
      setBusy(false);
      openTopicDialog();
      setStatus(`${topic.title} topic를 편집합니다.`);
      return;
    }

    if (actionButton.dataset.topicAction === 'delete') {
      removeTopic(topic);
      return;
    }
  }

  const button = event.target.closest('[data-topic-id]');

  if (!button) {
    return;
  }

  setBusy(true);
  setStatus('topic를 선택하는 중입니다.');

  try {
    await selectTopic(Number(button.dataset.topicId));
    setStatus('');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'topic를 선택하지 못했습니다.');
  } finally {
    setBusy(false);
  }
});

on(wordList, 'click', (event) => {
  const actionButton = event.target.closest('[data-word-action]');

  const wordId = actionButton?.dataset.wordId || event.target.closest('[data-word-id]')?.dataset.wordId;
  const word = words.find((item) => item.id === Number(wordId));

  if (!word) {
    return;
  }

  if (!actionButton) {
    openWordDetailDialog(word);
    return;
  }

  if (actionButton.dataset.wordAction === 'edit') {
    fillWordForm(word);
    renderWords();
    setBusy(false);
    setStatus(`${word.abbreviation} 편집 중입니다.`);
    openWordDialog();
    return;
  }

  if (actionButton.dataset.wordAction === 'delete') {
    openDeleteWordDialog(word);
  }
});

on(wordList, 'scroll', () => {
  const threshold = 24;
  const isNearBottom = wordList.scrollTop + wordList.clientHeight >= wordList.scrollHeight - threshold;

  if (isNearBottom) {
    loadMoreWordsIfNeeded();
  }
});

on(topicFilterInput, 'input', () => {
  topicFilterText = topicFilterInput.value;
  renderTopics();
});

on(wordFilterInput, 'keydown', async (event) => {
  if (event.key !== 'Enter') {
    return;
  }

  event.preventDefault();
  wordFilterText = wordFilterInput.value;

  try {
    await reloadWords();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'quiz words를 검색하지 못했습니다.');
  }
});

on(favoriteTopicFilterInput, 'input', () => {
  favoriteTopicFilterText = favoriteTopicFilterInput.value;
  renderFavoriteTopics();
});

on(favoriteTopicList, 'click', async (event) => {
  const actionButton = event.target.closest('[data-favorite-topic-action]');

  if (actionButton) {
    const topic = favoriteTopics.find((item) => item.id === Number(actionButton.dataset.favoriteTopicId));

    if (!topic) {
      return;
    }

    if (actionButton.dataset.favoriteTopicAction === 'edit') {
      selectedFavoriteTopicId = topic.id;
      fillFavoriteTopicForm(topic);
      updateFavoriteTopicSelectionState();
      setBusy(false);
      openFavoriteTopicDialog();
      setFavoriteStatus(`${topic.label} favorite topic을 편집합니다.`);
      return;
    }

    if (actionButton.dataset.favoriteTopicAction === 'delete') {
      removeFavoriteTopic(topic);
      return;
    }
  }

  const button = event.target.closest('[data-favorite-topic-id]');

  if (!button) {
    return;
  }

  setBusy(true);
  setFavoriteStatus('favorite topic을 선택하는 중입니다.');

  try {
    await selectFavoriteTopic(Number(button.dataset.favoriteTopicId));
    setFavoriteStatus('');
  } catch (error) {
    setFavoriteStatus(error instanceof Error ? error.message : 'favorite topic을 선택하지 못했습니다.');
  } finally {
    setBusy(false);
  }
});

on(favoriteCardList, 'click', (event) => {
  const actionButton = event.target.closest('[data-favorite-card-action]');
  const cardId = actionButton?.dataset.favoriteCardId || event.target.closest('[data-favorite-card-id]')?.dataset.favoriteCardId;
  const card = favoriteCards.find((item) => item.id === Number(cardId));

  if (!card || !actionButton) {
    return;
  }

  if (actionButton.dataset.favoriteCardAction === 'preview') {
    openFavoriteCardPreview(card);
    return;
  }

  if (actionButton.dataset.favoriteCardAction === 'edit') {
    fillFavoriteCardForm(card);
    renderFavoriteCards();
    setBusy(false);
    setFavoriteStatus(`${card.name} 편집 중입니다.`);
    openFavoriteCardDialog();
    return;
  }

  if (actionButton.dataset.favoriteCardAction === 'delete') {
    openDeleteFavoriteCardDialog(card);
  }
});

on(favoriteCardList, 'scroll', () => {
  const threshold = 32;
  const isNearBottom = favoriteCardList.scrollTop + favoriteCardList.clientHeight >= favoriteCardList.scrollHeight - threshold;

  if (isNearBottom) {
    loadMoreFavoriteCardsIfNeeded();
  }
});

on(topicForm, 'submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(topicForm);
  const topic = {
    id: formData.get('id') ? Number(formData.get('id')) : undefined,
    title: String(formData.get('title') || '').trim(),
    description: String(formData.get('description') || '').trim(),
  };

  if (!topic.title) {
    setStatus('Topic title을 입력하세요.');
    return;
  }

  setBusy(true);
  setStatus('topic를 저장 중입니다.');

  try {
    const savedTopic = await saveTopic(topic);
    selectedTopicId = savedTopic.id;
    await loadWordsQuiz();
    fillTopicForm(savedTopic);
    closeTopicDialog();
    setStatus(`${savedTopic.title} topic를 저장했습니다.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'topic를 저장하지 못했습니다.');
  } finally {
    setBusy(false);
  }
});

on(wordForm, 'submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(wordForm);
  const word = {
    id: formData.get('id') ? Number(formData.get('id')) : undefined,
    topicId: Number(formData.get('topicId')),
    abbreviation: String(formData.get('abbreviation') || '')
      .trim()
      .toUpperCase(),
    fullName: String(formData.get('fullName') || '').trim(),
    description: String(formData.get('description') || '').trim(),
  };

  if (!word.topicId || !word.abbreviation || !word.fullName) {
    setStatus('Topic, abbreviation, full name을 모두 입력하세요.');
    return;
  }

  setBusy(true);
  setStatus('quiz word를 저장 중입니다.');

  try {
    const savedWord = await saveWord(word);
    selectedTopicId = savedWord.topicId;
    words = await fetchWords(selectedTopicId);
    fillWordForm(savedWord);
    renderAll();
    closeWordDialog();
    setStatus(`${savedWord.abbreviation} quiz word를 저장했습니다.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'quiz word를 저장하지 못했습니다.');
  } finally {
    setBusy(false);
  }
});

on(favoriteTopicForm, 'submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(favoriteTopicForm);
  const eraValue = String(formData.get('era') || '').trim();
  const topic = {
    id: formData.get('id') ? Number(formData.get('id')) : undefined,
    value: String(formData.get('value') || '').trim(),
    label: String(formData.get('label') || '').trim(),
    country: String(formData.get('country') || '').trim(),
    icon: String(formData.get('icon') || '').trim(),
    era: eraValue ? Number(eraValue) : null,
  };

  if (!topic.value || !topic.label) {
    setFavoriteStatus('Value, label을 모두 입력하세요.');
    return;
  }

  if (eraValue && !Number.isInteger(topic.era)) {
    setFavoriteStatus('Era는 숫자로 입력하세요.');
    return;
  }

  setBusy(true);
  setFavoriteStatus('favorite topic을 저장 중입니다.');

  try {
    const savedTopic = await saveFavoriteTopic(topic);
    selectedFavoriteTopicId = savedTopic.id;
    await loadPickYourFavorite();
    fillFavoriteTopicForm(savedTopic);
    closeFavoriteTopicDialog();
    setFavoriteStatus(`${savedTopic.label} favorite topic을 저장했습니다.`);
  } catch (error) {
    setFavoriteStatus(error instanceof Error ? error.message : 'favorite topic을 저장하지 못했습니다.');
  } finally {
    setBusy(false);
  }
});

on(favoriteCardForm, 'submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(favoriteCardForm);
  const card = {
    id: formData.get('id') ? Number(formData.get('id')) : undefined,
    topicId: Number(formData.get('topicId')),
    name: String(formData.get('name') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    image: String(formData.get('image') || '').trim(),
  };

  if (!card.topicId || !card.name) {
    setFavoriteStatus('Topic, name을 모두 입력하세요.');
    return;
  }

  setBusy(true);
  setFavoriteStatus('favorite card를 저장 중입니다.');

  try {
    const savedCard = await saveFavoriteCard(card);
    selectedFavoriteTopicId = savedCard.topicId;
    favoriteCards = await fetchFavoriteCards(selectedFavoriteTopicId);
    fillFavoriteCardForm(savedCard);
    renderFavoriteAll();
    closeFavoriteCardDialog();
    setFavoriteStatus(`${savedCard.name} favorite card를 저장했습니다.`);
  } catch (error) {
    setFavoriteStatus(error instanceof Error ? error.message : 'favorite card를 저장하지 못했습니다.');
  } finally {
    setBusy(false);
  }
});

on(deleteTopicButton, 'click', () => {
  removeTopic(getSelectedTopic());
});

on(deleteFavoriteTopicButton, 'click', () => {
  removeFavoriteTopic(getSelectedFavoriteTopic());
});

on(cancelDeleteWordButton, 'click', closeDeleteWordDialog);
on(cancelDeleteFavoriteCardButton, 'click', closeDeleteFavoriteCardDialog);
on(closeFavoriteCardPreviewButton, 'click', closeFavoriteCardPreview);

on(confirmDeleteWordButton, 'click', () => {
  removeWord(pendingDeleteWord);
});

on(confirmDeleteFavoriteCardButton, 'click', () => {
  removeFavoriteCard(pendingDeleteFavoriteCard);
});

on(closeWordDetailButton, 'click', closeWordDetailDialog);

setActiveModule(activeModuleId);
