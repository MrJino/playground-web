(function () {
  const BASE_URL = 'https://playground-api.for1self.workers.dev';
  const TOPICS_PATH = '/api/topics';
  const QUIZ_WORDS_PATH = '/api/quiz-words';
  const FAVORITE_TOPICS_PATH = '/api/favorite-topics';
  const FAVORITE_CARDS_PATH = '/api/favorite-cards';
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
    const requestUrl = pathOrUrl instanceof URL ? pathOrUrl.toString() : String(pathOrUrl);
    const requestMethod = options.method || 'GET';

    console.log('[Cloudflare API Request]', {
      method: requestMethod,
      url: requestUrl,
      options,
    });

    let response;

    try {
      response = await window.fetch(pathOrUrl, options);
    } catch (error) {
      console.error('[Cloudflare API Error]', {
        method: requestMethod,
        url: requestUrl,
        error,
      });
      throw error;
    }

    const payload = await response.json().catch(() => ({}));

    console.log('[Cloudflare API Response]', {
      status: response.status,
      ok: response.ok,
      payload,
    });

    if (!response.ok) {
      throw new Error(payload.error || `Request failed: ${response.status}`);
    }

    return payload;
  }

  function toTopic(row) {
    return {
      id: Number(row.id),
      title: String(row.title || '').trim(),
      description: String(row.description || '').trim(),
    };
  }

  function toQuizWord(row) {
    const topicId = row.topicId ?? row.topic_id;

    return {
      id: Number(row.id),
      topicId: topicId === null || topicId === undefined ? null : Number(topicId),
      abbreviation: String(row.abbreviation || '')
        .trim()
        .toUpperCase(),
      fullName: String(row.fullName ?? row.full_name ?? '').trim(),
      description: String(row.description || '').trim(),
    };
  }

  function toFavoriteTopic(row) {
    const era = row.era;

    return {
      id: Number(row.id),
      value: String(row.value || '').trim(),
      label: String(row.label || '').trim(),
      country: String(row.country || '').trim(),
      icon: String(row.icon || '').trim(),
      era: era === null || era === undefined || era === '' ? null : Number(era),
    };
  }

  function toFavoriteCard(row) {
    const topicId = row.topicId ?? row.topic_id;

    return {
      id: Number(row.id),
      topicId: topicId === null || topicId === undefined ? null : Number(topicId),
      name: String(row.name || '').trim(),
      description: String(row.description || '').trim(),
      image: String(row.image || '').trim(),
    };
  }

  async function fetchTopics() {
    const payload = await requestJson(buildUrl(TOPICS_PATH));
    const rows = Array.isArray(payload.topics) ? payload.topics : [];
    return rows.map(toTopic);
  }

  async function saveTopic(topic) {
    const payload = await requestJson(buildUrl(TOPICS_PATH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(topic),
    });

    return toTopic(payload.topic);
  }

  async function deleteTopic(id) {
    const payload = await requestJson(buildUrl(TOPICS_PATH, { id }), {
      method: 'DELETE',
    });

    return toTopic(payload.topic);
  }

  async function fetchQuizWords(topicId = null) {
    const payload = await requestJson(buildUrl(QUIZ_WORDS_PATH, { topicId }));
    const rows = Array.isArray(payload.words) ? payload.words : [];
    return rows.map(toQuizWord);
  }

  async function saveQuizWord(word) {
    const topicId = word.topicId ?? word.topic_id;
    const requestBody = {
      ...word,
      topicId,
      topic_id: topicId,
    };

    const payload = await requestJson(buildUrl(QUIZ_WORDS_PATH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    return toQuizWord(payload.word);
  }

  async function deleteQuizWord(id) {
    const payload = await requestJson(buildUrl(QUIZ_WORDS_PATH, { id }), {
      method: 'DELETE',
    });

    return toQuizWord(payload.word);
  }

  async function fetchFavoriteTopics() {
    const payload = await requestJson(buildUrl(FAVORITE_TOPICS_PATH));
    const rows = Array.isArray(payload.topics) ? payload.topics : [];
    return rows.map(toFavoriteTopic);
  }

  async function saveFavoriteTopic(topic) {
    const payload = await requestJson(buildUrl(FAVORITE_TOPICS_PATH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(topic),
    });

    return toFavoriteTopic(payload.topic);
  }

  async function deleteFavoriteTopic(id) {
    const payload = await requestJson(buildUrl(FAVORITE_TOPICS_PATH, { id }), {
      method: 'DELETE',
    });

    return toFavoriteTopic(payload.topic);
  }

  async function fetchFavoriteCards(topicId = null) {
    const payload = await requestJson(buildUrl(FAVORITE_CARDS_PATH, { topicId }));
    const rows = Array.isArray(payload.cards) ? payload.cards : [];
    return rows.map(toFavoriteCard);
  }

  async function saveFavoriteCard(card) {
    const topicId = card.topicId ?? card.topic_id;
    const requestBody = {
      ...card,
      topicId,
      topic_id: topicId,
    };

    const payload = await requestJson(buildUrl(FAVORITE_CARDS_PATH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    return toFavoriteCard(payload.card);
  }

  async function deleteFavoriteCard(id) {
    const payload = await requestJson(buildUrl(FAVORITE_CARDS_PATH, { id }), {
      method: 'DELETE',
    });

    return toFavoriteCard(payload.card);
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
    fetchTopics,
    saveTopic,
    deleteTopic,
    fetchQuizWords,
    saveQuizWord,
    deleteQuizWord,
    fetchFavoriteTopics,
    saveFavoriteTopic,
    deleteFavoriteTopic,
    fetchFavoriteCards,
    saveFavoriteCard,
    deleteFavoriteCard,
    fetchWinnerSummary,
    saveWinner,
    toTopic,
    toQuizWord,
    toFavoriteTopic,
    toFavoriteCard,
  };
})();
