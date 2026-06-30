let favoriteTopics = [];
let favoriteCards = [];
let selectedFavoriteTopicId = null;
let selectedFavoriteCardId = null;
let favoriteTopicFilterText = '';
let favoriteCardPageOffset = 0;
let hasMoreFavoriteCards = false;
let isLoadingMoreFavoriteCards = false;
let isBusy = false;
let pendingDeleteFavoriteCard = null;

const FAVORITE_CARD_PAGE_SIZE = 50;
const DEFAULT_FAVORITE_CARD_IMAGE = '../../assets/images/default-favorite-card.svg';

const favoriteStatusLine = document.getElementById('favoriteStatusLine');
const favoriteTopicList = document.getElementById('favoriteTopicList');
const favoriteTopicDialog = document.getElementById('favoriteTopicDialog');
const favoriteTopicForm = document.getElementById('favoriteTopicForm');
const favoriteTopicIdInput = document.getElementById('favoriteTopicIdInput');
const favoriteTopicValueInput = document.getElementById('favoriteTopicValueInput');
const favoriteTopicLabelInput = document.getElementById('favoriteTopicLabelInput');
const favoriteTopicCategoryInput = document.getElementById('favoriteTopicCategoryInput');
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
const favoriteCardProfileInput = document.getElementById('favoriteCardProfileInput');
const favoriteCardImagePreview = document.getElementById('favoriteCardImagePreview');
const newFavoriteCardButton = document.getElementById('newFavoriteCardButton');
const cancelFavoriteCardButton = document.getElementById('cancelFavoriteCardButton');
const deleteFavoriteCardDialog = document.getElementById('deleteFavoriteCardDialog');
const deleteFavoriteCardMessage = document.getElementById('deleteFavoriteCardMessage');
const cancelDeleteFavoriteCardButton = document.getElementById('cancelDeleteFavoriteCardButton');
const confirmDeleteFavoriteCardButton = document.getElementById('confirmDeleteFavoriteCardButton');

const { fetchFavoriteTopics, saveFavoriteTopic, deleteFavoriteTopic, fetchFavoriteCards, saveFavoriteCard, deleteFavoriteCard } =
  window.PlaygroundCloudflareApi;

const KOREAN_INITIALS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

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

function getFavoriteTopicSearchText(topic) {
  const text = `${topic.label} ${topic.value} ${topic.category || ''} ${topic.country || ''} ${topic.era ?? ''}`.toLowerCase();
  return `${text} ${getKoreanInitials(text)}`;
}

function setFavoriteStatus(message = '') {
  if (favoriteStatusLine) {
    favoriteStatusLine.textContent = message;
  }
}

function setBusy(nextBusy) {
  isBusy = nextBusy;
  setDisabled(newFavoriteTopicButton, isBusy);
  setDisabled(newFavoriteCardButton, isBusy || selectedFavoriteTopicId === null);
  setDisabled(favoriteTopicForm?.querySelector('[type="submit"]'), isBusy);
  setDisabled(favoriteCardForm?.querySelector('[type="submit"]'), isBusy || favoriteTopics.length === 0);
  setDisabled(deleteFavoriteTopicButton, isBusy || !favoriteTopicIdInput?.value);
  setDisabled(confirmDeleteFavoriteCardButton, isBusy || pendingDeleteFavoriteCard === null);
}

function getSelectedFavoriteTopic() {
  return favoriteTopics.find((topic) => topic.id === selectedFavoriteTopicId) || null;
}

function resetFavoriteTopicForm() {
  favoriteTopicIdInput.value = '';
  favoriteTopicValueInput.value = '';
  favoriteTopicLabelInput.value = '';
  favoriteTopicCategoryInput.value = '';
  favoriteTopicCountryInput.value = '';
  favoriteTopicIconInput.value = '';
  favoriteTopicEraInput.value = '';
  favoriteTopicModeText.textContent = '새 favorite topic';
}

function fillFavoriteTopicForm(topic) {
  favoriteTopicIdInput.value = String(topic.id);
  favoriteTopicValueInput.value = topic.value;
  favoriteTopicLabelInput.value = topic.label;
  favoriteTopicCategoryInput.value = topic.category;
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
  favoriteCardProfileInput.value = '';
  setFavoriteCardTopicValue(selectedFavoriteTopicId);
  renderFavoriteCardImagePreview();
}

function fillFavoriteCardForm(card) {
  selectedFavoriteCardId = card.id;
  favoriteCardIdInput.value = String(card.id);
  setFavoriteCardTopicValue(card.topicId);
  favoriteCardNameInput.value = card.name;
  favoriteCardDescriptionInput.value = card.description;
  favoriteCardImageInput.value = card.image;
  favoriteCardProfileInput.value = card.profile;
  renderFavoriteCardImagePreview(card.image);
}

function renderFavoriteCardImagePreview(imageUrl = favoriteCardImageInput?.value.trim()) {
  if (!favoriteCardImagePreview) {
    return;
  }

  const previewUrl = `${imageUrl}/public` || DEFAULT_FAVORITE_CARD_IMAGE;
  favoriteCardImagePreview.innerHTML = `<img src="${escapeHtml(previewUrl)}" alt="" />`;
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
  if (!card) {
    return;
  }

  const topic = favoriteTopics.find((item) => item.id === card.topicId);
  window.PlaygroundFavoriteCardPreview?.open(card, {
    topicLabel: topic ? topic.label : 'Topic 정보 없음',
  });
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
  const visibleTopics = normalizedFilter ? favoriteTopics.filter((topic) => getFavoriteTopicSearchText(topic).includes(normalizedFilter)) : favoriteTopics;

  if (visibleTopics.length === 0) {
    favoriteTopicList.innerHTML = '<div class="empty-state">필터와 일치하는 favorite topic이 없습니다.</div>';
    const topic = getSelectedFavoriteTopic();
    favoriteCardListTitle.textContent = topic ? `${topic.label} Cards` : 'All Favorite Cards';
    return;
  }

  favoriteTopicList.innerHTML = visibleTopics
    .map((topic) => {
      const activeClass = topic.id === selectedFavoriteTopicId ? ' is-current' : '';
      const details = [topic.value, topic.category, topic.era === null ? null : `${topic.era}`, topic.country].filter(Boolean).join(' · ');
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
      const thumbUrl = `${card.image}/thumbnail` || DEFAULT_FAVORITE_CARD_IMAGE;
      const thumbMarkup = `<img class="favorite-card-thumb" src="${escapeHtml(thumbUrl)}" alt="" loading="lazy" />`;
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
  favoriteCards = topic ? await fetchFavoriteCards(topic.id) : await fetchFavoriteCards(null, { limit: FAVORITE_CARD_PAGE_SIZE, offset: 0 });
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

on(cancelFavoriteTopicButton, 'click', closeFavoriteTopicDialog);
on(cancelFavoriteCardButton, 'click', closeFavoriteCardDialog);
on(favoriteCardImageInput, 'input', () => {
  renderFavoriteCardImagePreview();
});

on(favoriteCardTopicSelectButton, 'click', () => {
  const willOpen = favoriteCardTopicSelectMenu.hidden;
  favoriteCardTopicSelectMenu.hidden = !willOpen;
  favoriteCardTopicSelectButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
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
  if (event.target.closest('#favoriteCardTopicSelect')) {
    return;
  }

  closeFavoriteCardTopicMenu();
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

  actionButton.blur();

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

on(favoriteTopicForm, 'submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(favoriteTopicForm);
  const eraValue = String(formData.get('era') || '').trim();
  const topic = {
    id: formData.get('id') ? Number(formData.get('id')) : undefined,
    value: String(formData.get('value') || '').trim(),
    label: String(formData.get('label') || '').trim(),
    category: String(formData.get('category') || '').trim(),
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
    profile: String(formData.get('profile') || '').trim(),
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

on(deleteFavoriteTopicButton, 'click', () => {
  removeFavoriteTopic(getSelectedFavoriteTopic());
});

on(cancelDeleteFavoriteCardButton, 'click', closeDeleteFavoriteCardDialog);

on(confirmDeleteFavoriteCardButton, 'click', () => {
  removeFavoriteCard(pendingDeleteFavoriteCard);
});

loadPickYourFavorite();
