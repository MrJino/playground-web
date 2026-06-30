(function () {
  const DIALOG_ID = 'favoriteCardPreviewDialog';

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function withCloudflareImageVariant(imageUrl, variant = 'public') {
    if (!imageUrl || !String(imageUrl).startsWith('https://imagedelivery.net')) {
      return imageUrl || '';
    }

    if (/\/(public|small|thumbnail)$/.test(imageUrl)) {
      return imageUrl.replace(/\/(public|small|thumbnail)$/, `/${variant}`);
    }

    return imageUrl.replace(/\/?$/, `/${variant}`);
  }

  function createDialog() {
    const dialog = document.createElement('dialog');
    dialog.className = 'favorite-preview-dialog';
    dialog.id = DIALOG_ID;
    dialog.innerHTML = `
      <article class="favorite-preview-card">
        <button class="favorite-preview-close" type="button" aria-label="닫기" title="닫기">×</button>
        <div class="favorite-preview-media" data-favorite-preview-media></div>
        <div class="favorite-preview-content">
          <h3 data-favorite-preview-name></h3>
          <dl class="favorite-preview-meta">
            <div>
              <dt>Topic</dt>
              <dd data-favorite-preview-topic></dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd data-favorite-preview-description></dd>
            </div>
            <div>
              <dt>Profile</dt>
              <dd>
                <textarea class="favorite-preview-profile-text" data-favorite-preview-profile readonly rows="7" wrap="soft"></textarea>
              </dd>
            </div>
          </dl>
        </div>
      </article>
    `;

    dialog.querySelector('.favorite-preview-close')?.addEventListener('click', () => close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        close();
      }
    });

    document.body.append(dialog);
    return dialog;
  }

  function getDialog() {
    return document.getElementById(DIALOG_ID) || createDialog();
  }

  function open(card, options = {}) {
    if (!card) {
      return;
    }

    const dialog = getDialog();
    const name = card.name || '';
    const image = withCloudflareImageVariant(card.previewImage || card.image || '', options.imageVariant || 'public');
    const media = dialog.querySelector('[data-favorite-preview-media]');
    const nameEl = dialog.querySelector('[data-favorite-preview-name]');
    const topicEl = dialog.querySelector('[data-favorite-preview-topic]');
    const descriptionEl = dialog.querySelector('[data-favorite-preview-description]');
    const profileEl = dialog.querySelector('[data-favorite-preview-profile]');

    media.innerHTML = image
      ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" />`
      : `<div class="favorite-preview-placeholder" aria-hidden="true">${escapeHtml(name.slice(0, 1) || '?')}</div>`;
    nameEl.textContent = name || '이름 없음';
    topicEl.textContent = options.topicLabel || card.topicLabel || 'Topic 정보 없음';
    descriptionEl.textContent = card.description || '설명 없음';
    profileEl.value = card.profile || 'Profile 정보 없음';

    dialog.showModal();
  }

  function close() {
    const dialog = document.getElementById(DIALOG_ID);

    if (dialog?.open) {
      dialog.close();
    }
  }

  window.PlaygroundFavoriteCardPreview = {
    open,
    close,
  };
})();
