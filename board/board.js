const STORAGE_KEY = 'playground-question-board';

const RETURN_PATHS = {
  'pick-your-favorite': '../pick-your-favorite/',
  'typing-game': '../typing-game/',
  'words-quiz': '../words-quiz/',
};

const params = new URLSearchParams(window.location.search);
const from = params.get('from') || '';

const backLink = document.getElementById('backLink');
const newQuestionButton = document.getElementById('newQuestionButton');
const emptyNewQuestionButton = document.getElementById('emptyNewQuestionButton');
const questionCountText = document.getElementById('questionCountText');
const questionList = document.getElementById('questionList');
const emptyState = document.getElementById('emptyState');
const questionDetail = document.getElementById('questionDetail');
const questionMeta = document.getElementById('questionMeta');
const questionTitle = document.getElementById('questionTitle');
const questionBody = document.getElementById('questionBody');
const deleteQuestionButton = document.getElementById('deleteQuestionButton');
const answerCountText = document.getElementById('answerCountText');
const answerList = document.getElementById('answerList');
const answerForm = document.getElementById('answerForm');
const answerAuthorInput = document.getElementById('answerAuthorInput');
const answerBodyInput = document.getElementById('answerBodyInput');
const questionDialog = document.getElementById('questionDialog');
const questionForm = document.getElementById('questionForm');
const questionTitleInput = document.getElementById('questionTitleInput');
const questionAuthorInput = document.getElementById('questionAuthorInput');
const questionBodyInput = document.getElementById('questionBodyInput');
const cancelQuestionButton = document.getElementById('cancelQuestionButton');

let questions = loadQuestions();
let selectedQuestionId = questions[0]?.id || null;

backLink.href = RETURN_PATHS[from] || '../';

function loadQuestions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveQuestions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeAuthor(value) {
  return value.trim() || '익명';
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function sortQuestions(items) {
  return [...items].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function selectedQuestion() {
  return questions.find((question) => question.id === selectedQuestionId) || null;
}

function render() {
  const sortedQuestions = sortQuestions(questions);
  questionCountText.textContent = `${questions.length}개`;

  if (!sortedQuestions.length) {
    questionList.innerHTML = '<p class="is-empty-message">아직 등록된 질문이 없습니다.</p>';
    questionDetail.hidden = true;
    emptyState.hidden = false;
    return;
  }

  if (!selectedQuestion()) {
    selectedQuestionId = sortedQuestions[0].id;
  }

  questionList.innerHTML = sortedQuestions
    .map((question) => {
      const activeClass = question.id === selectedQuestionId ? ' is-active' : '';
      const answerCount = question.answers?.length || 0;
      return `
        <button class="question-item${activeClass}" type="button" data-question-id="${question.id}">
          <strong>${escapeHtml(question.title)}</strong>
          <span class="question-item__summary">
            <span>${escapeHtml(question.author)} · ${formatDate(question.updatedAt)}</span>
            <span>${answerCount} 답변</span>
          </span>
        </button>
      `;
    })
    .join('');

  renderDetail();
}

function renderDetail() {
  const question = selectedQuestion();

  if (!question) {
    questionDetail.hidden = true;
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  questionDetail.hidden = false;
  questionMeta.textContent = `${question.author} · ${formatDate(question.createdAt)}`;
  questionTitle.textContent = question.title;
  questionBody.textContent = question.body;

  const answers = question.answers || [];
  answerCountText.textContent = `${answers.length}개`;
  answerList.innerHTML = answers.length
    ? answers
        .map(
          (answer) => `
            <article class="answer-card">
              <div class="answer-card__top">
                <strong>${escapeHtml(answer.author)}</strong>
                <span>${formatDate(answer.createdAt)}</span>
              </div>
              <p>${escapeHtml(answer.body)}</p>
            </article>
          `,
        )
        .join('')
    : '<p class="is-empty-message">아직 답변이 없습니다.</p>';
}

function openQuestionDialog() {
  questionForm.reset();
  if (typeof questionDialog.showModal === 'function') {
    questionDialog.showModal();
  } else {
    questionDialog.setAttribute('open', '');
  }
  questionTitleInput.focus();
}

function closeQuestionDialog() {
  if (typeof questionDialog.close === 'function') {
    questionDialog.close();
  } else {
    questionDialog.removeAttribute('open');
  }
}

function addQuestion(event) {
  event.preventDefault();

  const title = questionTitleInput.value.trim();
  const body = questionBodyInput.value.trim();

  if (!title || !body) {
    return;
  }

  const now = new Date().toISOString();
  const question = {
    id: createId(),
    title,
    author: normalizeAuthor(questionAuthorInput.value),
    body,
    answers: [],
    createdAt: now,
    updatedAt: now,
  };

  questions = [question, ...questions];
  selectedQuestionId = question.id;
  saveQuestions();
  closeQuestionDialog();
  render();
}

function addAnswer(event) {
  event.preventDefault();

  const question = selectedQuestion();
  const body = answerBodyInput.value.trim();

  if (!question || !body) {
    return;
  }

  const now = new Date().toISOString();
  question.answers = [
    ...(question.answers || []),
    {
      id: createId(),
      author: normalizeAuthor(answerAuthorInput.value),
      body,
      createdAt: now,
    },
  ];
  question.updatedAt = now;
  saveQuestions();
  answerForm.reset();
  render();
}

function deleteSelectedQuestion() {
  const question = selectedQuestion();

  if (!question || !confirm('이 질문을 삭제할까요?')) {
    return;
  }

  questions = questions.filter((item) => item.id !== question.id);
  selectedQuestionId = sortQuestions(questions)[0]?.id || null;
  saveQuestions();
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

questionList.addEventListener('click', (event) => {
  const item = event.target.closest('[data-question-id]');
  if (!item) {
    return;
  }

  selectedQuestionId = item.dataset.questionId;
  render();
});

newQuestionButton.addEventListener('click', openQuestionDialog);
emptyNewQuestionButton.addEventListener('click', openQuestionDialog);
cancelQuestionButton.addEventListener('click', closeQuestionDialog);
questionForm.addEventListener('submit', addQuestion);
answerForm.addEventListener('submit', addAnswer);
deleteQuestionButton.addEventListener('click', deleteSelectedQuestion);

render();
