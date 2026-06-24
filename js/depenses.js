import { db }              from './firebase-config.js';
import { showToast, fmtDate, confirmDialog, formatCurrency, escHtml } from './utils.js';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const depensesRef  = collection(db, 'depenses');
const evenementsRef= collection(db, 'evenements');
const projetsRef   = collection(db, 'projets');

let allDepenses   = [];
let allEvenements = [];
let allProjets    = [];
let editingId     = null;
let filterCat     = 'toutes';

const tbody      = document.getElementById('depenses-tbody');
const totalEl    = document.getElementById('total-depenses');
const form       = document.getElementById('form-depense');
const modalTitle = document.getElementById('modal-depense-title');
const evSel      = document.getElementById('dep-evenement');
const projSel    = document.getElementById('dep-projet');

onSnapshot(query(evenementsRef, orderBy('date','desc')), snap => {
  allEvenements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  populateSelect(evSel, allEvenements, '-- Aucun événement --');
});

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

onSnapshot(query(depensesRef, orderBy('date','desc')), snap => {
  allDepenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderTable();
});

function renderTable() {
  if (!tbody) return;

  const filtered = allDepenses.filter(d =>
    filterCat === 'toutes' || d.categorie === filterCat
  );

  tbody.innerHTML = '';

  if (filtered.length === 0) {
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
      <td class="table-mobile-hide">${ref}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline btn-icon" title="Modifier" onclick="openEditDepense('${d.id}')">
            <i class="fa-solid fa-pen"></i>
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
    'nourriture':    ['badge-success', '<i class="fa-solid fa-utensils"></i>'],
    'location':      ['badge-info',    '<i class="fa-solid fa-house"></i>'],
    'transport':     ['badge-warning', '<i class="fa-solid fa-car"></i>'],
    'équipement':    ['badge-gray',    '<i class="fa-solid fa-wrench"></i>'],
    'communication': ['badge-info',    '<i class="fa-solid fa-mobile-screen"></i>'],
    'autre':         ['badge-gray',    '<i class="fa-solid fa-box"></i>'],
  };
  const [cls, ico] = map[cat] || ['badge-gray', '<i class="fa-solid fa-box"></i>'];
  return `<span class="badge ${cls}" style="gap:5px;display:inline-flex;align-items:center;">${ico} ${escHtml(cat || 'autre')}</span>`;
}

document.querySelectorAll('.filter-btn[data-cat]').forEach(btn => {
  btn.addEventListener('click', () => {
    filterCat = btn.dataset.cat;
    document.querySelectorAll('.filter-btn[data-cat]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTable();
  });
});

window.openAddDepense = function() {
  editingId = null;
  form.reset();
  document.getElementById('modal-depense-title').textContent = 'Ajouter une dépense';
  openModal('modal-depense');
};

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

function toInputDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().split('T')[0];
}
