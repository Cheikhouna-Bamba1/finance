import { db }                          from './firebase-config.js';
import { formatCurrency, showToast, escHtml } from './utils.js';
import { createCategoryPieChart,
         createSoldeLineChart }         from './charts.js';
import {
  collection, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const cotisationsRef = collection(db, 'cotisations');
const depensesRef    = collection(db, 'depenses');
const evenementsRef  = collection(db, 'evenements');
const projetsRef     = collection(db, 'projets');

let allCotisations = [];
let allDepenses    = [];
let allEvenements  = [];
let allProjets     = [];
let periode        = 'tout';

const TOTAL_COLLECTIONS = 4;
let loadedCollections = new Set();
let initialLoadComplete = false;

function onCollectionUpdate(name, data, snap) {
  data.length = 0;
  data.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
  if (!initialLoadComplete) {
    loadedCollections.add(name);
    if (loadedCollections.size === TOTAL_COLLECTIONS) {
      initialLoadComplete = true;
      refresh();
    }
  } else {
    refresh();
  }
}

function onCollectionError(name, error) {
  showToast('Erreur de chargement', `Impossible de charger les ${name}. Vérifiez votre connexion.`, 'error');
  if (!initialLoadComplete) {
    loadedCollections.add(name);
    if (loadedCollections.size === TOTAL_COLLECTIONS) {
      initialLoadComplete = true;
      refresh();
    }
  }
}

onSnapshot(query(cotisationsRef, orderBy('date','asc')),
  snap => onCollectionUpdate('cotisations', allCotisations, snap),
  err => onCollectionError('cotisations', err)
);
onSnapshot(query(depensesRef, orderBy('date','asc')),
  snap => onCollectionUpdate('depenses', allDepenses, snap),
  err => onCollectionError('dépenses', err)
);
onSnapshot(query(evenementsRef, orderBy('date','desc')),
  snap => onCollectionUpdate('evenements', allEvenements, snap),
  err => onCollectionError('événements', err)
);
onSnapshot(query(projetsRef),
  snap => onCollectionUpdate('projets', allProjets, snap),
  err => onCollectionError('projets', err)
);

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

function refresh() {
  const cotis    = filterByPeriod(allCotisations, 'date').filter(c => c.statut === 'payé');
  const deps     = filterByPeriod(allDepenses, 'date');
  const totalCot = cotis.reduce((s, c) => s + (Number(c.montant) || 0), 0);
  const totalDep = deps.reduce((s, d) =>  s + (Number(d.montant) || 0), 0);
  const solde    = totalCot - totalDep;

  setText('bilan-total-cot',  formatCurrency(totalCot));
  setText('bilan-total-dep',  formatCurrency(totalDep));
  setText('bilan-solde',      formatCurrency(solde));
  const soldeEl = document.getElementById('bilan-solde');
  if (soldeEl) soldeEl.className = `value fw-bold ${solde >= 0 ? 'positive' : 'negative'}`;

  renderEvenementsBilan(deps);
  renderProjetsBilan();
  renderCatsBilan(deps);
  drawPieChart(deps);
  drawLineChart(cotis, deps);
}

function renderEvenementsBilan(deps) {
  const tbody = document.getElementById('bilan-ev-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (allEvenements.length === 0) return;
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

function renderProjetsBilan() {
  const tbody = document.getElementById('bilan-proj-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (allProjets.length === 0) return;
  allProjets.forEach(p => {
    const cible    = Number(p.budget_cible)     || 0;
    const collecte = Number(p.montant_collecte)  || 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(p.nom)}</td>
      <td>${formatCurrency(cible)}</td>
      <td>${formatCurrency(collecte)}</td>
      <td>
        <span class="badge ${p.statut==='terminé'?'badge-success':'badge-info'}">${p.statut === 'terminé' ? '<i class="fa-solid fa-check" style="margin-right:4px;"></i> Terminé' : '<i class="fa-solid fa-hourglass-half" style="margin-right:4px;"></i> En cours'}</span>
      </td>`;
    tbody.appendChild(tr);
  });
}

function renderCatsBilan(deps) {
  const tbody = document.getElementById('bilan-cat-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const catMap = {};
  deps.forEach(d => {
    const c = d.categorie || 'autre';
    catMap[c] = (catMap[c] || 0) + (Number(d.montant) || 0);
  });
  Object.entries(catMap).sort((a, b) => b[1] - a[1]).forEach(([cat, mt]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-capitalize">${escHtml(cat)}</td>
      <td>${formatCurrency(mt)}</td>`;
    tbody.appendChild(tr);
  });
}

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

function drawLineChart(cotis, deps) {
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

document.querySelectorAll('.period-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    periode = btn.dataset.periode;
    document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    refresh();
  });
});

window.exportPDF = function() {
  try {
    const jspdfLib = window.jspdf || window.jsPDF;
    if (!jspdfLib) {
      alert('jsPDF non chargé. Vérifiez votre connexion internet.');
      return;
    }
    const jsPDF = jspdfLib.jsPDF || jspdfLib;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const cleanDocText = doc.text.bind(doc);
    doc.text = function(text, x, y, options) {
      const safeText = String(text).replace(/\u202F|\u00A0/g, ' ');
      return cleanDocText(safeText, x, y, options);
    };

    const cotis    = filterByPeriod(allCotisations, 'date').filter(c => c.statut === 'payé');
    const deps     = filterByPeriod(allDepenses, 'date');
    const totalCot = cotis.reduce((s, c) => s + (Number(c.montant) || 0), 0);
    const totalDep = deps.reduce((s, d) =>  s + (Number(d.montant) || 0), 0);
    const solde    = totalCot - totalDep;
    const now      = new Date();

    let y = 15;
    const lm = 15;
    const pw = 180;

    doc.setFillColor(34, 60, 43);
    doc.rect(0, 0, 210, 42, 'F');

    doc.setDrawColor(200, 169, 81);
    doc.setLineWidth(0.8);
    doc.line(15, 42, 195, 42);

    doc.setTextColor(200, 169, 81);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DAHIRA MAFTIKHOUL JINAN', 105, 17, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BILAN FINANCIER', 105, 27, { align: 'center' });

    doc.setTextColor(200, 169, 81);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const periodLabel = { tout:'Toutes périodes', mois:'Ce mois', trimestre:'Ce trimestre', annee:'Cette année' }[periode] || '';
    doc.text(`Période : ${periodLabel}`, 105, 36, { align: 'center' });

    y = 55;
    doc.setTextColor(30, 30, 30);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 60, 43);
    doc.text('RÉSUMÉ FINANCIER', lm, y); y += 8;

    doc.setDrawColor(34, 60, 43);
    doc.setLineWidth(0.8);
    doc.line(lm, y, lm + pw, y); y += 6;

    const summaryRows = [
      ['Total des cotisations perçues', formatCurrency(totalCot)],
      ['Total des dépenses',            formatCurrency(totalDep)],
    ];
    summaryRows.forEach(([label, val], idx) => {
      if (idx === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(lm, y-4, pw, 8, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(label, lm+2, y+1);
      doc.setFont('helvetica', 'bold');
      doc.text(val, lm + pw, y+1, { align: 'right' });
      y += 8;
    });

    doc.setFillColor(solde >= 0 ? 212 : 248, solde >= 0 ? 237 : 215, solde >= 0 ? 218 : 218);
    doc.rect(lm, y-4, pw, 10, 'F');
    doc.setDrawColor(solde >= 0 ? 34 : 176, solde >= 0 ? 60 : 42, solde >= 0 ? 43 : 55);
    doc.setLineWidth(0.5);
    doc.rect(lm, y-4, pw, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(solde >= 0 ? 34 : 176, solde >= 0 ? 60 : 42, solde >= 0 ? 43 : 55);
    doc.text('SOLDE NET', lm+3, y+3);
    doc.text(formatCurrency(solde), lm + pw, y+3, { align: 'right' });
    y += 18;

    if (allEvenements.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 60, 43);
      doc.text('DÉTAIL PAR ÉVÉNEMENT', lm, y); y += 8;
      doc.setDrawColor(34, 60, 43);
      doc.setLineWidth(0.8);
      doc.line(lm, y, lm + pw, y); y += 5;

      const evHeaders = ['Événement', 'Budget prévu', 'Dépenses réelles', 'Solde'];
      const evColW    = [68, 38, 38, 36];
      const evColX    = [];
      let cx = lm;
      evColW.forEach(w => { evColX.push(cx); cx += w; });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(34, 60, 43);
      doc.rect(lm, y, pw, 7, 'F');
      doc.setTextColor(255);
      evHeaders.forEach((h, i) => { doc.text(h, evColX[i] + 2, y+5); });
      y += 7;

      doc.setFont('helvetica', 'normal');
      const rowH = 6;
      allEvenements.forEach((ev, idx) => {
        const evDeps = deps.filter(d => d.evenement_id === ev.id);
        const total  = evDeps.reduce((s, d) => s + (Number(d.montant)||0), 0);
        const budget = Number(ev.budget_prevu)||0;
        const sol    = budget - total;

        if (idx % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(lm, y, pw, rowH, 'F');
        }

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        evColX.forEach((x, i) => {
          doc.rect(x, y, evColW[i], rowH);
        });

        const alignment = i => (i === 0 ? 'left' : 'right');
        const vals = [ev.nom, formatCurrency(budget), formatCurrency(total), (sol>=0?'+':'')+formatCurrency(sol)];
        vals.forEach((v, i) => {
          if (i === 3) doc.setTextColor(sol >= 0 ? 25 : 176, sol >= 0 ? 135 : 42, sol >= 0 ? 84 : 55);
          else         doc.setTextColor(40, 40, 40);
          const px = (i === 0) ? evColX[i] + 2 : evColX[i] + evColW[i] - 2;
          doc.text(String(v), px, y+4, { align: alignment(i) });
        });
        y += rowH;
        if (y > 260) { doc.addPage(); y = 20; }
      });
      y += 8;
    }

    const catMap = {};
    deps.forEach(d => {
      const c = d.categorie || 'autre';
      catMap[c] = (catMap[c] || 0) + (Number(d.montant) || 0);
    });

    if (Object.keys(catMap).length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 60, 43);
      doc.text('DÉPENSES PAR CATÉGORIE', lm, y); y += 8;
      doc.setDrawColor(34, 60, 43);
      doc.setLineWidth(0.8);
      doc.line(lm, y, lm + pw, y); y += 5;

      const catHeaders = ['Catégorie', 'Montant'];
      const catColW    = [110, 70];
      const catColX    = [lm, lm + 110];

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(34, 60, 43);
      doc.rect(lm, y, pw, 7, 'F');
      doc.setTextColor(255);
      catHeaders.forEach((h, i) => { doc.text(h, catColX[i] + 2, y+5); });
      y += 7;

      doc.setFont('helvetica', 'normal');
      const rowH = 6;
      Object.entries(catMap).sort((a,b)=>b[1]-a[1]).forEach(([cat, mt], idx) => {
        if (idx % 2 === 0) { doc.setFillColor(245,245,245); doc.rect(lm, y, pw, rowH, 'F'); }

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        catColX.forEach((x, i) => {
          doc.rect(x, y, catColW[i], rowH);
        });

        doc.setTextColor(40, 40, 40);
        const label = cat.charAt(0).toUpperCase() + cat.slice(1);
        doc.text(label, catColX[0] + 2, y+4);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(mt), catColX[1] + catColW[1] - 2, y+4, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += rowH;
      });
      y += 8;
    }

    if (y > 260) { doc.addPage(); y = 20; }
    y = Math.max(y, 265);
    doc.setDrawColor(200, 169, 81);
    doc.setLineWidth(1);
    doc.line(lm, y, lm + pw, y); y += 6;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'italic');
    doc.text('Dahira Maftikhoul Jinan — Système de Gestion Financière', 105, y, { align: 'center' });
    doc.text(`Document confidentiel — ${now.toLocaleDateString('fr-FR')}`, 105, y+4, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    const filename = `bilan-dahira-${now.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

  } catch (err) {
    alert('Erreur: ' + err.message);
  }
};

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
