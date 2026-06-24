// ============================================================
//  depenses.js — Gestion des dépenses
// ============================================================
import { db }              from './firebase-config.js';
import { showToast, fmtDate, confirmDialog, formatCurrency } from './utils.js';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Refs Firestore ───
const depensesRef  = collection(db, 'depenses');
const evenementsRef= collection(db, 'evenements');
const projetsRef   = collection(db, 'projets');

// ─── État local ───
let allDepenses   = [];
let allEvenements = [];
let allProjets    = [];
let editingId     = null;
let filterCat     = 'toutes';

// ─── DOM ───
const tbody      = document.getElementById('depenses-tbody');
const totalEl    = document.getElementById('total-depenses');
const form       = document.getElementById('form-depense');
const modalTitle = document.getElementById('modal-depense-title');
const evSel      = document.getElementById('dep-evenement');
const projSel    = document.getElementById('dep-projet');

// ─── Chargement événements ───
onSnapshot(query(evenementsRef, orderBy('date','desc')), snap => {
  allEvenements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  populateSelect(evSel, allEvenements, '-- Aucun événement --');
});

// ─── Chargement projets ───
onSnapshot(query(projetsRef, orderBy('nom')), snap => {
  allProjets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  populateSelect(projSel, allProjets, '-- Aucun projet --');
});

function populateSelect(sel, items, placeholder) {
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(it => {
    const opt = document.createElement('option');
    opt.value = it.id;
    opt.textContent = it.nom;
    if (it.id === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ─── Chargement dépenses en temps réel ───
onSnapshot(query(depensesRef, orderBy('date','desc')), snap => {
  allDepenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderTable();
});

// ─── Rendu ───
function renderTable() {
  if (!tbody) return;

  const filtered = allDepenses.filter(d =>
    filterCat === 'toutes' || d.categorie === filterCat
  );

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;color:var(--gray-400);">Aucune dépense trouvée</td></tr>`;
    if (totalEl) totalEl.textContent = '0 FCFA';
    return;
  }

  let total = 0;
  filtered.forEach(d => {
    total += Number(d.montant) || 0;
    const ev  = allEvenements.find(e => e.id === d.evenement_id);
    const pr  = allProjets.find(p => p.id === d.projet_id);
    const ref = ev ? `<span class="badge badge-info">${escHtml(ev.nom)}</span>`
                   : pr ? `<span class="badge badge-gray">${escHtml(pr.nom)}</span>`
                        : '—';
    const dateStr = d.date ? fmtDate(d.date.toDate ? d.date.toDate() : new Date(d.date)) : '—';
    const catBadge = catBadgeHtml(d.categorie);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="fw-medium">${escHtml(d.titre)}</span>${d.notes ? `<br><small class="text-muted">${escHtml(d.notes)}</small>` : ''}</td>
      <td class="fw-bold text-danger">${formatCurrency(d.montant)}</td>
      <td>${dateStr}</td>
      <td>${catBadge}</td>
      <td>${ref}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline btn-icon" title="Modifier" onclick="openEditDepense('${d.id}')">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button class="btn btn-sm btn-danger btn-icon" title="Supprimer" onclick="deleteDepense('${d.id}','${escHtml(d.titre)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  if (totalEl) totalEl.textContent = formatCurrency(total);
}

function catBadgeHtml(cat) {
  const map = {
    'nourriture':    ['badge-success', '🍽️'],
    'location':      ['badge-info',    '🏠'],
    'transport':     ['badge-warning', '🚗'],
    'équipement':    ['badge-gray',    '🔧'],
    'communication': ['badge-info',    '📱'],
    'autre':         ['badge-gray',    '📦'],
  };
  const [cls, ico] = map[cat] || ['badge-gray', '📦'];
  return `<span class="badge ${cls}">${ico} ${escHtml(cat || 'autre')}</span>`;
}

// ─── Filtres catégorie ───
document.querySelectorAll('.filter-btn[data-cat]').forEach(btn => {
  btn.addEventListener('click', () => {
    filterCat = btn.dataset.cat;
    document.querySelectorAll('.filter-btn[data-cat]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTable();
  });
});

// ─── Ouvrir modal ajout ───
window.openAddDepense = function() {
  editingId = null;
  form.reset();
  document.getElementById('modal-depense-title').textContent = 'Ajouter une dépense';
  openModal('modal-depense');
};

// ─── Ouvrir modal édition ───
window.openEditDepense = function(id) {
  const d = allDepenses.find(x => x.id === id);
  if (!d) return;
  editingId = id;
  document.getElementById('modal-depense-title').textContent = 'Modifier la dépense';
  document.getElementById('dep-titre').value     = d.titre    || '';
  document.getElementById('dep-montant').value   = d.montant  || '';
  document.getElementById('dep-date').value      = toInputDate(d.date);
  document.getElementById('dep-categorie').value = d.categorie|| 'autre';
  document.getElementById('dep-evenement').value = d.evenement_id || '';
  document.getElementById('dep-projet').value    = d.projet_id    || '';
  document.getElementById('dep-notes').value     = d.notes    || '';
  openModal('modal-depense');
};

// ─── Supprimer ───
window.deleteDepense = async function(id, titre) {
  const ok = await confirmDialog('Supprimer cette dépense ?', `"${titre}" sera définitivement supprimée.`);
  if (!ok) return;
  try {
    await deleteDoc(doc(db, 'depenses', id));
    showToast('Supprimé', 'Dépense supprimée avec succès', 'success');
  } catch (e) {
    showToast('Erreur', e.message, 'error');
  }
};

// ─── Soumission formulaire ───
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;

    const data = {
      titre:       document.getElementById('dep-titre').value.trim(),
      montant:     parseFloat(document.getElementById('dep-montant').value) || 0,
      date:        Timestamp.fromDate(new Date(document.getElementById('dep-date').value)),
      categorie:   document.getElementById('dep-categorie').value,
      evenement_id:document.getElementById('dep-evenement').value || null,
      projet_id:   document.getElementById('dep-projet').value    || null,
      notes:       document.getElementById('dep-notes').value.trim() || null,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'depenses', editingId), data);
        showToast('Modifié', 'Dépense mise à jour', 'success');
      } else {
        await addDoc(depensesRef, data);
        showToast('Ajouté', 'Dépense enregistrée', 'success');
      }
      closeModal('modal-depense');
    } catch (err) {
      showToast('Erreur', err.message, 'error');
    } finally {
      btn.disabled = false;
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
