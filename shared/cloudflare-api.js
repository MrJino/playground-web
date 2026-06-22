(function () {
  const BASE_URL = 'https://playground-api.for1self.workers.dev';
  const SUBJECTS_PATH = '/api/subjects';
  const QUIZ_WORDS_PATH = '/api/quiz-words';
  const WINNERS_PATH = '/api/winners';
  const WINNERS_SUMMARY_PATH = '/api/winners/summary';

  function buildUrl(path, params = {}) {
    const url = new URL(path, BASE_URL);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    return url;
  }

  async function requestJson(pathOrUrl, options = {}) {
    const response = await window.fetch(pathOrUrl, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || `Request failed: ${response.status}`);
    }

    return payload;
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
      abbreviation: String(row.abbreviation || '').trim().toUpperCase(),
      fullName: String(row.fullName ?? row.full_name ?? '').trim(),
      description: String(row.description || '').trim(),
    };
  }

  async function fetchSubjects() {
    const payload = await requestJson(buildUrl(SUBJECTS_PATH));
    const rows = Array.isArray(payload.subjects) ? payload.subjects : [];
    return rows.map(toSubject);
  }

  async function saveSubject(subject) {
    const payload = await requestJson(buildUrl(SUBJECTS_PATH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subject),
    });

    return toSubject(payload.subject);
  }

  async function deleteSubject(id) {
    const payload = await requestJson(buildUrl(SUBJECTS_PATH, { id }), {
      method: 'DELETE',
    });

    return toSubject(payload.subject);
  }

  async function fetchQuizWords(subjectId = null) {
    const payload = await requestJson(buildUrl(QUIZ_WORDS_PATH, { subjectId }));
    const rows = Array.isArray(payload.words) ? payload.words : [];
    return rows.map(toQuizWord);
  }

  async function saveQuizWord(word) {
    const payload = await requestJson(buildUrl(QUIZ_WORDS_PATH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(word),
    });

    return toQuizWord(payload.word);
  }

  async function deleteQuizWord(id) {
    const payload = await requestJson(buildUrl(QUIZ_WORDS_PATH, { id }), {
      method: 'DELETE',
    });

    return toQuizWord(payload.word);
  }

  async function fetchWinnerSummary(menu) {
    const payload = await requestJson(buildUrl(WINNERS_SUMMARY_PATH, { menu }));
    return Array.isArray(payload.summary) ? payload.summary : [];
  }

  async function saveWinner(winner) {
    return requestJson(buildUrl(WINNERS_PATH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(winner),
    });
  }

  window.PlaygroundCloudflareApi = {
    BASE_URL,
    buildUrl,
    requestJson,
    fetchSubjects,
    saveSubject,
    deleteSubject,
    fetchQuizWords,
    saveQuizWord,
    deleteQuizWord,
    fetchWinnerSummary,
    saveWinner,
    toSubject,
    toQuizWord,
  };
})();
