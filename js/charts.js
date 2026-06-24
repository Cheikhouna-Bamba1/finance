// ============================================================
//  charts.js — Graphiques Chart.js
// ============================================================

// ─── Couleurs de la charte ───
export const COLORS = {
  green:      '#1a5c38',
  greenMid:   '#236b44',
  greenLight: '#2e8b57',
  greenPale:  '#d4edda',
  gold:       '#c8a951',
  goldLight:  '#e0c46e',
  danger:     '#dc3545',
  info:       '#3b82f6',
  warning:    '#ffc107',
  purple:     '#7c3aed',
  teal:       '#0d9488',
};

export const CAT_COLORS = {
  'nourriture': COLORS.green,
  'location':   COLORS.gold,
  'transport':  COLORS.info,
  'équipement': COLORS.purple,
  'communication': COLORS.teal,
  'autre':      COLORS.warning,
};

// ─── Défauts globaux Chart.js ───
if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = "'Poppins', sans-serif";
  Chart.defaults.font.size   = 12;
  Chart.defaults.color       = '#64748b';
  Chart.defaults.plugins.legend.position = 'bottom';
  Chart.defaults.plugins.legend.labels.padding = 20;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15,23,42,0.9)';
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
}

// ─── Graphique Barres : Entrées vs Sorties ───
export function createIncomeExpenseChart(canvasId, labels, incomeData, expenseData) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  // Détruire le chart existant si besoin
  if (ctx._chart) ctx._chart.destroy();

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Cotisations (FCFA)',
          data: incomeData,
          backgroundColor: 'rgba(26,92,56,.75)',
          borderColor: COLORS.green,
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Dépenses (FCFA)',
          data: expenseData,
          backgroundColor: 'rgba(220,53,69,.65)',
          borderColor: COLORS.danger,
          borderWidth: 2,
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatAmount(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => formatAmount(v, true)
          },
          grid: { color: 'rgba(0,0,0,.05)' }
        },
        x: { grid: { display: false } }
      }
    }
  });

  ctx._chart = chart;
  return chart;
}

// ─── Camembert : Dépenses par catégorie ───
export function createCategoryPieChart(canvasId, categories, amounts) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  if (ctx._chart) ctx._chart.destroy();

  const colors = categories.map(c => CAT_COLORS[c] || COLORS.gold);

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
      datasets: [{
        data: amounts,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatAmount(ctx.parsed)}`
          }
        }
      }
    }
  });

  ctx._chart = chart;
  return chart;
}

// ─── Courbe : Évolution du solde ───
export function createSoldeLineChart(canvasId, labels, soldeData) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  if (ctx._chart) ctx._chart.destroy();

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Solde (FCFA)',
        data: soldeData,
        borderColor: COLORS.green,
        backgroundColor: 'rgba(26,92,56,.1)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: COLORS.gold,
        pointBorderColor: COLORS.green,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Solde: ${formatAmount(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        y: {
          ticks: { callback: (v) => formatAmount(v, true) },
          grid: { color: 'rgba(0,0,0,.05)' }
        },
        x: { grid: { display: false } }
      }
    }
  });

  ctx._chart = chart;
  return chart;
}

// ─── Helpers ───
function formatAmount(n, short = false) {
  if (short && Math.abs(n) >= 1000) {
    return (n / 1000).toFixed(0) + 'k FCFA';
  }
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}
