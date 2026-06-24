// ============================================================
//  cotisations.js — Gestion des cotisations
// ============================================================
import { db }              from './firebase-config.js';
import { showToast, fmt, fmtDate, confirmDialog, formatCurrency } from './utils.js';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Refs Firestore ───
const cotisationsRef = collection(db, 'cotisations');
const evenementsRef  = collection(db, 'evenements');

// ─── État local ───
let allCotisations = [];
let allEvenements  = [];
let editingId      = null;
let filterStatut   = 'tous';
let searchQuery    = '';

// ─── DOM ───
const tbody       = document.getElementById('cotisations-tbody');
const totalEl     = document.getElementById('total-cotisations');
const modal       = document.getElementById('modal-cotisation');
const form        = document.getElementById('form-cotisation');
const modalTitle  = document.getElementById('modal-cotisation-title');
const evenementSel= document.getElementById('cot-evenement');
const filterBtns  = document.querySelectorAll('.filter-btn[data-statut]');
const searchInput = document.getElementById('search-membre');

// ─── Chargement des événements (pour le select) ───
onSnapshot(query(evenementsRef, orderBy('date', 'desc')), (snap) => {
  allEvenements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  populateEvenementSelect();
});

function populateEvenementSelect() {
  if (!evenementSel) return;
  const current = evenementSel.value;
  evenementSel.innerHTML = '<option value="">-- Aucun événement --</option>';
  allEvenements.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = e.nom;
    if (e.id === current) opt.selected = true;
    evenementSel.appendChild(opt);
  });
}

// ─── Chargement temps réel des cotisations ───
onSnapshot(query(cotisationsRef, orderBy('date', 'desc')), (snap) => {
  allCotisations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderTable();
});

// ─── Rendu tableau ───
function renderTable() {
  if (!tbody) return;

  let filtered = allCotisations.filter(c => {
    const matchStatut  = filterStatut === 'tous' || c.statut === filterStatut;
    const matchSearch  = !searchQuery || c.membre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatut && matchSearch;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;color:var(--gray-400);">
      <svg viewBox="0 0 24 24" style="width:40px;height:40px;margin:0 auto .5rem;opacity:.4"><path fill="currentColor" d="M20 6H4l8 5 8-5zm0 2-8 5-8-5v10h16V8z"/></svg>
      <p>Aucune cotisation trouvée</p></td></tr>`;
    if (totalEl) totalEl.textContent = '0 FCFA';
    return;
  }

  let total = 0;
  filtered.forEach(c => {
    const ev = allEvenements.find(e => e.id === c.evenement_id);
    const evName = ev ? ev.nom : '—';
    const isPaid = c.statut === 'payé';
    const dateStr = c.date ? fmtDate(c.date.toDate ? c.date.toDate() : new Date(c.date)) : '—';
    if (isPaid) total += Number(c.montant) || 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="fw-medium">${escHtml(c.membre)}</span></td>
      <td class="fw-bold text-success">${formatCurrency(c.montant)}</td>
      <td>${dateStr}</td>
      <td>
        <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}">
          ${isPaid ? '✓ Payé' : '⏳ Non payé'}
        </span>
      </td>
      <td>${evName !== '—' ? `<span class="badge badge-info">${escHtml(evName)}</span>` : '—'}</td>
      <td title="${escHtml(c.notes || '')}">${c.notes ? '📝' : '—'}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline btn-icon" title="Basculer statut" onclick="toggleStatut('${c.id}','${c.statut}')">
            ${isPaid
              ? `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>`
              : `<i class="fa-solid fa-check"></i>`
            }
          </button>
          <button class="btn btn-sm btn-outline btn-icon" title="Modifier" onclick="openEditModal('${c.id}')">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button class="btn btn-sm btn-danger btn-icon" title="Supprimer" onclick="deleteCotisation('${c.id}','${escHtml(c.membre)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  if (totalEl) totalEl.textContent = formatCurrency(total);
}

// ─── Filtres ───
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterStatut = btn.dataset.statut;
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTable();
  });
});

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderTable();
  });
}

// ─── Ouvrir modal ajout ───
window.openAddModal = function() {
  editingId = null;
  form.reset();
  modalTitle.textContent = 'Ajouter une cotisation';
  openModal('modal-cotisation');
};

// ─── Ouvrir modal édition ───
window.openEditModal = function(id) {
  const c = allCotisations.find(x => x.id === id);
  if (!c) return;
  editingId = id;
  modalTitle.textContent = 'Modifier la cotisation';
  document.getElementById('cot-membre').value    = c.membre    || '';
  document.getElementById('cot-montant').value   = c.montant   || '';
  document.getElementById('cot-date').value      = toInputDate(c.date);
  document.getElementById('cot-statut').value    = c.statut    || 'non payé';
  document.getElementById('cot-evenement').value = c.evenement_id || '';
  document.getElementById('cot-notes').value     = c.notes     || '';
  openModal('modal-cotisation');
};

// ─── Basculer statut ───
window.toggleStatut = async function(id, currentStatut) {
  const newStatut = currentStatut === 'payé' ? 'non payé' : 'payé';
  try {
    await updateDoc(doc(db, 'cotisations', id), { statut: newStatut });
    showToast('Statut mis à jour', `Statut changé en "${newStatut}"`, 'success');
  } catch (e) {
    showToast('Erreur', e.message, 'error');
  }
};

// ─── Supprimer ───
window.deleteCotisation = async function(id, nom) {
  const ok = await confirmDialog('Supprimer cette cotisation ?', `La cotisation de "${nom}" sera définitivement supprimée.`);
  if (!ok) return;
  try {
    await deleteDoc(doc(db, 'cotisations', id));
    showToast('Supprimé', 'Cotisation supprimée avec succès', 'success');
  } catch (e) {
    showToast('Erreur', e.message, 'error');
  }
};

// ─── Soumission formulaire ───
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enregistrement…';

    const data = {
      membre:       document.getElementById('cot-membre').value.trim(),
      montant:      parseFloat(document.getElementById('cot-montant').value) || 0,
      date:         Timestamp.fromDate(new Date(document.getElementById('cot-date').value)),
      statut:       document.getElementById('cot-statut').value,
      evenement_id: document.getElementById('cot-evenement').value || null,
      notes:        document.getElementById('cot-notes').value.trim() || null,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'cotisations', editingId), data);
        showToast('Modifié', 'Cotisation mise à jour', 'success');
      } else {
        await addDoc(cotisationsRef, data);
        showToast('Ajouté', 'Cotisation enregistrée', 'success');
      }
      closeModal('modal-cotisation');
      form.reset();
    } catch (err) {
      showToast('Erreur', err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enregistrer';
    }
  });
}

// ─── Helpers ───
function toInputDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().split('T')[0];
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
