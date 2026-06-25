export function formatCurrency(n) {
  const num = Number(n) || 0;
  return new Intl.NumberFormat('fr-FR').format(num) + ' FCFA';
}

export function fmtDate(d) {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

export function showToast(title, message, type = 'success') {
  const container = getToastContainer();
  const icons = {
    success: '<i class="fa-solid fa-check"></i>',
    error:   '<i class="fa-solid fa-circle-exclamation"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
  };
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML =
    '<div class="toast-icon">' + (icons[type] || icons.success) + '</div>' +
    '<div class="toast-body">' +
      '<div class="toast-title">' + escHtml(title) + '</div>' +
      (message ? '<div class="toast-msg">' + escHtml(message) + '</div>' : '') +
    '</div>' +
    '<button onclick="this.closest(\'.toast\').remove()" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:var(--gray-400);padding:.25rem .5rem;">×</button>';
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

export function confirmDialog(title, message) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('confirm-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'confirm-overlay';
      overlay.className = 'confirm-dialog';
      overlay.innerHTML =
        '<div class="confirm-box">' +
          '<h3 id="confirm-title"></h3>' +
          '<p id="confirm-msg"></p>' +
          '<div class="confirm-actions">' +
            '<button class="btn btn-outline" id="confirm-cancel">Annuler</button>' +
            '<button class="btn btn-danger" id="confirm-ok">Confirmer</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
    }

    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = message;
    overlay.classList.add('active');

    function cleanup(result) {
      overlay.classList.remove('active');
      document.getElementById('confirm-ok').onclick = null;
      document.getElementById('confirm-cancel').onclick = null;
      resolve(result);
    }

    document.getElementById('confirm-ok').onclick = () => cleanup(true);
    document.getElementById('confirm-cancel').onclick = () => cleanup(false);
    overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };
  });
}

window.openModal = function(id) {
  const overlay = document.getElementById(id + '-overlay') || document.querySelector('[data-modal="' + id + '"]');
  if (overlay) overlay.classList.add('active');
};

window.closeModal = function(id) {
  const overlay = document.getElementById(id + '-overlay') || document.querySelector('[data-modal="' + id + '"]');
  if (overlay) overlay.classList.remove('active');
};

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

export function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function toInputDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().split('T')[0];
}