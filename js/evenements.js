// ============================================================
//  evenements.js — Gestion des événements
// ============================================================
import { db }              from './firebase-config.js';
import { showToast, fmtDate, confirmDialog, formatCurrency } from './utils.js';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, where, getDocs, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const evenementsRef = collection(db, 'evenements');
const depensesRef   = collection(db, 'depenses');

let allEvenements = [];
let allDepenses   = [];
let editingId     = null;

const tbody      = document.getElementById('evenements-tbody');
const form       = document.getElementById('form-evenement');
const modalTitle = document.getElementById('modal-evenement-title');

// ─── Charger dépenses en temps réel ───
onSnapshot(query(depensesRef), snap => {
  allDepenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderTable();
});

// ─── Charger événements en temps réel ───
onSnapshot(query(evenementsRef, orderBy('date', 'desc')), snap => {
  allEvenements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderTable();
});

// ─── Calcul dépenses réelles d'un événement ───
function getDepensesEvenement(eventId) {
  return allDepenses
    .filter(d => d.evenement_id === eventId)
    .reduce((sum, d) => sum + (Number(d.montant) || 0), 0);
}

// ─── Rendu ───
function renderTable() {
  if (!tbody) return;
  tbody.innerHTML = '';

  if (allEvenements.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;color:var(--gray-400);">Aucun événement enregistré</td></tr>`;
    return;
  }

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
      <td class="text-danger fw-medium">${formatCurrency(depReelles)}</td>
      <td class="fw-bold ${soldeClass}">${(solde >= 0 ? '+' : '') + formatCurrency(solde)}</td>
      <td>
        <div class="progress-wrap" style="min-width:100px">
          <div class="progress-bar ${depReelles > budgetPrevu ? 'over' : ''}"
               style="width:${Math.min(100, budgetPrevu > 0 ? (depReelles/budgetPrevu)*100 : 0).toFixed(0)}%">
          </div>
        </div>
        <small class="text-muted">${budgetPrevu > 0 ? ((depReelles/budgetPrevu)*100).toFixed(0) : 0}%</small>
      </td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline btn-icon" title="Modifier" onclick="openEditEvenement('${ev.id}')">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button class="btn btn-sm btn-danger btn-icon" title="Supprimer" onclick="deleteEvenement('${ev.id}','${escHtml(ev.nom)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ─── Ouvrir modal ajout ───
window.openAddEvenement = function() {
  editingId = null;
  form.reset();
  document.getElementById('modal-evenement-title').textContent = 'Ajouter un événement';
  openModal('modal-evenement');
};

// ─── Ouvrir modal édition ───
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

// ─── Supprimer ───
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

// ─── Soumission formulaire ───
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
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
      btn.disabled = false;
    }
  });
}

function toInputDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().split('T')[0];
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
