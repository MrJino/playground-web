const WORDS = [
  {
    abbreviation: 'API',
    fullName: 'Application Programming Interface',
    description: '소프트웨어끼리 기능과 데이터를 주고받기 위해 정의한 인터페이스입니다.',
  },
  {
    abbreviation: 'CPU',
    fullName: 'Central Processing Unit',
    description: '컴퓨터의 명령어를 해석하고 실행하는 핵심 처리 장치입니다.',
  },
  {
    abbreviation: 'HTML',
    fullName: 'HyperText Markup Language',
    description: '웹 페이지의 구조와 콘텐츠를 표현하는 마크업 언어입니다.',
  },
  {
    abbreviation: 'CSS',
    fullName: 'Cascading Style Sheets',
    description: '웹 문서의 색상, 배치, 크기 같은 시각 표현을 정의합니다.',
  },
  {
    abbreviation: 'SQL',
    fullName: 'Structured Query Language',
    description: '관계형 데이터베이스의 데이터를 조회하고 조작하는 언어입니다.',
  },
  {
    abbreviation: 'URL',
    fullName: 'Uniform Resource Locator',
    description: '웹에서 리소스의 위치를 나타내는 주소 형식입니다.',
  },
  {
    abbreviation: 'JSON',
    fullName: 'JavaScript Object Notation',
    description: '사람과 기계가 읽기 쉬운 경량 데이터 교환 형식입니다.',
  },
  {
    abbreviation: 'DNS',
    fullName: 'Domain Name System',
    description: '도메인 이름을 네트워크 주소로 변환하는 시스템입니다.',
  },
  {
    abbreviation: 'HTTP',
    fullName: 'HyperText Transfer Protocol',
    description: '웹 클라이언트와 서버가 요청과 응답을 주고받는 프로토콜입니다.',
  },
  {
    abbreviation: 'RAM',
    fullName: 'Random Access Memory',
    description: '프로그램 실행 중 필요한 데이터를 임시로 저장하는 메모리입니다.',
  },
];

const STORAGE_KEY = 'words-quiz-history';
const CUSTOM_WORDS_STORAGE_KEY = 'words-quiz-custom-words';

let words = shuffle(getQuizWords());
let currentIndex = 0;
let score = 0;
let streak = 0;
let attempts = 0;
let correctAnswers = 0;
let hasAnsweredCurrent = false;
let history = readHistory();

const scoreText = document.getElementById('scoreText');
const streakText = document.getElementById('streakText');
const wordList = document.getElementById('wordList');
const historyList = document.getElementById('historyList');
const roundText = document.getElementById('roundText');
const accuracyText = document.getElementById('accuracyText');
const abbreviationText = document.getElementById('abbreviationText');
const answerForm = document.getElementById('answerForm');
const answerInputs = document.getElementById('answerInputs');
const feedbackBox = document.getElementById('feedbackBox');
const feedbackResult = document.getElementById('feedbackResult');
const feedbackAnswer = document.getElementById('feedbackAnswer');
const descriptionText = document.getElementById('descriptionText');
const hintButton = document.getElementById('hintButton');
const skipButton = document.getElementById('skipButton');
const nextButton = document.getElementById('nextButton');
const shuffleButton = document.getElementById('shuffleButton');
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

function readCustomWords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_WORDS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isValidWord) : [];
  } catch {
    return [];
  }
}

function isValidWord(word) {
  return Boolean(word?.abbreviation && word?.fullName && word?.description);
}

function getQuizWords() {
  const customWords = readCustomWords();
  const merged = new Map();

  [...WORDS, ...customWords].forEach((word) => {
    merged.set(word.abbreviation.trim().toUpperCase(), {
      abbreviation: word.abbreviation.trim().toUpperCase(),
      fullName: word.fullName.trim(),
      description: word.description.trim(),
    });
  });

  return Array.from(merged.values());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function writeHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
}

function getCurrentWord() {
  return words[currentIndex];
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
  roundText.textContent = `${currentIndex + 1} / ${words.length}`;
  const accuracy = attempts === 0 ? 0 : Math.round((correctAnswers / attempts) * 100);
  accuracyText.textContent = `정답률 ${accuracy}%`;
}

function renderWordList() {
  const currentWord = getCurrentWord();

  wordList.innerHTML = words
    .map((word, index) => {
      const recent = history.find((item) => item.abbreviation === word.abbreviation);
      const stateClass = recent ? (recent.correct ? ' is-correct' : ' is-wrong') : '';
      const currentClass = word === currentWord ? ' is-current' : '';

      return `
        <div class="word-chip${stateClass}${currentClass}">
          <strong>${escapeHtml(word.abbreviation)}</strong>
          <span>${index + 1}</span>
        </div>
      `;
    })
    .join('');
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
  descriptionText.textContent = correct ? description : `입력: ${userAnswer || '없음'} · ${description}`;
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
        <input
          class="answer-word-input"
          name="answerWord${index + 1}"
          type="text"
          size="${part.length}"
          maxlength="${part.length}"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          aria-label="${index + 1}번째 단어"
          placeholder="${'_'.repeat(part.length)}"
          style="--answer-ch: ${part.length}"
          data-answer-index="${index}"
        />
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
  hasAnsweredCurrent = false;
  abbreviationText.textContent = word.abbreviation;
  renderAnswerInputs(word);
  nextButton.hidden = true;
  hintButton.disabled = false;
  skipButton.disabled = false;
  clearFeedback();
  updateStats();
  renderWordList();
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
  renderWordList();
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

function resetGame({ reshuffle = false } = {}) {
  const quizWords = getQuizWords();
  words = reshuffle ? shuffle(quizWords) : quizWords;
  currentIndex = 0;
  score = 0;
  streak = 0;
  attempts = 0;
  correctAnswers = 0;
  renderQuestion();
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

shuffleButton.addEventListener('click', () => {
  resetGame({ reshuffle: true });
});

resetButton.addEventListener('click', () => {
  history = [];
  writeHistory();
  renderHistory();
});

renderHistory();
renderQuestion();
