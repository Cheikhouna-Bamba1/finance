// ============================================================
//  projets.js — Gestion des projets
// ============================================================
import { db }              from './firebase-config.js';
import { showToast, confirmDialog, formatCurrency } from './utils.js';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const projetsRef = collection(db, 'projets');

let allProjets = [];
let editingId  = null;

const tbody = document.getElementById('projets-tbody');
const form  = document.getElementById('form-projet');

// ─── Chargement en temps réel ───
onSnapshot(query(projetsRef, orderBy('nom')), snap => {
  allProjets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderTable();
});

// ─── Rendu ───
function renderTable() {
  if (!tbody) return;
  tbody.innerHTML = '';

  if (allProjets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;color:var(--gray-400);">Aucun projet enregistré</td></tr>`;
    return;
  }

  allProjets.forEach(p => {
    const cible     = Number(p.budget_cible)    || 0;
    const collecte  = Number(p.montant_collecte) || 0;
    const restant   = cible - collecte;
    const pct       = cible > 0 ? Math.min(100, (collecte / cible) * 100) : 0;
    const isTermine = p.statut === 'terminé';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="fw-medium">${escHtml(p.nom)}</span>
        ${p.description ? `<br><small class="text-muted">${escHtml(p.description)}</small>` : ''}
      </td>
      <td class="fw-bold">${formatCurrency(cible)}</td>
      <td class="text-success fw-medium">${formatCurrency(collecte)}</td>
      <td class="${restant > 0 ? 'text-danger' : 'text-success'} fw-medium">${restant > 0 ? formatCurrency(restant) : '✓ Atteint'}</td>
      <td style="min-width:140px">
        <div class="progress-wrap">
          <div class="progress-bar ${pct >= 100 ? 'gold' : ''}" style="width:${pct.toFixed(0)}%"></div>
        </div>
        <small class="text-muted">${pct.toFixed(0)}%</small>
      </td>
      <td>
        <span class="badge ${isTermine ? 'badge-success' : 'badge-info'}">
          ${isTermine ? '✓ Terminé' : '⏳ En cours'}
        </span>
      </td>
      <td>
        <div class="d-flex gap-1">
          ${!isTermine ? `
          <button class="btn btn-sm btn-gold btn-icon" title="Marquer terminé" onclick="markTermine('${p.id}')">
            <i class="fa-solid fa-check"></i>
          </button>` : ''}
          <button class="btn btn-sm btn-outline btn-icon" title="Modifier" onclick="openEditProjet('${p.id}')">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button class="btn btn-sm btn-danger btn-icon" title="Supprimer" onclick="deleteProjet('${p.id}','${escHtml(p.nom)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ─── Ouvrir modal ajout ───
window.openAddProjet = function() {
  editingId = null;
  form.reset();
  document.getElementById('modal-projet-title').textContent = 'Ajouter un projet';
  openModal('modal-projet');
};

// ─── Ouvrir modal édition ───
window.openEditProjet = function(id) {
  const p = allProjets.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('modal-projet-title').textContent = 'Modifier le projet';
  document.getElementById('proj-nom').value      = p.nom             || '';
  document.getElementById('proj-cible').value    = p.budget_cible    || '';
  document.getElementById('proj-collecte').value = p.montant_collecte|| '';
  document.getElementById('proj-statut').value   = p.statut          || 'en cours';
  document.getElementById('proj-desc').value     = p.description     || '';
  openModal('modal-projet');
};

// ─── Marquer terminé ───
window.markTermine = async function(id) {
  try {
    await updateDoc(doc(db, 'projets', id), { statut: 'terminé' });
    showToast('Succès', 'Projet marqué comme terminé 🎉', 'success');
  } catch (e) {
    showToast('Erreur', e.message, 'error');
  }
};

// ─── Supprimer ───
window.deleteProjet = async function(id, nom) {
  const ok = await confirmDialog('Supprimer ce projet ?', `"${nom}" sera définitivement supprimé.`);
  if (!ok) return;
  try {
    await deleteDoc(doc(db, 'projets', id));
    showToast('Supprimé', 'Projet supprimé avec succès', 'success');
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
      nom:             document.getElementById('proj-nom').value.trim(),
      budget_cible:    parseFloat(document.getElementById('proj-cible').value)    || 0,
      montant_collecte:parseFloat(document.getElementById('proj-collecte').value) || 0,
      statut:          document.getElementById('proj-statut').value,
      description:     document.getElementById('proj-desc').value.trim() || null,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'projets', editingId), data);
        showToast('Modifié', 'Projet mis à jour', 'success');
      } else {
        await addDoc(projetsRef, data);
        showToast('Ajouté', 'Projet créé', 'success');
      }
      closeModal('modal-projet');
    } catch (err) {
      showToast('Erreur', err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
