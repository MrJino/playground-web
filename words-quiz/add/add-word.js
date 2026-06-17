const CLOUDFLARE_API_BASE_URL = 'https://playground-api.for1self.workers.dev';
const QUIZ_WORDS_API_URL = `${CLOUDFLARE_API_BASE_URL}/api/quiz-words`;

const form = document.getElementById('wordEditorForm');
const abbreviationInput = document.getElementById('abbreviationInput');
const editorMessage = document.getElementById('editorMessage');
const savedWordList = document.getElementById('savedWordList');
const clearSavedButton = document.getElementById('clearSavedButton');

function normalizeWord(formData) {
  return {
    abbreviation: formData.get('abbreviation').trim().toUpperCase(),
    fullName: formData.get('fullName').trim(),
    description: formData.get('description').trim(),
  };
}

function toViewWord(word) {
  return {
    abbreviation: word.abbreviation,
    fullName: word.fullName ?? word.full_name,
    description: word.description ?? '',
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderSavedWords(words) {
  if (words.length === 0) {
    savedWordList.innerHTML = '<div class="empty-state">추가한 단어가 없습니다.</div>';
    return;
  }

  savedWordList.innerHTML = words
    .map(toViewWord)
    .map(
      (word) => `
        <article class="saved-word-card">
          <strong>${escapeHtml(word.abbreviation)}</strong>
          <span>${escapeHtml(word.fullName)}</span>
          <p>${escapeHtml(word.description)}</p>
        </article>
      `,
    )
    .join('');
}

function setBusy(isBusy) {
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = isBusy;
  clearSavedButton.disabled = isBusy;
}

async function loadSavedWords() {
  savedWordList.innerHTML = '<div class="empty-state">불러오는 중입니다.</div>';

  const response = await fetch(QUIZ_WORDS_API_URL);

  if (!response.ok) {
    throw new Error(`Failed to load quiz words: ${response.status}`);
  }

  const payload = await response.json();
  renderSavedWords(Array.isArray(payload.words) ? payload.words : []);
}

async function saveWord(word) {
  const response = await fetch(QUIZ_WORDS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(word),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Failed to save quiz word: ${response.status}`);
  }

  return payload.word;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const word = normalizeWord(new FormData(form));

  if (!word.abbreviation || !word.fullName || !word.description) {
    editorMessage.textContent = '모든 입력값을 채워주세요.';
    return;
  }

  setBusy(true);
  editorMessage.textContent = '저장 중입니다.';

  try {
    const savedWord = await saveWord(word);
    form.reset();
    abbreviationInput.focus();
    editorMessage.textContent = `${savedWord.abbreviation} 퀴즈 데이터를 저장했습니다.`;
    await loadSavedWords();
  } catch (error) {
    editorMessage.textContent = error instanceof Error ? error.message : '저장하지 못했습니다.';
  } finally {
    setBusy(false);
  }
});

clearSavedButton.addEventListener('click', async () => {
  setBusy(true);
  editorMessage.textContent = '목록을 새로고침합니다.';

  try {
    await loadSavedWords();
    editorMessage.textContent = '저장 목록을 새로고침했습니다.';
  } catch (error) {
    editorMessage.textContent = error instanceof Error ? error.message : '저장 목록을 불러오지 못했습니다.';
  } finally {
    setBusy(false);
  }
});

loadSavedWords().catch((error) => {
  savedWordList.innerHTML = '<div class="empty-state">저장 목록을 불러오지 못했습니다.</div>';
  editorMessage.textContent = error instanceof Error ? error.message : '저장 목록을 불러오지 못했습니다.';
});
abbreviationInput.focus();
