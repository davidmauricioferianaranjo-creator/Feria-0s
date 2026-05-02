const DEFAULT_WEIGHTS = {
  goal: 30,
  responsibilities: 30,
  margin: 25,
  liquidity: 15,
};

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function monthProgress() {
  const now = new Date();
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return clamp(now.getDate() / total, 0.05, 1);
}

export function getDebtNumbers(deudas = []) {
  return deudas.reduce((acc, debt) => {
    const original = n(debt.deuda_original, n(debt.original, n(debt.monto, 0)));
    const saldo = n(debt.saldo_actual, n(debt.saldo_pendiente, debt.status === 'pagada' ? 0 : n(debt.monto, original)));
    const cuota = debt.status === 'pagada' ? 0 : n(debt.cuota_mensual, n(debt.cuota, 0));
    acc.original += original;
    acc.pending += Math.max(0, saldo);
    acc.paid += Math.max(0, original - saldo);
    acc.monthlyQuota += Math.max(0, cuota);
    return acc;
  }, { original:0, pending:0, paid:0, monthlyQuota:0 });
}

export function calculateStudioHealth({
  meta,
  ingresos = 0,
  gastos = 0,
  porCobrar = 0,
  deudas = [],
  config = {},
} = {}) {
  const objetivo = Math.max(1, n(meta?.objetivo, 14000));
  const weights = { ...DEFAULT_WEIGHTS, ...(config.weights || meta?.health_weights || {}) };
  const totalWeight = Object.values(weights).reduce((a, b) => a + n(b, 0), 0) || 100;
  const debt = getDebtNumbers(deudas);
  const fixedCosts = Math.max(0, n(gastos, 0));
  const responsibilities = fixedCosts + debt.monthlyQuota;
  const progress = monthProgress();

  const goalCoverage = n(ingresos) / objetivo;
  const goalPace = goalCoverage / progress;
  const paceScore = clamp(goalPace * 100);
  const absoluteGoalScore = clamp(goalCoverage * 100);
  const goalScore = clamp((paceScore * 0.45) + (absoluteGoalScore * 0.55));

  const coverageRatio = responsibilities > 0 ? n(ingresos) / responsibilities : 1;
  const responsibilitiesScore = clamp(coverageRatio * 100);

  const marginRatio = n(ingresos) > 0 ? (n(ingresos) - fixedCosts) / n(ingresos) : 0;
  const targetMargin = clamp(n(config.marginTarget, n(meta?.margin_target, 0.42)), 0.1, 0.8);
  const marginScore = clamp((marginRatio / targetMargin) * 100);

  const liquidityThreshold = Math.max(1, n(config.liquidityThreshold, n(meta?.liquidity_threshold, objetivo * 0.35)));
  const liquidityScore = clamp(100 - (n(porCobrar) / liquidityThreshold) * 60);

  const dimensions = [
    {
      id: 'goal',
      label: 'Meta comercial',
      weight: weights.goal,
      score: Math.round(goalScore),
      value: `${Math.round((n(ingresos) / objetivo) * 100)}%`,
      note: `Ritmo comercial al ${Math.round(goalPace * 100)}% del avance esperado del mes.`,
      color: goalScore >= 80 ? 'var(--green)' : goalScore >= 55 ? 'var(--gold)' : 'var(--red)',
    },
    {
      id: 'responsibilities',
      label: 'Responsabilidades',
      weight: weights.responsibilities,
      score: Math.round(responsibilitiesScore),
      value: `${Math.round(coverageRatio * 100)}%`,
      note: `Ingresos cubren ${Math.round(coverageRatio * 100)}% de costos operativos y cuotas de deuda.`,
      color: responsibilitiesScore >= 100 ? 'var(--green)' : responsibilitiesScore >= 80 ? 'var(--gold)' : 'var(--red)',
    },
    {
      id: 'margin',
      label: 'Margen real',
      weight: weights.margin,
      score: Math.round(marginScore),
      value: `${Math.round(marginRatio * 100)}%`,
      note: `Margen real frente a objetivo saludable de ${Math.round(targetMargin * 100)}%.`,
      color: marginScore >= 85 ? 'var(--green)' : marginScore >= 60 ? 'var(--gold)' : 'var(--red)',
    },
    {
      id: 'liquidity',
      label: 'Liquidez',
      weight: weights.liquidity,
      score: Math.round(liquidityScore),
      value: `$${n(porCobrar).toLocaleString()}`,
      note: `Pagos pendientes frente a umbral operativo de $${liquidityThreshold.toLocaleString()}.`,
      color: liquidityScore >= 80 ? 'var(--green)' : liquidityScore >= 55 ? 'var(--gold)' : 'var(--red)',
    },
  ];

  const rawScore = Math.round(dimensions.reduce((sum, d) => sum + d.score * (n(d.weight) / totalWeight), 0));
  const score = goalCoverage < 0.25
    ? Math.min(rawScore, 59)
    : goalCoverage < 0.50
      ? Math.min(rawScore, 74)
      : goalCoverage < 0.75
        ? Math.min(rawScore, 86)
        : rawScore;
  const status = score >= 80
    ? { label:'Excelente', color:'var(--green)' }
    : score >= 60
      ? { label:'Estable', color:'var(--gold)' }
      : score >= 40
        ? { label:'Atencion', color:'var(--orange, #f59e0b)' }
        : { label:'Critico', color:'var(--red)' };
  const worst = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const signals = [
    worst?.note,
    debt.monthlyQuota > 0 ? `Las cuotas mensuales de deuda suman $${debt.monthlyQuota.toLocaleString()} y forman parte de las responsabilidades reales del estudio.` : null,
    debt.pending > 0 ? `Pasivo pendiente actual: $${debt.pending.toLocaleString()} de $${debt.original.toLocaleString()} registrados.` : null,
    n(porCobrar) > objetivo * 0.25 ? `Hay $${n(porCobrar).toLocaleString()} pendientes de cobro. Si entran antes del cierre, la cobertura mejora.` : null,
  ].filter(Boolean).slice(0, 4);

  return {
    score,
    rawScore,
    status,
    dimensions,
    worst,
    signals,
    debt,
    responsibilities,
    marginRatio,
    goalPace,
  };
}
