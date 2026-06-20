const CLOUDFLARE_API_BASE_URL = 'https://playground-api.for1self.workers.dev';
const SUBJECTS_API_URL = `${CLOUDFLARE_API_BASE_URL}/api/subjects`;
const QUIZ_WORDS_API_URL = `${CLOUDFLARE_API_BASE_URL}/api/quiz-words`;

let subjects = [];
let words = [];
let selectedSubjectId = null;

const subjectForm = document.getElementById('subjectEditorForm');
const subjectIdInput = document.getElementById('subjectIdInput');
const subjectTitleInput = document.getElementById('subjectTitleInput');
const subjectDescriptionInput = document.getElementById('subjectDescriptionInput');
const subjectList = document.getElementById('subjectList');
const newSubjectButton = document.getElementById('newSubjectButton');

const wordForm = document.getElementById('wordEditorForm');
const wordIdInput = document.getElementById('wordIdInput');
const abbreviationInput = document.getElementById('abbreviationInput');
const fullNameInput = document.getElementById('fullNameInput');
const descriptionInput = document.getElementById('descriptionInput');
const wordEditorTitle = document.getElementById('wordEditorTitle');
const editorMessage = document.getElementById('editorMessage');
const savedWordList = document.getElementById('savedWordList');
const refreshButton = document.getElementById('refreshButton');
const newWordButton = document.getElementById('newWordButton');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toSubject(row) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description || '',
  };
}

function toWord(row) {
  return {
    id: Number(row.id),
    subjectId: row.subject_id === null || row.subject_id === undefined ? null : Number(row.subject_id),
    abbreviation: row.abbreviation,
    fullName: row.fullName ?? row.full_name,
    description: row.description || '',
  };
}

function setBusy(isBusy) {
  subjectForm.querySelector('button[type="submit"]').disabled = isBusy;
  wordForm.querySelector('button[type="submit"]').disabled = isBusy || selectedSubjectId === null;
  refreshButton.disabled = isBusy;
  newSubjectButton.disabled = isBusy;
  newWordButton.disabled = isBusy || selectedSubjectId === null;
}

function logApiRequest(url, options = {}) {
  let body;

  try {
    body = options.body ? JSON.parse(options.body) : undefined;
  } catch {
    body = options.body;
  }

  console.log('[WordsQuiz API] request', {
    method: options.method || 'GET',
    url: String(url),
    body,
  });
}

function logApiResponse(url, response, payload) {
  console.log('[WordsQuiz API] response', {
    url: String(url),
    status: response.status,
    ok: response.ok,
    payload,
  });
}

async function requestJson(url, options = {}) {
  logApiRequest(url, options);
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  logApiResponse(url, response, payload);

  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  return payload;
}

async function fetchSubjects() {
  const payload = await requestJson(SUBJECTS_API_URL);
  return Array.isArray(payload.subjects) ? payload.subjects.map(toSubject) : [];
}

async function fetchWords(subjectId) {
  if (subjectId === null) {
    return [];
  }

  const url = new URL(QUIZ_WORDS_API_URL);
  url.searchParams.set('subjectId', String(subjectId));
  const payload = await requestJson(url);
  return Array.isArray(payload.words) ? payload.words.map(toWord) : [];
}

async function saveSubject(subject) {
  const payload = await requestJson(SUBJECTS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subject),
  });

  return toSubject(payload.subject);
}

async function saveWord(word) {
  const payload = await requestJson(QUIZ_WORDS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(word),
  });

  return toWord(payload.word);
}

function resetSubjectForm() {
  subjectIdInput.value = '';
  subjectTitleInput.value = '';
  subjectDescriptionInput.value = '';
  subjectTitleInput.focus();
}

function resetWordForm() {
  wordIdInput.value = '';
  wordForm.reset();
  abbreviationInput.focus();
}

function fillSubjectForm(subject) {
  subjectIdInput.value = String(subject.id);
  subjectTitleInput.value = subject.title;
  subjectDescriptionInput.value = subject.description;
}

function fillWordForm(word) {
  wordIdInput.value = String(word.id);
  abbreviationInput.value = word.abbreviation;
  fullNameInput.value = word.fullName;
  descriptionInput.value = word.description;
  abbreviationInput.focus();
}

function renderSubjects() {
  if (subjects.length === 0) {
    subjectList.innerHTML = '<div class="empty-state">등록된 subject가 없습니다.</div>';
    wordEditorTitle.textContent = '퀴즈 데이터 관리';
    return;
  }

  subjectList.innerHTML = subjects
    .map((subject) => {
      const activeClass = subject.id === selectedSubjectId ? ' is-current' : '';
      return `
        <button class="saved-word-card subject-editor-card${activeClass}" type="button" data-subject-id="${subject.id}">
          <strong>${escapeHtml(subject.title)}</strong>
          <span>${escapeHtml(subject.description || '설명 없음')}</span>
        </button>
      `;
    })
    .join('');

  const subject = subjects.find((item) => item.id === selectedSubjectId);
  wordEditorTitle.textContent = subject ? `${subject.title} 퀴즈 데이터` : '퀴즈 데이터 관리';
}

function renderWords() {
  if (selectedSubjectId === null) {
    savedWordList.innerHTML = '<div class="empty-state">subject를 선택하세요.</div>';
    return;
  }

  if (words.length === 0) {
    savedWordList.innerHTML = '<div class="empty-state">추가한 단어가 없습니다.</div>';
    return;
  }

  savedWordList.innerHTML = words
    .map(
      (word) => `
        <button class="saved-word-card saved-word-card--button" type="button" data-word-id="${word.id}">
          <strong>${escapeHtml(word.abbreviation)}</strong>
          <span>${escapeHtml(word.fullName)}</span>
          <p>${escapeHtml(word.description)}</p>
        </button>
      `,
    )
    .join('');
}

async function selectSubject(subjectId) {
  selectedSubjectId = subjectId;
  const subject = subjects.find((item) => item.id === selectedSubjectId);

  if (subject) {
    fillSubjectForm(subject);
  }

  resetWordForm();
  renderSubjects();
  savedWordList.innerHTML = '<div class="empty-state">불러오는 중입니다.</div>';
  words = await fetchWords(selectedSubjectId);
  renderWords();
  setBusy(false);
}

async function loadAll() {
  setBusy(true);
  subjectList.innerHTML = '<div class="empty-state">subject를 불러오는 중입니다.</div>';
  savedWordList.innerHTML = '<div class="empty-state">퀴즈 데이터를 불러오는 중입니다.</div>';

  try {
    subjects = await fetchSubjects();
    const selectedStillExists = subjects.some((subject) => subject.id === selectedSubjectId);
    selectedSubjectId = selectedStillExists ? selectedSubjectId : subjects[0]?.id ?? null;
    renderSubjects();

    if (selectedSubjectId !== null) {
      await selectSubject(selectedSubjectId);
    } else {
      words = [];
      renderWords();
      resetSubjectForm();
    }

    editorMessage.textContent = '';
  } catch (error) {
    subjectList.innerHTML = '<div class="empty-state">subject를 불러오지 못했습니다.</div>';
    savedWordList.innerHTML = '<div class="empty-state">퀴즈 데이터를 불러오지 못했습니다.</div>';
    editorMessage.textContent = error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.';
  } finally {
    setBusy(false);
  }
}

subjectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(subjectForm);
  const subject = {
    id: formData.get('id') ? Number(formData.get('id')) : undefined,
    title: formData.get('title').trim(),
    description: formData.get('description').trim(),
  };

  if (!subject.title) {
    editorMessage.textContent = 'Subject title을 입력하세요.';
    return;
  }

  setBusy(true);
  editorMessage.textContent = 'Subject를 저장 중입니다.';

  try {
    const savedSubject = await saveSubject(subject);
    selectedSubjectId = savedSubject.id;
    await loadAll();
    fillSubjectForm(savedSubject);
    editorMessage.textContent = `${savedSubject.title} subject를 저장했습니다.`;
  } catch (error) {
    editorMessage.textContent = error instanceof Error ? error.message : 'Subject를 저장하지 못했습니다.';
  } finally {
    setBusy(false);
  }
});

wordForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (selectedSubjectId === null) {
    editorMessage.textContent = '먼저 subject를 선택하세요.';
    return;
  }

  const formData = new FormData(wordForm);
  const word = {
    id: formData.get('id') ? Number(formData.get('id')) : undefined,
    subjectId: selectedSubjectId,
    abbreviation: formData.get('abbreviation').trim().toUpperCase(),
    fullName: formData.get('fullName').trim(),
    description: formData.get('description').trim(),
  };

  if (!word.abbreviation || !word.fullName) {
    editorMessage.textContent = '약자와 full name을 입력하세요.';
    return;
  }

  setBusy(true);
  editorMessage.textContent = '퀴즈 데이터를 저장 중입니다.';

  try {
    const savedWord = await saveWord(word);
    words = await fetchWords(selectedSubjectId);
    renderWords();
    fillWordForm(savedWord);
    editorMessage.textContent = `${savedWord.abbreviation} 퀴즈 데이터를 저장했습니다.`;
  } catch (error) {
    editorMessage.textContent = error instanceof Error ? error.message : '퀴즈 데이터를 저장하지 못했습니다.';
  } finally {
    setBusy(false);
  }
});

subjectList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-subject-id]');

  if (!button) {
    return;
  }

  setBusy(true);

  try {
    await selectSubject(Number(button.dataset.subjectId));
    editorMessage.textContent = '';
  } catch (error) {
    editorMessage.textContent = error instanceof Error ? error.message : 'Subject를 선택하지 못했습니다.';
  } finally {
    setBusy(false);
  }
});

savedWordList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-word-id]');

  if (!button) {
    return;
  }

  const word = words.find((item) => item.id === Number(button.dataset.wordId));

  if (word) {
    fillWordForm(word);
    editorMessage.textContent = `${word.abbreviation} 편집 중입니다.`;
  }
});

newSubjectButton.addEventListener('click', () => {
  selectedSubjectId = null;
  words = [];
  resetSubjectForm();
  resetWordForm();
  renderSubjects();
  renderWords();
  setBusy(false);
  editorMessage.textContent = '새 subject를 입력하세요.';
});

newWordButton.addEventListener('click', () => {
  resetWordForm();
  editorMessage.textContent = '새 퀴즈 데이터를 입력하세요.';
});

refreshButton.addEventListener('click', loadAll);

loadAll();
