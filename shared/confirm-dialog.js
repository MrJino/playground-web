(function () {
  let dialog;
  let titleElement;
  let messageElement;
  let cancelButton;
  let confirmButton;

  function ensureDialog() {
    if (dialog) {
      return;
    }

    dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
      <div class="confirm-dialog__content">
        <div class="confirm-dialog__icon" aria-hidden="true">?</div>
        <div class="confirm-dialog__text">
          <h2></h2>
          <p></p>
        </div>
        <div class="confirm-dialog__actions">
          <button class="ghost-button" type="button" data-confirm-cancel>아니오</button>
          <button class="primary-button" type="button" data-confirm-ok>네</button>
        </div>
      </div>
    `;

    titleElement = dialog.querySelector('h2');
    messageElement = dialog.querySelector('p');
    cancelButton = dialog.querySelector('[data-confirm-cancel]');
    confirmButton = dialog.querySelector('[data-confirm-ok]');
    document.body.append(dialog);
  }

  function show({ title, message = '', confirmText = '네', cancelText = '아니오', onConfirm } = {}) {
    ensureDialog();

    titleElement.textContent = title || '확인하시겠습니까?';
    messageElement.textContent = message;
    messageElement.hidden = !message;
    confirmButton.textContent = confirmText;
    cancelButton.textContent = cancelText;
    confirmButton.onclick = () => {
      dialog.close();
      onConfirm?.();
    };
    cancelButton.onclick = () => {
      dialog.close();
    };
    dialog.showModal();
  }

  window.ConfirmDialog = {
    show,
  };
})();
