import { db }              from './firebase-config.js';
import { showToast, fmtDate, confirmDialog, formatCurrency, escHtml, toInputDate } from './utils.js';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const evenementsRef = collection(db, 'evenements');
const depensesRef   = collection(db, 'depenses');

let allEvenements = [];
let allDepenses   = [];
let editingId     = null;

const tbody      = document.getElementById('evenements-tbody');
const form       = document.getElementById('form-evenement');
const modalTitle = document.getElementById('modal-evenement-title');

onSnapshot(query(depensesRef), snap => {
  allDepenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderTable();
});

onSnapshot(query(evenementsRef, orderBy('date', 'desc')), snap => {
  allEvenements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderTable();
});

function getDepensesEvenement(eventId) {
  return allDepenses
    .filter(d => d.evenement_id === eventId)
    .reduce((sum, d) => sum + (Number(d.montant) || 0), 0);
}

function renderTable() {
  if (!tbody) return;
  tbody.innerHTML = '';

  if (allEvenements.length === 0) return;

  allEvenements.forEach(ev => {
    const depReelles  = getDepensesEvenement(ev.id);
    const budgetPrevu = Number(ev.budget_prevu) || 0;
    const solde       = budgetPrevu - depReelles;
    const soldeClass  = solde >= 0 ? 'text-success' : 'text-danger';
    const dateStr     = ev.date ? fmtDate(ev.date.toDate ? ev.date.toDate() : new Date(ev.date)) : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="fw-medium">${escHtml(ev.nom)}</span>${ev.description ? `<br><small class="text-muted">${escHtml(ev.description)}</small>` : ''}</td>
      <td>${dateStr}</td>
      <td class="fw-bold">${formatCurrency(budgetPrevu)}</td>
      <td class="table-mobile-hide text-danger fw-medium">${formatCurrency(depReelles)}</td>
      <td class="table-mobile-hide fw-bold ${soldeClass}">${(solde >= 0 ? '+' : '') + formatCurrency(solde)}</td>

      <td>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline btn-icon" title="Modifier" onclick="openEditEvenement('${ev.id}')">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-icon" title="Supprimer" onclick="deleteEvenement('${ev.id}','${escHtml(ev.nom)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

window.openAddEvenement = function() {
  editingId = null;
  form.reset();
  document.getElementById('modal-evenement-title').textContent = 'Ajouter un événement';
  openModal('modal-evenement');
};

window.openEditEvenement = function(id) {
  const ev = allEvenements.find(x => x.id === id);
  if (!ev) return;
  editingId = id;
  document.getElementById('modal-evenement-title').textContent = 'Modifier l\'événement';
  document.getElementById('ev-nom').value         = ev.nom          || '';
  document.getElementById('ev-date').value        = toInputDate(ev.date);
  document.getElementById('ev-budget').value      = ev.budget_prevu || '';
  document.getElementById('ev-description').value = ev.description  || '';
  openModal('modal-evenement');
};

window.deleteEvenement = async function(id, nom) {
  const ok = await confirmDialog('Supprimer cet événement ?', `"${nom}" sera supprimé. Les dépenses liées ne seront PAS supprimées.`);
  if (!ok) return;
  try {
    await deleteDoc(doc(db, 'evenements', id));
    showToast('Supprimé', 'Événement supprimé', 'success');
  } catch (e) {
    showToast('Erreur', e.message, 'error');
  }
};

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.textContent = 'Enregistrement...';
    btn.disabled = true;

    const data = {
      nom:          document.getElementById('ev-nom').value.trim(),
      date:         Timestamp.fromDate(new Date(document.getElementById('ev-date').value)),
      budget_prevu: parseFloat(document.getElementById('ev-budget').value) || 0,
      description:  document.getElementById('ev-description').value.trim() || null,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'evenements', editingId), data);
        showToast('Modifié', 'Événement mis à jour', 'success');
      } else {
        await addDoc(evenementsRef, data);
        showToast('Ajouté', 'Événement créé', 'success');
      }
      closeModal('modal-evenement');
    } catch (err) {
      showToast('Erreur', err.message, 'error');
    } finally {
      btn.textContent = 'Enregistrer';
      btn.disabled = false;
    }
  });
}


