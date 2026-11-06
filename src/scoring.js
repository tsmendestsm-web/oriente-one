// Oriente One v1.3.0 | Motor de cálculo dos assessments
import { INSTRUMENTS } from './instruments.js';

// Faixas do Diagnóstico Organizacional (média 1 a 5)
export const ORG_FAIXAS = [
  { min: 4.0, label: 'Muito boa' },
  { min: 3.0, label: 'Boa' },
  { min: 0, label: 'Em desenvolvimento' },
];
// Faixas do Índice Explore NR-1 (0 a 100)
export const NR1_FAIXAS = [
  { min: 70, label: 'ADEQUADO' },
  { min: 50, label: 'ATENÇÃO' },
  { min: 0, label: 'CRÍTICO' },
];
export const NR1_PESO_A = 0.4;
export const NR1_PESO_B = 0.6;
export const NR1_DIVERGENCIA = 15; // pontos entre A e B para disparar alerta

const faixa = (v, faixas) => (v == null ? null : faixas.find((f) => v >= f.min).label);
const round = (v, d = 2) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);
const toIndex = (mean) => (mean == null ? null : ((mean - 1) / 4) * 100);

function itemValue(item, raw, scale) {
  const v = Number(raw);
  if (!raw || raw === 'NA' || !Number.isFinite(v)) return null;
  const c = Math.min(scale.max, Math.max(scale.min, v));
  return item.reverse ? scale.max + scale.min - c : c;
}

// Média por seção e por item para um conjunto de respostas
export function aggregate(instKey, respostas) {
  const inst = INSTRUMENTS[instKey];
  const sections = [];
  const all = [];
  for (const s of inst.sections) {
    if (!s.scored) continue;
    const items = s.items.filter((i) => i.type === 'scale').map((it) => {
      const vals = respostas.map((r) => itemValue(it, r[it.id], inst.scale)).filter((v) => v != null);
      const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      return { id: it.id, text: it.text, reverse: !!it.reverse, n: vals.length, mean: round(mean) };
    });
    const vals = items.filter((i) => i.mean != null);
    const mean = vals.length ? vals.reduce((a, b) => a + b.mean, 0) / vals.length : null;
    if (mean != null) all.push(mean);
    sections.push({ key: s.key, title: s.title, mean: round(mean), index: round(toIndex(mean), 1), items });
  }
  const mean = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
  return { n: respostas.length, mean: round(mean), index: round(toIndex(mean), 1), sections };
}

export function resultadoOrg(respostas) {
  const ag = aggregate('org', respostas);
  ag.sections.forEach((s) => (s.avaliacao = faixa(s.mean, ORG_FAIXAS)));
  ag.avaliacao = faixa(ag.mean, ORG_FAIXAS);
  return ag;
}

export function resultadoNR1(respA, respB) {
  const A = respA.length ? aggregate('nr1_lid', respA) : null;
  const B = respB.length ? aggregate('nr1_col', respB) : null;
  for (const X of [A, B]) if (X) { X.classificacao = faixa(X.index, NR1_FAIXAS); X.sections.forEach((s) => (s.classificacao = faixa(s.index, NR1_FAIXAS))); }
  let consolidado = null;
  if (A && B && A.index != null && B.index != null) consolidado = A.index * NR1_PESO_A + B.index * NR1_PESO_B;
  else consolidado = (A || B)?.index ?? null;
  const divergencias = [];
  if (A && B) {
    for (const sb of B.sections) {
      const sa = A.sections.find((s) => s.key === sb.key);
      if (sa && sa.index != null && sb.index != null) {
        const gap = sa.index - sb.index;
        divergencias.push({ key: sb.key, title: sb.title, lideranca: sa.index, colaboradores: sb.index, gap: round(gap, 1), alerta: Math.abs(gap) >= NR1_DIVERGENCIA });
      }
    }
  }
  const gapGeral = A && B && A.index != null && B.index != null ? round(A.index - B.index, 1) : null;
  return {
    A, B,
    consolidado: round(consolidado, 1),
    classificacao: faixa(consolidado, NR1_FAIXAS),
    parcial: !(A && B),
    gapGeral,
    alertaDivergencia: gapGeral != null && Math.abs(gapGeral) >= NR1_DIVERGENCIA,
    divergencias,
    pesos: { A: NR1_PESO_A, B: NR1_PESO_B },
  };
}
