const STORAGE_KEY = 'words-quiz-history';
const SELECTED_TOPIC_STORAGE_KEY = 'words-quiz-selected-topic';
const TOPIC_QUERY_PARAM = 'topicId';
const TOPICS_PATH = './res/topics.json';
const ABBREVIATION_REVEAL_INTERVAL = 500;
const { fetchQuizWords: fetchCloudflareQuizWords, saveQuizWord } = window.PlaygroundCloudflareApi;

let topics = [];
let selectedTopicId = null;
let words = [];
let currentIndex = 0;
let score = 0;
let streak = 0;
let attempts = 0;
let correctAnswers = 0;
let hasAnsweredCurrent = false;
let history = readHistory();
let abbreviationRevealTimer = null;
let descriptionDisplayState = null;

const topicList = document.getElementById('topicList');
const openTopicSearchButton = document.getElementById('openTopicSearchButton');
const topicBrowserPanel = document.getElementById('topicBrowserPanel');
const topicSearchInput = document.getElementById('topicSearchInput');
const topicBrowserGrid = document.getElementById('topicBrowserGrid');
const battlePanel = document.querySelector('.battle-panel');
const quizIntroPanel = document.getElementById('quizIntroPanel');
const quizIntroTitle = document.getElementById('quizIntroTitle');
const quizStartButton = document.getElementById('quizStartButton');
const quizPlayArea = document.getElementById('quizPlayArea');
const historyList = document.getElementById('historyList');
const roundText = document.getElementById('roundText');
const accuracyText = document.getElementById('accuracyText');
const abbreviationText = document.getElementById('abbreviationText');
const answerForm = document.getElementById('answerForm');
const answerSubmitButton = document.querySelector('[type="submit"][form="answerForm"]');
const answerInputs = document.getElementById('answerInputs');
const feedbackBox = document.getElementById('feedbackBox');
const feedbackResult = document.getElementById('feedbackResult');
const feedbackAnswer = document.getElementById('feedbackAnswer');
const descriptionText = document.getElementById('descriptionText');
const descriptionEditButton = document.getElementById('descriptionEditButton');
const descriptionEditDialog = document.getElementById('descriptionEditDialog');
const descriptionEditForm = document.getElementById('descriptionEditForm');
const descriptionEditInput = document.getElementById('descriptionEditInput');
const descriptionEditMessage = document.getElementById('descriptionEditMessage');
const descriptionEditCancelButton = document.getElementById('descriptionEditCancelButton');
const descriptionEditCancelAction = document.getElementById('descriptionEditCancelAction');
const hintButton = document.getElementById('hintButton');
const skipButton = document.getElementById('skipButton');
const resetButton = document.getElementById('resetButton');
const ANSWER_SUBMIT_TEXT = '확인';
const ANSWER_NEXT_TEXT = '다음';

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
  }

  return result;
}

function normalizeAnswer(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function isCorrectAnswer(input, fullName) {
  return normalizeAnswer(input) === normalizeAnswer(fullName);
}

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isValidWord(word) {
  return Boolean(word?.abbreviation && word?.fullName);
}

async function fetchTopics() {
  const response = await window.fetch(TOPICS_PATH);

  if (!response.ok) {
    throw new Error(`Topics load failed: ${response.status}`);
  }

  const loadedTopics = await response.json();
  return (Array.isArray(loadedTopics) ? loadedTopics : []).filter((topic) => topic.id && topic.title);
}

async function fetchQuizWords(topicId) {
  const loadedWords = await fetchCloudflareQuizWords(topicId);
  return loadedWords.filter(isValidWord);
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function stopAbbreviationReveal() {
  if (abbreviationRevealTimer) {
    window.clearInterval(abbreviationRevealTimer);
    abbreviationRevealTimer = null;
  }

  abbreviationText.classList.remove('is-revealing');
}

function setAbbreviationText(value) {
  stopAbbreviationReveal();
  abbreviationText.textContent = value;
}

function revealAbbreviation(value) {
  const letters = Array.from(String(value || ''));

  stopAbbreviationReveal();
  abbreviationText.textContent = '';

  if (letters.length === 0) {
    return;
  }

  let index = 0;
  abbreviationText.classList.add('is-revealing');

  const revealNextLetter = () => {
    const letter = document.createElement('span');
    letter.className = 'abbreviation-letter';
    letter.textContent = letters[index];
    abbreviationText.append(letter);
    index += 1;

    if (index >= letters.length) {
      stopAbbreviationReveal();
    }
  };

  revealNextLetter();

  if (index < letters.length) {
    abbreviationRevealTimer = window.setInterval(revealNextLetter, ABBREVIATION_REVEAL_INTERVAL);
  }
}

function normalizeSearchText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, ' ');
}

function compactSearchText(value) {
  return normalizeSearchText(value).replaceAll(/\s+/g, '');
}

function writeHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
}

function writeSelectedTopicId(topicId) {
  localStorage.setItem(SELECTED_TOPIC_STORAGE_KEY, String(topicId));
}

function clearSelectedTopicId() {
  localStorage.removeItem(SELECTED_TOPIC_STORAGE_KEY);
}

function hasTopicQueryParam() {
  const params = new URLSearchParams(window.location.search);
  return params.has(TOPIC_QUERY_PARAM);
}

function getTopicIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const topicId = Number(params.get(TOPIC_QUERY_PARAM));
  return Number.isInteger(topicId) && topicId > 0 ? topicId : null;
}

function updateTopicQueryParam(topicId, shouldReplace = false) {
  if (!topicId) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(TOPIC_QUERY_PARAM, String(topicId));

  if (url.href === window.location.href) {
    return;
  }

  const method = shouldReplace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', url);
}

function clearTopicQueryParam(shouldReplace = false) {
  if (!hasTopicQueryParam()) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete(TOPIC_QUERY_PARAM);

  const method = shouldReplace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', url);
}

function getCurrentWord() {
  return words[currentIndex];
}

function getSelectedTopic() {
  return topics.find((topic) => topic.id === selectedTopicId) || null;
}

function getFullNameParts(fullName) {
  return String(fullName).trim().split(/\s+/).filter(Boolean);
}

function getAnswerInputElements() {
  return Array.from(answerInputs.querySelectorAll('input'));
}

function getUserAnswer() {
  return getAnswerInputElements()
    .map((input) => input.value.trim())
    .join(' ')
    .trim();
}

function updateStats() {
  roundText.textContent = words.length === 0 ? '0 / 0' : `${currentIndex + 1} / ${words.length}`;
  const accuracy = attempts === 0 ? 0 : Math.round((correctAnswers / attempts) * 100);
  accuracyText.textContent = `정답률 ${accuracy}%`;
}

function renderTopicList() {
  if (topics.length === 0) {
    topicList.innerHTML = '<div class="empty-state">등록된 topic가 없습니다.</div>';
    return;
  }

  topicList.innerHTML = topics
    .map((topic) => {
      const activeClass = topic.id === selectedTopicId ? ' is-current' : '';
      return `
        <button class="topic-chip${activeClass}" type="button" data-topic-id="${topic.id}">
          <strong>${escapeHtml(topic.title)}</strong>
        </button>
      `;
    })
    .join('');
}

function renderTopicBrowser(searchTerm = '') {
  const normalizedSearchTerm = normalizeSearchText(searchTerm);
  const compactTerm = compactSearchText(searchTerm);
  const filteredTopics = topics.filter((topic) => {
    const searchText = normalizeSearchText(`${topic.title} ${topic.description}`);
    const compactSearchTextValue = compactSearchText(`${topic.title} ${topic.description}`);
    return !normalizedSearchTerm || searchText.includes(normalizedSearchTerm) || compactSearchTextValue.includes(compactTerm);
  });

  if (filteredTopics.length === 0) {
    topicBrowserGrid.innerHTML = '<div class="topic-browser-empty">검색 결과가 없습니다.</div>';
    return;
  }

  topicBrowserGrid.innerHTML = filteredTopics
    .map((topic) => {
      const activeClass = topic.id === selectedTopicId ? ' is-current' : '';
      return `
        <button class="topic-browser-card${activeClass}" type="button" data-topic-choice="${topic.id}">
          <strong>${escapeHtml(topic.title)}</strong>
          ${topic.description ? `<p>${escapeHtml(topic.description)}</p>` : ''}
        </button>
      `;
    })
    .join('');
}

function showTopicBrowser({ updateUrl = false, focusSearch = false } = {}) {
  selectedTopicId = null;
  clearSelectedTopicId();
  resetQuizState();
  renderTopicList();
  renderTopicBrowser(topicSearchInput.value);
  topicBrowserPanel.hidden = false;
  battlePanel.hidden = true;
  openTopicSearchButton.disabled = true;

  if (updateUrl) {
    clearTopicQueryParam();
  }

  if (focusSearch) {
    topicSearchInput.focus();
  }
}

function hideTopicBrowser() {
  topicBrowserPanel.hidden = true;
  battlePanel.hidden = false;
  openTopicSearchButton.disabled = false;
}

function resetQuizState() {
  stopAbbreviationReveal();
  words = [];
  currentIndex = 0;
  score = 0;
  streak = 0;
  attempts = 0;
  correctAnswers = 0;
  hasAnsweredCurrent = false;
  updateStats();
}

function showTopicIntro() {
  const topic = getSelectedTopic();
  resetQuizState();
  quizPlayArea.hidden = true;
  quizIntroPanel.hidden = false;
  quizStartButton.disabled = !topic;
  quizStartButton.textContent = '퀴즈시작';

  if (!topic) {
    showTopicBrowser();
    return;
  }

  quizIntroTitle.textContent = topic.title;
}

function showQuizPlayArea() {
  quizIntroPanel.hidden = true;
  quizPlayArea.hidden = false;
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<div class="empty-state">아직 풀이 기록이 없습니다.</div>';
    return;
  }

  historyList.innerHTML = history
    .slice(0, 12)
    .map(
      (item) => `
        <article class="history-card ${item.correct ? 'is-correct' : 'is-wrong'}">
          <strong>${escapeHtml(item.abbreviation)} · ${item.correct ? '정답' : '오답'}</strong>
          <span>${escapeHtml(item.answer || '입력 없음')}</span>
        </article>
      `,
    )
    .join('');
}

function setDescriptionEditVisible(visible) {
  descriptionEditButton.hidden = !visible;
  descriptionEditButton.disabled = !visible;
}

function renderDescriptionText(description) {
  descriptionText.textContent = description;
}

function setFeedback({ correct, answer, description, userAnswer }) {
  feedbackBox.hidden = false;
  descriptionDisplayState = {
    type: 'answer',
    correct,
  };
  feedbackResult.classList.toggle('is-correct', correct);
  feedbackResult.classList.toggle('is-wrong', !correct);
  feedbackResult.textContent = correct ? '정답입니다.' : '오답입니다.';
  feedbackAnswer.textContent = `정답: ${answer}`;
  renderDescriptionText(description);
  setDescriptionEditVisible(Boolean(getCurrentWord()));
}

function clearFeedback() {
  feedbackBox.hidden = true;
  descriptionDisplayState = null;
  feedbackResult.classList.remove('is-correct', 'is-wrong');
  feedbackResult.textContent = '';
  feedbackAnswer.textContent = '';
  descriptionText.textContent = '';
  setDescriptionEditVisible(false);
}

function renderAnswerInputs(word) {
  const parts = getFullNameParts(word.fullName);

  answerInputs.innerHTML = parts
    .map(
      (part, index) => `
        <label class="answer-word-field" style="--answer-ch: ${part.length}">
          <span class="answer-word-prefix" aria-hidden="true">${escapeHtml(part[0] ?? '')}</span>
          <input
            class="answer-word-input"
            name="answerWord${index + 1}"
            type="text"
            size="${part.length}"
            maxlength="${part.length}"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            aria-label="${index + 1}번째 단어, ${escapeHtml(part[0] ?? '')}로 시작"
            placeholder="${'_'.repeat(part.length)}"
            data-answer-index="${index}"
          />
        </label>
      `,
    )
    .join('');

  getAnswerInputElements().forEach((input, index, inputs) => {
    input.addEventListener('keydown', (event) => {
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        inputs[index + 1]?.focus();
      }

      if (event.key === 'Backspace' && input.value === '') {
        inputs[index - 1]?.focus();
      }
    });
  });
}

function renderQuestion() {
  const word = getCurrentWord();
  answerSubmitButton.textContent = ANSWER_SUBMIT_TEXT;

  if (!word) {
    hasAnsweredCurrent = false;
    setAbbreviationText('-');
    answerInputs.innerHTML = '';
    feedbackBox.hidden = false;
    feedbackResult.classList.remove('is-correct', 'is-wrong');
    feedbackResult.textContent = '퀴즈 데이터가 없습니다.';
    feedbackAnswer.textContent = '';
    descriptionText.textContent = selectedTopicId ? '선택한 topic에 퀴즈 데이터를 등록한 뒤 다시 시도하세요.' : 'topic를 선택하거나 추가하세요.';
    setDescriptionEditVisible(false);
    hintButton.disabled = true;
    skipButton.disabled = true;
    answerSubmitButton.disabled = true;
    updateStats();
    return;
  }

  hasAnsweredCurrent = false;
  revealAbbreviation(word.abbreviation);
  renderAnswerInputs(word);
  hintButton.disabled = false;
  skipButton.disabled = false;
  answerSubmitButton.disabled = false;
  clearFeedback();
  updateStats();
  getAnswerInputElements()[0]?.focus();
}

function recordAnswer(word, userAnswer, correct) {
  history.unshift({
    abbreviation: word.abbreviation,
    answer: userAnswer,
    correct,
    answeredAt: new Date().toISOString(),
  });
  writeHistory();
  renderHistory();
}

function submitAnswer(userAnswer) {
  if (hasAnsweredCurrent) {
    goNext();
    return;
  }

  const word = getCurrentWord();
  const correct = isCorrectAnswer(userAnswer, word.fullName);

  attempts += 1;
  hasAnsweredCurrent = true;
  getAnswerInputElements().forEach((input) => {
    input.disabled = true;
  });
  hintButton.disabled = true;
  skipButton.disabled = true;

  if (correct) {
    correctAnswers += 1;
    streak += 1;
    score += 100 + Math.min(streak * 10, 100);
  } else {
    streak = 0;
  }

  setFeedback({
    correct,
    answer: word.fullName,
    description: word.description,
    userAnswer,
  });
  recordAnswer(word, userAnswer, correct);
  updateStats();
  answerSubmitButton.textContent = ANSWER_NEXT_TEXT;
}

function showHint() {
  const word = getCurrentWord();
  const parts = word.fullName.split(/\s+/);
  const hint = parts.map((part) => `${part[0]}${'_'.repeat(Math.max(part.length - 1, 0))}`).join(' ');

  feedbackBox.hidden = false;
  descriptionDisplayState = {
    type: 'hint',
  };
  feedbackResult.classList.remove('is-correct', 'is-wrong');
  feedbackResult.textContent = '힌트';
  feedbackAnswer.textContent = hint;
  renderDescriptionText(word.description);
  setDescriptionEditVisible(true);
}

function closeDescriptionEditor() {
  descriptionEditDialog.close();
}

function openDescriptionEditor() {
  const word = getCurrentWord();

  if (!word) {
    return;
  }

  descriptionEditInput.value = word.description;
  descriptionEditMessage.textContent = '';
  descriptionEditDialog.showModal();
  descriptionEditInput.focus();
}

async function saveCurrentDescription() {
  const word = getCurrentWord();

  if (!word) {
    descriptionEditMessage.textContent = '수정할 퀴즈를 찾지 못했습니다.';
    return;
  }

  const description = descriptionEditInput.value.trim();
  const submitButton = descriptionEditForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  descriptionEditMessage.textContent = '저장 중입니다.';

  try {
    const savedWord = await saveQuizWord({
      id: word.id,
      topicId: word.topicId,
      abbreviation: word.abbreviation,
      fullName: word.fullName,
      description,
    });

    words[currentIndex] = savedWord;
    renderDescriptionText(savedWord.description);
    descriptionEditMessage.textContent = '저장했습니다.';
    closeDescriptionEditor();
  } catch (error) {
    descriptionEditMessage.textContent = error instanceof Error ? error.message : '설명을 저장하지 못했습니다.';
  } finally {
    submitButton.disabled = false;
  }
}

function goNext() {
  currentIndex = (currentIndex + 1) % words.length;
  renderQuestion();
}

function renderLoading() {
  renderTopicList();
  showQuizPlayArea();
  setAbbreviationText('...');
  answerInputs.innerHTML = '';
  feedbackBox.hidden = true;
  setDescriptionEditVisible(false);
  answerSubmitButton.textContent = ANSWER_SUBMIT_TEXT;
  hintButton.disabled = true;
  skipButton.disabled = true;
  answerSubmitButton.disabled = true;
  updateStats();
}

function renderLoadError(error) {
  setAbbreviationText('-');
  answerInputs.innerHTML = '';
  feedbackBox.hidden = false;
  setDescriptionEditVisible(false);
  answerSubmitButton.textContent = ANSWER_SUBMIT_TEXT;
  feedbackResult.classList.remove('is-correct', 'is-wrong');
  feedbackResult.textContent = '데이터 로드 실패';
  feedbackAnswer.textContent = '';
  descriptionText.textContent = error instanceof Error ? error.message : '잠시 후 다시 시도하세요.';
  hintButton.disabled = true;
  skipButton.disabled = true;
  answerSubmitButton.disabled = true;
  updateStats();
}

async function loadQuizWords({ reshuffle = true } = {}) {
  if (selectedTopicId === null) {
    showTopicBrowser({ updateUrl: true, focusSearch: true });
    return;
  }

  renderLoading();

  try {
    const loadedWords = await fetchQuizWords(selectedTopicId);
    words = reshuffle ? shuffle(loadedWords) : loadedWords;
    currentIndex = 0;
    score = 0;
    streak = 0;
    attempts = 0;
    correctAnswers = 0;
    renderQuestion();
  } catch (error) {
    words = [];
    renderLoadError(error);
  }
}

async function loadTopics() {
  topicList.innerHTML = '<div class="empty-state">topic를 불러오는 중입니다.</div>';

  if (!hasTopicQueryParam()) {
    resetQuizState();
    topicBrowserGrid.innerHTML = '<div class="topic-browser-empty">토픽을 불러오는 중입니다.</div>';
    topicBrowserPanel.hidden = false;
    battlePanel.hidden = true;
  }

  try {
    topics = await fetchTopics();
    selectedTopicId = null;

    const initialTopicId = getTopicIdFromUrl();
    if (initialTopicId && selectTopic(initialTopicId, { replace: true })) {
      return;
    }

    clearSelectedTopicId();
    if (hasTopicQueryParam()) {
      clearTopicQueryParam(true);
    }

    showTopicBrowser();
  } catch (error) {
    topics = [];
    selectedTopicId = null;
    topicList.innerHTML = '<div class="empty-state">topic를 불러오지 못했습니다.</div>';
    resetQuizState();
    topicBrowserGrid.innerHTML = '<div class="topic-browser-empty">토픽을 불러오지 못했습니다.</div>';
    topicBrowserPanel.hidden = false;
    battlePanel.hidden = true;
  }
}

function selectTopic(topicId, options = {}) {
  const nextTopicId = Number(topicId);

  if (!topics.some((topic) => topic.id === nextTopicId)) {
    return false;
  }

  selectedTopicId = nextTopicId;
  writeSelectedTopicId(selectedTopicId);
  updateTopicQueryParam(selectedTopicId, options.replace);
  renderTopicList();
  renderTopicBrowser(topicSearchInput.value);
  hideTopicBrowser();
  showTopicIntro();
  return true;
}

answerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitAnswer(getUserAnswer());
});

hintButton.addEventListener('click', showHint);

skipButton.addEventListener('click', () => {
  goNext();
});

descriptionEditButton.addEventListener('click', openDescriptionEditor);

descriptionEditForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveCurrentDescription();
});

descriptionEditCancelButton.addEventListener('click', closeDescriptionEditor);
descriptionEditCancelAction.addEventListener('click', closeDescriptionEditor);

topicList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-topic-id]');

  if (!button) {
    return;
  }

  selectTopic(button.dataset.topicId);
});

openTopicSearchButton.addEventListener('click', () => {
  showTopicBrowser({ updateUrl: true, focusSearch: true });
});

topicSearchInput.addEventListener('input', () => {
  renderTopicBrowser(topicSearchInput.value);
});

topicBrowserGrid.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-topic-choice]');

  if (!button) {
    return;
  }

  selectTopic(button.dataset.topicChoice);
});

quizStartButton.addEventListener('click', () => {
  loadQuizWords();
});

resetButton.addEventListener('click', () => {
  history = [];
  writeHistory();
  renderHistory();
});

window.addEventListener('popstate', () => {
  const topicId = getTopicIdFromUrl();

  if (!topicId || !selectTopic(topicId, { replace: true })) {
    showTopicBrowser();
  }
});

renderHistory();
loadTopics();
