// ============================================================
//  bilan.js — Bilan global + Export PDF (jsPDF)
// ============================================================
import { db }                          from './firebase-config.js';
import { formatCurrency, fmtDate }     from './utils.js';
import { createCategoryPieChart,
         createSoldeLineChart }         from './charts.js';
import {
  collection, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Refs ───
const cotisationsRef = collection(db, 'cotisations');
const depensesRef    = collection(db, 'depenses');
const evenementsRef  = collection(db, 'evenements');
const projetsRef     = collection(db, 'projets');

// ─── État ───
let allCotisations = [];
let allDepenses    = [];
let allEvenements  = [];
let allProjets     = [];
let periode        = 'tout';

// ─── Chargement ───
onSnapshot(query(cotisationsRef, orderBy('date','asc')), snap => {
  allCotisations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  refresh();
});
onSnapshot(query(depensesRef, orderBy('date','asc')), snap => {
  allDepenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  refresh();
});
onSnapshot(query(evenementsRef, orderBy('date','desc')), snap => {
  allEvenements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  refresh();
});
onSnapshot(query(projetsRef), snap => {
  allProjets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  refresh();
});

// ─── Filtre période ───
function filterByPeriod(items, field) {
  if (periode === 'tout') return items;
  const now  = new Date();
  return items.filter(item => {
    const ts = item[field];
    if (!ts) return false;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (periode === 'mois')      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (periode === 'trimestre') {
      const q = Math.floor(now.getMonth() / 3);
      return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === q;
    }
    if (periode === 'annee')     return d.getFullYear() === now.getFullYear();
    return true;
  });
}

// ─── Rafraîchissement ───
function refresh() {
  const cotis    = filterByPeriod(allCotisations, 'date').filter(c => c.statut === 'payé');
  const deps     = filterByPeriod(allDepenses, 'date');
  const totalCot = cotis.reduce((s, c) => s + (Number(c.montant) || 0), 0);
  const totalDep = deps.reduce((s, d) =>  s + (Number(d.montant) || 0), 0);
  const solde    = totalCot - totalDep;

  // Résumé principal
  setText('bilan-total-cot',  formatCurrency(totalCot));
  setText('bilan-total-dep',  formatCurrency(totalDep));
  setText('bilan-solde',      formatCurrency(solde));
  const soldeEl = document.getElementById('bilan-solde');
  if (soldeEl) soldeEl.className = `value fw-bold ${solde >= 0 ? 'positive' : 'negative'}`;

  // Par événement
  renderEvenementsBilan(deps);

  // Par projet
  renderProjetsBilan();

  // Par catégorie
  renderCatsBilan(deps);

  // Graphiques
  drawPieChart(deps);
  drawLineChart(cotis, deps);
}

// ─── Tableau événements ───
function renderEvenementsBilan(deps) {
  const tbody = document.getElementById('bilan-ev-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (allEvenements.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucun événement</td></tr>';
    return;
  }
  allEvenements.forEach(ev => {
    const evDeps = deps.filter(d => d.evenement_id === ev.id);
    const total  = evDeps.reduce((s, d) => s + (Number(d.montant) || 0), 0);
    const budget = Number(ev.budget_prevu) || 0;
    const solde  = budget - total;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(ev.nom)}</td>
      <td>${formatCurrency(budget)}</td>
      <td>${formatCurrency(total)}</td>
      <td class="fw-bold ${solde >= 0 ? 'text-success' : 'text-danger'}">${(solde >= 0 ? '+' : '') + formatCurrency(solde)}</td>`;
    tbody.appendChild(tr);
  });
}

// ─── Tableau projets ───
function renderProjetsBilan() {
  const tbody = document.getElementById('bilan-proj-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (allProjets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucun projet</td></tr>';
    return;
  }
  allProjets.forEach(p => {
    const cible    = Number(p.budget_cible)     || 0;
    const collecte = Number(p.montant_collecte)  || 0;
    const pct      = cible > 0 ? ((collecte / cible) * 100).toFixed(0) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(p.nom)}</td>
      <td>${formatCurrency(cible)}</td>
      <td>${formatCurrency(collecte)}</td>
      <td>
        <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
        <small>${pct}% — <span class="badge ${p.statut==='terminé'?'badge-success':'badge-info'}">${p.statut}</span></small>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ─── Tableau catégories ───
function renderCatsBilan(deps) {
  const tbody = document.getElementById('bilan-cat-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const catMap = {};
  deps.forEach(d => {
    const c = d.categorie || 'autre';
    catMap[c] = (catMap[c] || 0) + (Number(d.montant) || 0);
  });
  const total = Object.values(catMap).reduce((s, v) => s + v, 0);
  Object.entries(catMap).sort((a, b) => b[1] - a[1]).forEach(([cat, mt]) => {
    const pct = total > 0 ? ((mt / total) * 100).toFixed(1) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-capitalize">${escHtml(cat)}</td>
      <td>${formatCurrency(mt)}</td>
      <td>${pct}%</td>`;
    tbody.appendChild(tr);
  });
  if (Object.keys(catMap).length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Aucune dépense</td></tr>';
  }
}

// ─── Graphique camembert ───
function drawPieChart(deps) {
  const catMap = {};
  deps.forEach(d => {
    const c = d.categorie || 'autre';
    catMap[c] = (catMap[c] || 0) + (Number(d.montant) || 0);
  });
  const labels = Object.keys(catMap);
  const data   = Object.values(catMap);
  if (typeof createCategoryPieChart !== 'undefined') {
    createCategoryPieChart('chart-categories', labels, data);
  }
}

// ─── Graphique courbe solde ───
function drawLineChart(cotis, deps) {
  // Grouper par mois
  const map = {};
  [...cotis, ...deps].forEach(item => {
    const ts = item.date;
    if (!ts) return;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!map[key]) map[key] = { income: 0, expense: 0 };
    if (item.statut !== undefined) {
      if (item.statut === 'payé') map[key].income += Number(item.montant) || 0;
    } else {
      map[key].expense += Number(item.montant) || 0;
    }
  });

  const sorted = Object.keys(map).sort();
  let cumul = 0;
  const labels   = sorted.map(k => {
    const [y, m] = k.split('-');
    return new Date(y, m-1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  });
  const soldes = sorted.map(k => {
    cumul += (map[k].income - map[k].expense);
    return cumul;
  });

  if (typeof createSoldeLineChart !== 'undefined') {
    createSoldeLineChart('chart-solde', labels, soldes);
  }
}

// ─── Boutons période ───
document.querySelectorAll('.period-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    periode = btn.dataset.periode;
    document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    refresh();
  });
});

// ─── Export PDF ───
window.exportPDF = function() {
  if (typeof window.jspdf === 'undefined') {
    alert('jsPDF non chargé. Vérifiez votre connexion internet.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const cotis    = filterByPeriod(allCotisations, 'date').filter(c => c.statut === 'payé');
  const deps     = filterByPeriod(allDepenses, 'date');
  const totalCot = cotis.reduce((s, c) => s + (Number(c.montant) || 0), 0);
  const totalDep = deps.reduce((s, d) =>  s + (Number(d.montant) || 0), 0);
  const solde    = totalCot - totalDep;
  const now      = new Date();

  let y = 15;
  const lm = 15; // left margin
  const pw = 180; // page width usable

  // ─── En-tête ───
  doc.setFillColor(26, 92, 56);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(200, 169, 81);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DAHIRA MAFTIKHOUL JINAN', 105, 17, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Bilan Financier', 105, 26, { align: 'center' });

  doc.setFontSize(9);
  const periodLabel = { tout:'Toutes périodes', mois:'Ce mois', trimestre:'Ce trimestre', annee:'Cette année' }[periode] || '';
  doc.text(`Période : ${periodLabel}  |  Généré le : ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, 105, 34, { align: 'center' });

  y = 50;
  doc.setTextColor(30, 30, 30);

  // ─── Résumé ───
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 92, 56);
  doc.text('RÉSUMÉ FINANCIER', lm, y); y += 7;

  doc.setDrawColor(26, 92, 56);
  doc.setLineWidth(0.5);
  doc.line(lm, y, lm + pw, y); y += 5;

  const summaryRows = [
    ['Total des cotisations perçues', formatCurrency(totalCot)],
    ['Total des dépenses',            formatCurrency(totalDep)],
  ];
  summaryRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(label, lm, y);
    doc.setFont('helvetica', 'bold');
    doc.text(val, lm + pw, y, { align: 'right' });
    y += 7;
  });

  // Solde net
  doc.setFillColor(solde >= 0 ? 209 : 248, solde >= 0 ? 231 : 215, solde >= 0 ? 221 : 218);
  doc.rect(lm, y-4, pw, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(solde >= 0 ? 25 : 176, solde >= 0 ? 135 : 42, solde >= 0 ? 84 : 55);
  doc.text('SOLDE NET', lm+2, y+3);
  doc.text(formatCurrency(solde), lm + pw, y+3, { align: 'right' });
  y += 16;

  // ─── Par événement ───
  if (allEvenements.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 92, 56);
    doc.text('DÉTAIL PAR ÉVÉNEMENT', lm, y); y += 6;
    doc.line(lm, y, lm + pw, y); y += 4;

    const evHeaders = ['Événement', 'Budget prévu', 'Dépenses réelles', 'Solde'];
    const evColW    = [70, 35, 40, 35];
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(26, 92, 56);
    doc.rect(lm, y, pw, 7, 'F');
    doc.setTextColor(255);
    let x = lm + 2;
    evHeaders.forEach((h, i) => { doc.text(h, x, y+5); x += evColW[i]; });
    y += 7;

    doc.setFont('helvetica', 'normal');
    allEvenements.forEach((ev, idx) => {
      const evDeps = deps.filter(d => d.evenement_id === ev.id);
      const total  = evDeps.reduce((s, d) => s + (Number(d.montant)||0), 0);
      const budget = Number(ev.budget_prevu)||0;
      const sol    = budget - total;
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(lm, y, pw, 6, 'F');
      }
      doc.setTextColor(40, 40, 40);
      x = lm + 2;
      const vals = [ev.nom, formatCurrency(budget), formatCurrency(total), (sol>=0?'+':'')+formatCurrency(sol)];
      vals.forEach((v, i) => {
        if (i === 3) doc.setTextColor(sol >= 0 ? 25 : 176, sol >= 0 ? 135 : 42, sol >= 0 ? 84 : 55);
        else         doc.setTextColor(40, 40, 40);
        doc.text(String(v), x, y+4);
        x += evColW[i];
      });
      y += 6;
      if (y > 260) { doc.addPage(); y = 20; }
    });
    y += 6;
  }

  // ─── Par catégorie ───
  const catMap = {};
  deps.forEach(d => {
    const c = d.categorie || 'autre';
    catMap[c] = (catMap[c] || 0) + (Number(d.montant) || 0);
  });

  if (Object.keys(catMap).length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 92, 56);
    doc.text('DÉPENSES PAR CATÉGORIE', lm, y); y += 6;
    doc.line(lm, y, lm + pw, y); y += 4;

    const catHeaders = ['Catégorie', 'Montant', '% du total'];
    const catColW    = [80, 50, 50];
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(26, 92, 56);
    doc.rect(lm, y, pw, 7, 'F');
    doc.setTextColor(255);
    x = lm + 2;
    catHeaders.forEach((h, i) => { doc.text(h, x, y+5); x += catColW[i]; });
    y += 7;

    const totalDeps = Object.values(catMap).reduce((s,v)=>s+v, 0);
    doc.setFont('helvetica', 'normal');
    Object.entries(catMap).sort((a,b)=>b[1]-a[1]).forEach(([cat, mt], idx) => {
      const pct = totalDeps > 0 ? ((mt/totalDeps)*100).toFixed(1) : '0.0';
      if (idx % 2 === 0) { doc.setFillColor(245,245,245); doc.rect(lm, y, pw, 6, 'F'); }
      doc.setTextColor(40, 40, 40);
      x = lm + 2;
      [cat.charAt(0).toUpperCase()+cat.slice(1), formatCurrency(mt), pct+'%'].forEach((v, i) => {
        doc.text(v, x, y+4); x += catColW[i];
      });
      y += 6;
    });
    y += 6;
  }

  // ─── Pied de page ───
  if (y > 260) { doc.addPage(); y = 20; }
  y = Math.max(y, 265);
  doc.setDrawColor(200, 169, 81);
  doc.setLineWidth(0.5);
  doc.line(lm, y, lm + pw, y); y += 5;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.setFont('helvetica', 'italic');
  doc.text('Généré par le système de gestion Dahira Maftikhoul Jinan', 105, y, { align: 'center' });
  doc.text(`Document confidentiel — ${now.toLocaleDateString('fr-FR')}`, 105, y+4, { align: 'center' });

  doc.save(`bilan-dahira-${now.toISOString().split('T')[0]}.pdf`);
};

// ─── Helpers ───
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
