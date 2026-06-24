const STORAGE_KEY = 'words-quiz-history';
const SELECTED_SUBJECT_STORAGE_KEY = 'words-quiz-selected-subject';
const SUBJECT_QUERY_PARAM = 'subjectId';
const ABBREVIATION_REVEAL_INTERVAL = 500;
const { fetchTopics: fetchCloudflareSubjects, fetchQuizWords: fetchCloudflareQuizWords, saveQuizWord } = window.PlaygroundCloudflareApi;

let subjects = [];
let selectedSubjectId = null;
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

const subjectList = document.getElementById('subjectList');
const openSubjectSearchButton = document.getElementById('openSubjectSearchButton');
const openAdminConfirmButton = document.getElementById('openAdminConfirmButton');
const subjectBrowserPanel = document.getElementById('subjectBrowserPanel');
const subjectSearchInput = document.getElementById('subjectSearchInput');
const subjectBrowserGrid = document.getElementById('subjectBrowserGrid');
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

async function fetchSubjects() {
  const loadedSubjects = await fetchCloudflareSubjects();
  return loadedSubjects.filter((subject) => subject.id && subject.title);
}

async function fetchQuizWords(subjectId) {
  const loadedWords = await fetchCloudflareQuizWords(subjectId);
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

function writeSelectedSubjectId(subjectId) {
  localStorage.setItem(SELECTED_SUBJECT_STORAGE_KEY, String(subjectId));
}

function clearSelectedSubjectId() {
  localStorage.removeItem(SELECTED_SUBJECT_STORAGE_KEY);
}

function hasSubjectQueryParam() {
  const params = new URLSearchParams(window.location.search);
  return params.has(SUBJECT_QUERY_PARAM);
}

function getSubjectIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const subjectId = Number(params.get(SUBJECT_QUERY_PARAM));
  return Number.isInteger(subjectId) && subjectId > 0 ? subjectId : null;
}

function updateSubjectQueryParam(subjectId, shouldReplace = false) {
  if (!subjectId) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(SUBJECT_QUERY_PARAM, String(subjectId));

  if (url.href === window.location.href) {
    return;
  }

  const method = shouldReplace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', url);
}

function clearSubjectQueryParam(shouldReplace = false) {
  if (!hasSubjectQueryParam()) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete(SUBJECT_QUERY_PARAM);

  const method = shouldReplace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', url);
}

function getCurrentWord() {
  return words[currentIndex];
}

function getSelectedSubject() {
  return subjects.find((subject) => subject.id === selectedSubjectId) || null;
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

function renderSubjectList() {
  if (subjects.length === 0) {
    subjectList.innerHTML = '<div class="empty-state">등록된 subject가 없습니다.</div>';
    return;
  }

  subjectList.innerHTML = subjects
    .map((subject) => {
      const activeClass = subject.id === selectedSubjectId ? ' is-current' : '';
      return `
        <button class="subject-chip${activeClass}" type="button" data-subject-id="${subject.id}">
          <strong>${escapeHtml(subject.title)}</strong>
        </button>
      `;
    })
    .join('');
}

function renderSubjectBrowser(searchTerm = '') {
  const normalizedSearchTerm = normalizeSearchText(searchTerm);
  const compactTerm = compactSearchText(searchTerm);
  const filteredSubjects = subjects.filter((subject) => {
    const searchText = normalizeSearchText(`${subject.title} ${subject.description}`);
    const compactSearchTextValue = compactSearchText(`${subject.title} ${subject.description}`);
    return !normalizedSearchTerm || searchText.includes(normalizedSearchTerm) || compactSearchTextValue.includes(compactTerm);
  });

  if (filteredSubjects.length === 0) {
    subjectBrowserGrid.innerHTML = '<div class="subject-browser-empty">검색 결과가 없습니다.</div>';
    return;
  }

  subjectBrowserGrid.innerHTML = filteredSubjects
    .map((subject) => {
      const activeClass = subject.id === selectedSubjectId ? ' is-current' : '';
      return `
        <button class="subject-browser-card${activeClass}" type="button" data-subject-choice="${subject.id}">
          <strong>${escapeHtml(subject.title)}</strong>
          ${subject.description ? `<p>${escapeHtml(subject.description)}</p>` : ''}
        </button>
      `;
    })
    .join('');
}

function showSubjectBrowser({ updateUrl = false, focusSearch = false } = {}) {
  selectedSubjectId = null;
  clearSelectedSubjectId();
  resetQuizState();
  renderSubjectList();
  renderSubjectBrowser(subjectSearchInput.value);
  subjectBrowserPanel.hidden = false;
  battlePanel.hidden = true;
  openSubjectSearchButton.disabled = true;

  if (updateUrl) {
    clearSubjectQueryParam();
  }

  if (focusSearch) {
    subjectSearchInput.focus();
  }
}

function hideSubjectBrowser() {
  subjectBrowserPanel.hidden = true;
  battlePanel.hidden = false;
  openSubjectSearchButton.disabled = false;
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

function showSubjectIntro() {
  const subject = getSelectedSubject();
  resetQuizState();
  quizPlayArea.hidden = true;
  quizIntroPanel.hidden = false;
  quizStartButton.disabled = !subject;
  quizStartButton.textContent = '퀴즈시작';

  if (!subject) {
    showSubjectBrowser();
    return;
  }

  quizIntroTitle.textContent = subject.title;
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
    descriptionText.textContent = selectedSubjectId ? '선택한 subject에 퀴즈 데이터를 등록한 뒤 다시 시도하세요.' : 'subject를 선택하거나 추가하세요.';
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
  renderSubjectList();
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
  if (selectedSubjectId === null) {
    showSubjectBrowser({ updateUrl: true, focusSearch: true });
    return;
  }

  renderLoading();

  try {
    const loadedWords = await fetchQuizWords(selectedSubjectId);
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

async function loadSubjects() {
  subjectList.innerHTML = '<div class="empty-state">subject를 불러오는 중입니다.</div>';

  if (!hasSubjectQueryParam()) {
    resetQuizState();
    subjectBrowserGrid.innerHTML = '<div class="subject-browser-empty">토픽을 불러오는 중입니다.</div>';
    subjectBrowserPanel.hidden = false;
    battlePanel.hidden = true;
  }

  try {
    subjects = await fetchSubjects();
    selectedSubjectId = null;

    const initialSubjectId = getSubjectIdFromUrl();
    if (initialSubjectId && selectSubject(initialSubjectId, { replace: true })) {
      return;
    }

    clearSelectedSubjectId();
    if (hasSubjectQueryParam()) {
      clearSubjectQueryParam(true);
    }

    showSubjectBrowser();
  } catch (error) {
    subjects = [];
    selectedSubjectId = null;
    subjectList.innerHTML = '<div class="empty-state">subject를 불러오지 못했습니다.</div>';
    resetQuizState();
    subjectBrowserGrid.innerHTML = '<div class="subject-browser-empty">토픽을 불러오지 못했습니다.</div>';
    subjectBrowserPanel.hidden = false;
    battlePanel.hidden = true;
  }
}

function selectSubject(subjectId, options = {}) {
  const nextSubjectId = Number(subjectId);

  if (!subjects.some((subject) => subject.id === nextSubjectId)) {
    return false;
  }

  selectedSubjectId = nextSubjectId;
  writeSelectedSubjectId(selectedSubjectId);
  updateSubjectQueryParam(selectedSubjectId, options.replace);
  renderSubjectList();
  renderSubjectBrowser(subjectSearchInput.value);
  hideSubjectBrowser();
  showSubjectIntro();
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

openAdminConfirmButton.addEventListener('click', () => {
  window.ConfirmDialog.show({
    title: 'Admin 페이지로 이동하시겠습니까?',
    message: '현재 퀴즈 화면을 떠나 관리자 페이지로 이동합니다.',
    confirmText: '네',
    cancelText: '아니오',
    onConfirm: () => {
      window.location.href = '../admin/';
    },
  });
});

descriptionEditButton.addEventListener('click', openDescriptionEditor);

descriptionEditForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveCurrentDescription();
});

descriptionEditCancelButton.addEventListener('click', closeDescriptionEditor);
descriptionEditCancelAction.addEventListener('click', closeDescriptionEditor);

subjectList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-subject-id]');

  if (!button) {
    return;
  }

  selectSubject(button.dataset.subjectId);
});

openSubjectSearchButton.addEventListener('click', () => {
  showSubjectBrowser({ updateUrl: true, focusSearch: true });
});

subjectSearchInput.addEventListener('input', () => {
  renderSubjectBrowser(subjectSearchInput.value);
});

subjectBrowserGrid.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-subject-choice]');

  if (!button) {
    return;
  }

  selectSubject(button.dataset.subjectChoice);
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
  const subjectId = getSubjectIdFromUrl();

  if (!subjectId || !selectSubject(subjectId, { replace: true })) {
    showSubjectBrowser();
  }
});

renderHistory();
loadSubjects();
