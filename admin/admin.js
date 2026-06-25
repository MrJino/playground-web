let activeModuleId = null;
let topics = [];
let words = [];
let selectedTopicId = null;
let selectedWordId = null;
let isBusy = false;
let pendingDeleteWord = null;
let hasLoadedWordsQuiz = false;

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
const {
  fetchTopics,
  saveTopic,
  deleteTopic,
  fetchQuizWords: fetchWords,
  saveQuizWord: saveWord,
  deleteQuizWord: deleteWord,
} = window.PlaygroundCloudflareApi;

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function setStatus(message = '') {
  statusLine.textContent = message;
}

function setBusy(nextBusy) {
  isBusy = nextBusy;
  newTopicButton.disabled = isBusy;
  newWordButton.disabled = isBusy || selectedTopicId === null;
  topicForm.querySelector('[type="submit"]').disabled = isBusy;
  wordForm.querySelector('[type="submit"]').disabled = isBusy || topics.length === 0;
  deleteTopicButton.disabled = isBusy || !topicIdInput.value;
  confirmDeleteWordButton.disabled = isBusy || pendingDeleteWord === null;
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

cancelTopicButton.addEventListener('click', closeTopicDialog);
cancelWordButton.addEventListener('click', closeWordDialog);

wordTopicSelectButton.addEventListener('click', () => {
  const willOpen = wordTopicSelectMenu.hidden;
  wordTopicSelectMenu.hidden = !willOpen;
  wordTopicSelectButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
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

document.addEventListener('click', (event) => {
  if (event.target.closest('#wordTopicSelect')) {
    return;
  }

  closeWordTopicMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeWordTopicMenu();
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

deleteTopicButton.addEventListener('click', () => {
  removeTopic(getSelectedTopic());
});

cancelDeleteWordButton.addEventListener('click', closeDeleteWordDialog);

confirmDeleteWordButton.addEventListener('click', () => {
  removeWord(pendingDeleteWord);
});

closeWordDetailButton.addEventListener('click', closeWordDetailDialog);

setActiveModule(activeModuleId);
