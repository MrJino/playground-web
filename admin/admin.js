let activeModuleId = null;
let topics = [];
let words = [];
let selectedTopicId = null;
let selectedWordId = null;
let favoriteTopics = [];
let favoriteCards = [];
let selectedFavoriteTopicId = null;
let selectedFavoriteCardId = null;
let isBusy = false;
let pendingDeleteWord = null;
let pendingDeleteFavoriteCard = null;
let hasLoadedWordsQuiz = false;
let hasLoadedPickYourFavorite = false;

const moduleButtons = document.querySelectorAll('[data-module-id]');
const modulePanels = document.querySelectorAll('[data-module-panel]');
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

const wordList = document.getElementById('wordList');
const wordListTitle = document.getElementById('wordListTitle');
const wordCountText = document.getElementById('wordCountText');
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

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function setStatus(message = '') {
  statusLine.textContent = message;
}

function setFavoriteStatus(message = '') {
  favoriteStatusLine.textContent = message;
}

function setBusy(nextBusy) {
  isBusy = nextBusy;
  newTopicButton.disabled = isBusy;
  newWordButton.disabled = isBusy || selectedTopicId === null;
  topicForm.querySelector('[type="submit"]').disabled = isBusy;
  wordForm.querySelector('[type="submit"]').disabled = isBusy || topics.length === 0;
  deleteTopicButton.disabled = isBusy || !topicIdInput.value;
  confirmDeleteWordButton.disabled = isBusy || pendingDeleteWord === null;
  newFavoriteTopicButton.disabled = isBusy;
  newFavoriteCardButton.disabled = isBusy || selectedFavoriteTopicId === null;
  favoriteTopicForm.querySelector('[type="submit"]').disabled = isBusy;
  favoriteCardForm.querySelector('[type="submit"]').disabled = isBusy || favoriteTopics.length === 0;
  deleteFavoriteTopicButton.disabled = isBusy || !favoriteTopicIdInput.value;
  confirmDeleteFavoriteCardButton.disabled = isBusy || pendingDeleteFavoriteCard === null;
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
    favoriteCardListTitle.textContent = 'Favorite Cards';
    return;
  }

  favoriteTopicList.innerHTML = favoriteTopics
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
  favoriteCardCountText.textContent = `${favoriteCards.length}개`;

  if (!topic) {
    favoriteCardList.innerHTML = '<div class="empty-state">favorite topic을 선택하세요.</div>';
    return;
  }

  if (favoriteCards.length === 0) {
    favoriteCardList.innerHTML = '<div class="empty-state">등록된 favorite card가 없습니다.</div>';
    return;
  }

  favoriteCardList.innerHTML = favoriteCards
    .map((card) => {
      const activeClass = card.id === selectedFavoriteCardId ? ' is-current' : '';
      return `
        <article class="item-card word-item favorite-card-item${activeClass}" data-favorite-card-id="${card.id}">
          <div class="word-item__content">
            <strong>#${escapeHtml(card.id)}</strong>
            <span>${escapeHtml(card.name)}</span>
            <p>${escapeHtml(card.description || card.image || '설명 없음')}</p>
          </div>
          <div class="word-item__actions">
            <button class="icon-button" type="button" data-favorite-card-action="edit" data-favorite-card-id="${card.id}" aria-label="${escapeHtml(card.name)} 편집" title="편집">✎</button>
            <button class="icon-button icon-button--danger" type="button" data-favorite-card-action="delete" data-favorite-card-id="${card.id}" aria-label="${escapeHtml(card.name)} 삭제" title="삭제">×</button>
          </div>
        </article>
      `;
    })
    .join('');
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
  favoriteCardListTitle.textContent = topic ? `${topic.label} Cards` : 'Favorite Cards';
}

async function selectFavoriteTopic(topicId) {
  selectedFavoriteTopicId = topicId;
  selectedFavoriteCardId = null;
  const topic = getSelectedFavoriteTopic();

  if (topic) {
    fillFavoriteTopicForm(topic);
  } else {
    resetFavoriteTopicForm();
  }

  resetFavoriteCardForm();
  updateFavoriteTopicSelectionState();
  favoriteCardList.innerHTML = '<div class="empty-state">favorite cards를 불러오는 중입니다.</div>';
  favoriteCards = topic ? await fetchFavoriteCards(topic.id) : [];
  renderFavoriteCards();
  setBusy(isBusy);
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
    favoriteCards = selectedFavoriteTopicId === null ? [] : await fetchFavoriteCards(selectedFavoriteTopicId);

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
    favoriteCards = selectedFavoriteTopicId === null ? [] : await fetchFavoriteCards(selectedFavoriteTopicId);
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
    words = selectedTopicId === null ? [] : await fetchWords(selectedTopicId);
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

  topicList.innerHTML = topics
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
  wordListTitle.textContent = topic ? `${topic.title} Quiz Words` : 'Quiz Words';
}

function renderWords() {
  const topic = getSelectedTopic();
  wordCountText.textContent = `${words.length}개`;

  if (!topic) {
    wordList.innerHTML = '<div class="empty-state">topic를 선택하세요.</div>';
    return;
  }

  if (words.length === 0) {
    wordList.innerHTML = '<div class="empty-state">등록된 quiz word가 없습니다.</div>';
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
}

function updateTopicSelectionState() {
  topicList.querySelectorAll('.topic-item[data-topic-id]').forEach((item) => {
    item.classList?.toggle('is-current', Number(item.dataset.topicId) === selectedTopicId);
  });

  const topic = getSelectedTopic();
  wordListTitle.textContent = topic ? `${topic.title} Quiz Words` : 'Quiz Words';
}

function renderAll() {
  renderTopicOptions();
  renderTopics();
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
  wordList.innerHTML = '<div class="empty-state">quiz words를 불러오는 중입니다.</div>';
  words = topic ? await fetchWords(topic.id) : [];
  renderWords();
  setBusy(isBusy);
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
    words = selectedTopicId === null ? [] : await fetchWords(selectedTopicId);

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
  activeModuleId = moduleId;

  moduleButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.moduleId === activeModuleId);
  });

  modulePanels.forEach((panel) => {
    panel.classList.toggle('is-hidden', panel.dataset.modulePanel !== activeModuleId);
  });

  if (activeModuleId === 'words-quiz' && !hasLoadedWordsQuiz) {
    hasLoadedWordsQuiz = true;
    await loadWordsQuiz();
  }

  if (activeModuleId === 'pick-your-favorite' && !hasLoadedPickYourFavorite) {
    hasLoadedPickYourFavorite = true;
    await loadPickYourFavorite();
  }
}

moduleButtons.forEach((button) => {
  button.querySelector('.module-button__select').addEventListener('click', async () => {
    await setActiveModule(button.dataset.moduleId);
  });
});

newTopicButton.addEventListener('click', () => {
  resetTopicForm();
  setBusy(false);
  openTopicDialog();
});

newWordButton.addEventListener('click', () => {
  resetWordForm();
  setBusy(false);
  openWordDialog();
});

newFavoriteTopicButton.addEventListener('click', () => {
  resetFavoriteTopicForm();
  setBusy(false);
  openFavoriteTopicDialog();
});

newFavoriteCardButton.addEventListener('click', () => {
  resetFavoriteCardForm();
  setBusy(false);
  openFavoriteCardDialog();
});

cancelTopicButton.addEventListener('click', closeTopicDialog);
cancelWordButton.addEventListener('click', closeWordDialog);
cancelFavoriteTopicButton.addEventListener('click', closeFavoriteTopicDialog);
cancelFavoriteCardButton.addEventListener('click', closeFavoriteCardDialog);

wordTopicSelectButton.addEventListener('click', () => {
  const willOpen = wordTopicSelectMenu.hidden;
  wordTopicSelectMenu.hidden = !willOpen;
  wordTopicSelectButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
});

favoriteCardTopicSelectButton.addEventListener('click', () => {
  const willOpen = favoriteCardTopicSelectMenu.hidden;
  favoriteCardTopicSelectMenu.hidden = !willOpen;
  favoriteCardTopicSelectButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
});

wordTopicSelectMenu.addEventListener('click', (event) => {
  const option = event.target.closest('[data-topic-option]');

  if (!option) {
    return;
  }

  setWordTopicValue(option.dataset.topicOption);
  closeWordTopicMenu();
  wordTopicSelectButton.focus();
});

favoriteCardTopicSelectMenu.addEventListener('click', (event) => {
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

topicList.addEventListener('click', async (event) => {
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

wordList.addEventListener('click', (event) => {
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

favoriteTopicList.addEventListener('click', async (event) => {
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

favoriteCardList.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-favorite-card-action]');
  const cardId = actionButton?.dataset.favoriteCardId || event.target.closest('[data-favorite-card-id]')?.dataset.favoriteCardId;
  const card = favoriteCards.find((item) => item.id === Number(cardId));

  if (!card || !actionButton) {
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

topicForm.addEventListener('submit', async (event) => {
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

wordForm.addEventListener('submit', async (event) => {
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

favoriteTopicForm.addEventListener('submit', async (event) => {
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

favoriteCardForm.addEventListener('submit', async (event) => {
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

deleteTopicButton.addEventListener('click', () => {
  removeTopic(getSelectedTopic());
});

deleteFavoriteTopicButton.addEventListener('click', () => {
  removeFavoriteTopic(getSelectedFavoriteTopic());
});

cancelDeleteWordButton.addEventListener('click', closeDeleteWordDialog);
cancelDeleteFavoriteCardButton.addEventListener('click', closeDeleteFavoriteCardDialog);

confirmDeleteWordButton.addEventListener('click', () => {
  removeWord(pendingDeleteWord);
});

confirmDeleteFavoriteCardButton.addEventListener('click', () => {
  removeFavoriteCard(pendingDeleteFavoriteCard);
});

closeWordDetailButton.addEventListener('click', closeWordDetailDialog);

setActiveModule(activeModuleId);
