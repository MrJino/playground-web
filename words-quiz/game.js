const CLOUDFLARE_API_BASE_URL = 'https://playground-api.for1self.workers.dev';
const QUIZ_WORDS_API_URL = `${CLOUDFLARE_API_BASE_URL}/api/quiz-words`;
const SUBJECTS_API_URL = `${CLOUDFLARE_API_BASE_URL}/api/subjects`;
const STORAGE_KEY = 'words-quiz-history';
const SELECTED_SUBJECT_STORAGE_KEY = 'words-quiz-selected-subject';
const ABBREVIATION_REVEAL_INTERVAL = 600;

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

const scoreText = document.getElementById('scoreText');
const streakText = document.getElementById('streakText');
const subjectList = document.getElementById('subjectList');
const openSubjectSearchButton = document.getElementById('openSubjectSearchButton');
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
const hintButton = document.getElementById('hintButton');
const skipButton = document.getElementById('skipButton');
const nextButton = document.getElementById('nextButton');
const resetButton = document.getElementById('resetButton');

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

function toSubject(row) {
  return {
    id: Number(row.id),
    title: String(row.title || '').trim(),
    description: String(row.description || '').trim(),
  };
}

function toQuizWord(row) {
  return {
    id: Number(row.id),
    subjectId: row.subject_id === null || row.subject_id === undefined ? null : Number(row.subject_id),
    abbreviation: String(row.abbreviation || '')
      .trim()
      .toUpperCase(),
    fullName: String(row.full_name || row.fullName || '').trim(),
    description: String(row.description || '').trim(),
  };
}

function logApiRequest(label, url, options = {}) {
  console.log('[WordsQuiz API] request', {
    label,
    method: options.method || 'GET',
    url: String(url),
  });
}

function logApiResponse(label, response, payload) {
  console.log('[WordsQuiz API] response', {
    label,
    status: response.status,
    ok: response.ok,
    payload,
  });
}

async function fetchSubjects() {
  logApiRequest('fetchSubjects', SUBJECTS_API_URL);
  const response = await window.fetch(SUBJECTS_API_URL);
  const payload = await response.json();
  logApiResponse('fetchSubjects', response, payload);

  if (!response.ok) {
    throw new Error(`Failed to load subjects: ${response.status}`);
  }

  const rows = Array.isArray(payload.subjects) ? payload.subjects : [];
  return rows.map(toSubject).filter((subject) => subject.id && subject.title);
}

async function fetchQuizWords(subjectId) {
  const url = new URL(QUIZ_WORDS_API_URL);

  if (subjectId !== null) {
    url.searchParams.set('subjectId', String(subjectId));
  }

  logApiRequest('fetchQuizWords', url);
  const response = await window.fetch(url);
  const payload = await response.json();
  logApiResponse('fetchQuizWords', response, payload);

  if (!response.ok) {
    throw new Error(`Failed to load quiz words: ${response.status}`);
  }

  const rows = Array.isArray(payload.words) ? payload.words : [];
  return rows.map(toQuizWord).filter(isValidWord);
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
  scoreText.textContent = String(score);
  streakText.textContent = String(streak);
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
          <span class="subject-browser-card__group">Subject</span>
          <strong>${escapeHtml(subject.title)}</strong>
          ${subject.description ? `<p>${escapeHtml(subject.description)}</p>` : ''}
        </button>
      `;
    })
    .join('');
}

function showSubjectBrowser({ focusSearch = false } = {}) {
  selectedSubjectId = null;
  clearSelectedSubjectId();
  renderSubjectList();
  showSubjectIntro();
  renderSubjectBrowser(subjectSearchInput.value);
  subjectBrowserPanel.hidden = false;
  battlePanel.hidden = true;

  if (focusSearch) {
    subjectSearchInput.focus();
  }
}

function hideSubjectBrowser() {
  subjectBrowserPanel.hidden = true;
  battlePanel.hidden = false;
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
    quizIntroTitle.textContent = '토픽을 선택하세요';
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

function setFeedback({ correct, answer, description, userAnswer }) {
  feedbackBox.hidden = false;
  feedbackResult.classList.toggle('is-correct', correct);
  feedbackResult.classList.toggle('is-wrong', !correct);
  feedbackResult.textContent = correct ? '정답입니다.' : '오답입니다.';
  feedbackAnswer.textContent = `정답: ${answer}`;
  descriptionText.textContent = correct ? description : `입력: ${userAnswer || '없음'}\n${description}`;
}

function clearFeedback() {
  feedbackBox.hidden = true;
  feedbackResult.classList.remove('is-correct', 'is-wrong');
  feedbackResult.textContent = '';
  feedbackAnswer.textContent = '';
  descriptionText.textContent = '';
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

  if (!word) {
    hasAnsweredCurrent = false;
    setAbbreviationText('-');
    answerInputs.innerHTML = '';
    feedbackBox.hidden = false;
    feedbackResult.classList.remove('is-correct', 'is-wrong');
    feedbackResult.textContent = '퀴즈 데이터가 없습니다.';
    feedbackAnswer.textContent = '';
    descriptionText.textContent = selectedSubjectId ? '선택한 subject에 퀴즈 데이터를 등록한 뒤 다시 시도하세요.' : 'subject를 선택하거나 추가하세요.';
    nextButton.hidden = true;
    hintButton.disabled = true;
    skipButton.disabled = true;
    answerSubmitButton.disabled = true;
    updateStats();
    return;
  }

  hasAnsweredCurrent = false;
  revealAbbreviation(word.abbreviation);
  renderAnswerInputs(word);
  nextButton.hidden = true;
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
  nextButton.hidden = false;

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
  nextButton.focus();
}

function showHint() {
  const word = getCurrentWord();
  const parts = word.fullName.split(/\s+/);
  const hint = parts.map((part) => `${part[0]}${'_'.repeat(Math.max(part.length - 1, 0))}`).join(' ');

  feedbackBox.hidden = false;
  feedbackResult.classList.remove('is-correct', 'is-wrong');
  feedbackResult.textContent = '힌트';
  feedbackAnswer.textContent = hint;
  descriptionText.textContent = word.description;
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
  hintButton.disabled = true;
  skipButton.disabled = true;
  answerSubmitButton.disabled = true;
  updateStats();
}

function renderLoadError(error) {
  setAbbreviationText('-');
  answerInputs.innerHTML = '';
  feedbackBox.hidden = false;
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
    showSubjectIntro();
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

  try {
    subjects = await fetchSubjects();
    selectedSubjectId = null;
    clearSelectedSubjectId();
    renderSubjectList();
    renderSubjectBrowser(subjectSearchInput.value);
    showSubjectIntro();
  } catch (error) {
    subjects = [];
    selectedSubjectId = null;
    subjectList.innerHTML = '<div class="empty-state">subject를 불러오지 못했습니다.</div>';
    resetQuizState();
    quizPlayArea.hidden = true;
    quizIntroPanel.hidden = false;
    quizStartButton.disabled = true;
    quizIntroTitle.textContent = 'subject를 불러오지 못했습니다.';
  }
}

answerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitAnswer(getUserAnswer());
});

hintButton.addEventListener('click', showHint);

skipButton.addEventListener('click', () => {
  submitAnswer('');
});

nextButton.addEventListener('click', goNext);

subjectList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-subject-id]');

  if (!button) {
    return;
  }

  selectedSubjectId = Number(button.dataset.subjectId);
  writeSelectedSubjectId(selectedSubjectId);
  renderSubjectList();
  hideSubjectBrowser();
  showSubjectIntro();
});

openSubjectSearchButton.addEventListener('click', () => {
  showSubjectBrowser({ focusSearch: true });
});

subjectSearchInput.addEventListener('input', () => {
  renderSubjectBrowser(subjectSearchInput.value);
});

subjectBrowserGrid.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-subject-choice]');

  if (!button) {
    return;
  }

  selectedSubjectId = Number(button.dataset.subjectChoice);
  writeSelectedSubjectId(selectedSubjectId);
  renderSubjectList();
  renderSubjectBrowser(subjectSearchInput.value);
  hideSubjectBrowser();
  showSubjectIntro();
});

quizStartButton.addEventListener('click', () => {
  loadQuizWords();
});

resetButton.addEventListener('click', () => {
  history = [];
  writeHistory();
  renderHistory();
});

renderHistory();
loadSubjects();
