const CLOUDFLARE_API_BASE_URL = 'https://playground-api.for1self.workers.dev';
const SUBJECTS_API_URL = `${CLOUDFLARE_API_BASE_URL}/api/subjects`;
const QUIZ_WORDS_API_URL = `${CLOUDFLARE_API_BASE_URL}/api/quiz-words`;

let activeModuleId = 'words-quiz';
let subjects = [];
let words = [];
let selectedSubjectId = null;
let selectedWordId = null;
let isBusy = false;
let pendingDeleteWord = null;

const moduleButtons = document.querySelectorAll('[data-module-id]');
const modulePanels = document.querySelectorAll('[data-module-panel]');
const statusLine = document.getElementById('statusLine');

const subjectList = document.getElementById('subjectList');
const subjectDialog = document.getElementById('subjectDialog');
const subjectForm = document.getElementById('subjectForm');
const subjectIdInput = document.getElementById('subjectIdInput');
const subjectTitleInput = document.getElementById('subjectTitleInput');
const subjectDescriptionInput = document.getElementById('subjectDescriptionInput');
const subjectModeText = document.getElementById('subjectModeText');
const newSubjectButton = document.getElementById('newSubjectButton');
const deleteSubjectButton = document.getElementById('deleteSubjectButton');
const cancelSubjectButton = document.getElementById('cancelSubjectButton');

const wordList = document.getElementById('wordList');
const wordListTitle = document.getElementById('wordListTitle');
const wordCountText = document.getElementById('wordCountText');
const wordDialog = document.getElementById('wordDialog');
const wordForm = document.getElementById('wordForm');
const wordIdInput = document.getElementById('wordIdInput');
const wordSubjectInput = document.getElementById('wordSubjectInput');
const wordSubjectSelectButton = document.getElementById('wordSubjectSelectButton');
const wordSubjectSelectMenu = document.getElementById('wordSubjectSelectMenu');
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
    title: String(row.title || '').trim(),
    description: String(row.description || '').trim(),
  };
}

function toWord(row) {
  return {
    id: Number(row.id),
    subjectId: row.subject_id === null || row.subject_id === undefined ? null : Number(row.subject_id),
    abbreviation: String(row.abbreviation || '').trim(),
    fullName: String(row.fullName ?? row.full_name ?? '').trim(),
    description: String(row.description || '').trim(),
  };
}

function setStatus(message = '') {
  statusLine.textContent = message;
}

function setBusy(nextBusy) {
  isBusy = nextBusy;
  newSubjectButton.disabled = isBusy;
  newWordButton.disabled = isBusy || selectedSubjectId === null;
  subjectForm.querySelector('[type="submit"]').disabled = isBusy;
  wordForm.querySelector('[type="submit"]').disabled = isBusy || subjects.length === 0;
  deleteSubjectButton.disabled = isBusy || !subjectIdInput.value;
  confirmDeleteWordButton.disabled = isBusy || pendingDeleteWord === null;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  return payload;
}

async function fetchSubjects() {
  const payload = await requestJson(SUBJECTS_API_URL);
  return Array.isArray(payload.subjects) ? payload.subjects.map(toSubject) : [];
}

async function fetchWords(subjectId = null) {
  const url = new URL(QUIZ_WORDS_API_URL);

  if (subjectId !== null) {
    url.searchParams.set('subjectId', String(subjectId));
  }

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

async function deleteSubject(id) {
  const url = new URL(SUBJECTS_API_URL);
  url.searchParams.set('id', String(id));
  const payload = await requestJson(url, {
    method: 'DELETE',
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

async function deleteWord(id) {
  const url = new URL(QUIZ_WORDS_API_URL);
  url.searchParams.set('id', String(id));
  const payload = await requestJson(url, {
    method: 'DELETE',
  });

  return toWord(payload.word);
}

function getSelectedSubject() {
  return subjects.find((subject) => subject.id === selectedSubjectId) || null;
}

function getSelectedWord() {
  return words.find((word) => word.id === selectedWordId) || null;
}

function resetSubjectForm() {
  subjectIdInput.value = '';
  subjectTitleInput.value = '';
  subjectDescriptionInput.value = '';
  subjectModeText.textContent = '새 subject';
}

function openSubjectDialog() {
  subjectDialog.showModal();
  subjectTitleInput.focus();
}

function closeSubjectDialog() {
  subjectDialog.close();
}

function fillSubjectForm(subject) {
  subjectIdInput.value = String(subject.id);
  subjectTitleInput.value = subject.title;
  subjectDescriptionInput.value = subject.description;
  subjectModeText.textContent = `#${subject.id} 편집`;
}

function closeWordSubjectMenu() {
  wordSubjectSelectMenu.hidden = true;
  wordSubjectSelectButton.setAttribute('aria-expanded', 'false');
}

function setWordSubjectValue(subjectId) {
  const normalizedSubjectId = subjectId === null || subjectId === '' ? '' : String(subjectId);
  const subject = subjects.find((item) => String(item.id) === normalizedSubjectId);
  wordSubjectInput.value = normalizedSubjectId;
  wordSubjectSelectButton.textContent = subject ? subject.title : 'Subject 선택';

  wordSubjectSelectMenu.querySelectorAll('[data-subject-option]').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.subjectOption === normalizedSubjectId);
    button.setAttribute('aria-selected', button.dataset.subjectOption === normalizedSubjectId ? 'true' : 'false');
  });
}

function resetWordForm() {
  selectedWordId = null;
  wordIdInput.value = '';
  abbreviationInput.value = '';
  fullNameInput.value = '';
  wordDescriptionInput.value = '';
  setWordSubjectValue(selectedSubjectId);
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
    words = selectedSubjectId === null ? [] : await fetchWords(selectedSubjectId);
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

async function removeSubject(subject) {
  if (!subject || !window.confirm(`${subject.title} subject와 하위 quiz words를 삭제할까요?`)) {
    return;
  }

  setBusy(true);
  setStatus('subject를 삭제 중입니다.');

  try {
    await deleteSubject(subject.id);
    selectedSubjectId = null;
    selectedWordId = null;
    await loadWordsQuiz();
    closeSubjectDialog();
    setStatus(`${subject.title} subject를 삭제했습니다.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'subject를 삭제하지 못했습니다.');
  } finally {
    setBusy(false);
  }
}

function fillWordForm(word) {
  selectedWordId = word.id;
  wordIdInput.value = String(word.id);
  setWordSubjectValue(word.subjectId);
  abbreviationInput.value = word.abbreviation;
  fullNameInput.value = word.fullName;
  wordDescriptionInput.value = word.description;
  wordModeText.textContent = `#${word.id} 편집`;
}

function renderSubjectOptions() {
  wordSubjectSelectMenu.innerHTML = subjects
    .map(
      (subject) => `
        <button class="custom-select__option" type="button" role="option" data-subject-option="${subject.id}">
          ${escapeHtml(subject.title)}
        </button>
      `,
    )
    .join('');
  setWordSubjectValue(wordSubjectInput.value || selectedSubjectId);
}

function renderSubjects() {
  if (subjects.length === 0) {
    subjectList.innerHTML = '<div class="empty-state">등록된 subject가 없습니다.</div>';
    wordListTitle.textContent = 'Quiz Words';
    return;
  }

  subjectList.innerHTML = subjects
    .map((subject) => {
      const activeClass = subject.id === selectedSubjectId ? ' is-current' : '';
      return `
        <article class="item-card subject-item${activeClass}" data-subject-id="${subject.id}">
          <button class="subject-item__content" type="button" data-subject-id="${subject.id}">
            <strong>${escapeHtml(subject.title)}</strong>
            <span>${escapeHtml(subject.description || '설명 없음')}</span>
          </button>
          <div class="subject-item__actions">
            <button class="icon-button" type="button" data-subject-action="edit" data-subject-id="${subject.id}" aria-label="${escapeHtml(subject.title)} 편집" title="편집">✎</button>
            <button class="icon-button icon-button--danger" type="button" data-subject-action="delete" data-subject-id="${subject.id}" aria-label="${escapeHtml(subject.title)} 삭제" title="삭제">×</button>
          </div>
        </article>
      `;
    })
    .join('');

  const subject = getSelectedSubject();
  wordListTitle.textContent = subject ? `${subject.title} Quiz Words` : 'Quiz Words';
}

function renderWords() {
  const subject = getSelectedSubject();
  wordCountText.textContent = `${words.length}개`;

  if (!subject) {
    wordList.innerHTML = '<div class="empty-state">subject를 선택하세요.</div>';
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

function updateSubjectSelectionState() {
  subjectList.querySelectorAll('.subject-item[data-subject-id]').forEach((item) => {
    item.classList?.toggle('is-current', Number(item.dataset.subjectId) === selectedSubjectId);
  });

  const subject = getSelectedSubject();
  wordListTitle.textContent = subject ? `${subject.title} Quiz Words` : 'Quiz Words';
}

function renderAll() {
  renderSubjectOptions();
  renderSubjects();
  renderWords();
  setBusy(isBusy);
}

async function selectSubject(subjectId) {
  selectedSubjectId = subjectId;
  selectedWordId = null;
  const subject = getSelectedSubject();

  if (subject) {
    fillSubjectForm(subject);
  } else {
    resetSubjectForm();
  }

  resetWordForm();
  updateSubjectSelectionState();
  wordList.innerHTML = '<div class="empty-state">quiz words를 불러오는 중입니다.</div>';
  words = subject ? await fetchWords(subject.id) : [];
  renderWords();
  setBusy(isBusy);
}

async function loadWordsQuiz() {
  setBusy(true);
  setStatus('데이터를 불러오는 중입니다.');
  subjectList.innerHTML = '<div class="empty-state">subjects를 불러오는 중입니다.</div>';
  wordList.innerHTML = '<div class="empty-state">quiz words를 불러오는 중입니다.</div>';

  try {
    subjects = await fetchSubjects();
    const selectedStillExists = subjects.some((subject) => subject.id === selectedSubjectId);
    selectedSubjectId = selectedStillExists ? selectedSubjectId : subjects[0]?.id ?? null;
    words = selectedSubjectId === null ? [] : await fetchWords(selectedSubjectId);

    const subject = getSelectedSubject();
    if (subject) {
      fillSubjectForm(subject);
    } else {
      resetSubjectForm();
    }

    resetWordForm();
    renderAll();
    setStatus('데이터를 불러왔습니다.');
  } catch (error) {
    subjects = [];
    words = [];
    renderAll();
    setStatus(error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.');
  } finally {
    setBusy(false);
  }
}

function setActiveModule(moduleId) {
  activeModuleId = moduleId;

  moduleButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.moduleId === activeModuleId);
  });

  modulePanels.forEach((panel) => {
    panel.classList.toggle('is-hidden', panel.dataset.modulePanel !== activeModuleId);
  });
}

moduleButtons.forEach((button) => {
  button.querySelector('.module-button__select').addEventListener('click', () => {
    setActiveModule(button.dataset.moduleId);
  });
});

newSubjectButton.addEventListener('click', () => {
  resetSubjectForm();
  setBusy(false);
  openSubjectDialog();
});

newWordButton.addEventListener('click', () => {
  resetWordForm();
  setBusy(false);
  openWordDialog();
});

cancelSubjectButton.addEventListener('click', closeSubjectDialog);
cancelWordButton.addEventListener('click', closeWordDialog);

wordSubjectSelectButton.addEventListener('click', () => {
  const willOpen = wordSubjectSelectMenu.hidden;
  wordSubjectSelectMenu.hidden = !willOpen;
  wordSubjectSelectButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
});

wordSubjectSelectMenu.addEventListener('click', (event) => {
  const option = event.target.closest('[data-subject-option]');

  if (!option) {
    return;
  }

  setWordSubjectValue(option.dataset.subjectOption);
  closeWordSubjectMenu();
  wordSubjectSelectButton.focus();
});

document.addEventListener('click', (event) => {
  if (event.target.closest('#wordSubjectSelect')) {
    return;
  }

  closeWordSubjectMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeWordSubjectMenu();
  }
});

subjectList.addEventListener('click', async (event) => {
  const actionButton = event.target.closest('[data-subject-action]');

  if (actionButton) {
    const subject = subjects.find((item) => item.id === Number(actionButton.dataset.subjectId));

    if (!subject) {
      return;
    }

    if (actionButton.dataset.subjectAction === 'edit') {
      selectedSubjectId = subject.id;
      fillSubjectForm(subject);
      updateSubjectSelectionState();
      setBusy(false);
      openSubjectDialog();
      setStatus(`${subject.title} subject를 편집합니다.`);
      return;
    }

    if (actionButton.dataset.subjectAction === 'delete') {
      removeSubject(subject);
      return;
    }
  }

  const button = event.target.closest('[data-subject-id]');

  if (!button) {
    return;
  }

  setBusy(true);
  setStatus('subject를 선택하는 중입니다.');

  try {
    await selectSubject(Number(button.dataset.subjectId));
    setStatus('');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'subject를 선택하지 못했습니다.');
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

subjectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(subjectForm);
  const subject = {
    id: formData.get('id') ? Number(formData.get('id')) : undefined,
    title: String(formData.get('title') || '').trim(),
    description: String(formData.get('description') || '').trim(),
  };

  if (!subject.title) {
    setStatus('Subject title을 입력하세요.');
    return;
  }

  setBusy(true);
  setStatus('subject를 저장 중입니다.');

  try {
    const savedSubject = await saveSubject(subject);
    selectedSubjectId = savedSubject.id;
    await loadWordsQuiz();
    fillSubjectForm(savedSubject);
    closeSubjectDialog();
    setStatus(`${savedSubject.title} subject를 저장했습니다.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'subject를 저장하지 못했습니다.');
  } finally {
    setBusy(false);
  }
});

wordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(wordForm);
  const word = {
    id: formData.get('id') ? Number(formData.get('id')) : undefined,
    subjectId: Number(formData.get('subjectId')),
    abbreviation: String(formData.get('abbreviation') || '').trim().toUpperCase(),
    fullName: String(formData.get('fullName') || '').trim(),
    description: String(formData.get('description') || '').trim(),
  };

  if (!word.subjectId || !word.abbreviation || !word.fullName) {
    setStatus('Subject, abbreviation, full name을 모두 입력하세요.');
    return;
  }

  setBusy(true);
  setStatus('quiz word를 저장 중입니다.');

  try {
    const savedWord = await saveWord(word);
    selectedSubjectId = savedWord.subjectId;
    words = await fetchWords(selectedSubjectId);
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

deleteSubjectButton.addEventListener('click', () => {
  removeSubject(getSelectedSubject());
});

cancelDeleteWordButton.addEventListener('click', closeDeleteWordDialog);

confirmDeleteWordButton.addEventListener('click', () => {
  removeWord(pendingDeleteWord);
});

closeWordDetailButton.addEventListener('click', closeWordDetailDialog);

setActiveModule(activeModuleId);
loadWordsQuiz();
