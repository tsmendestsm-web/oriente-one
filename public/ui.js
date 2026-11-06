// Oriente One v1.2.0 | utilidades de interface compartilhadas
export const VERSION = '1.2.0';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const num = (v, d = 1) => (v == null ? '–' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
export const dataBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '–');
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const mesBR = (c) => (c ? `${MESES[Number(c.slice(5, 7)) - 1]}/${c.slice(2, 4)}` : '');
export const hoje = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
export const compAtual = () => hoje().slice(0, 7);
export const addComp = (c, n) => { const [y, m] = c.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };

export async function api(path, opts = {}) {
  const r = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  const ct = r.headers.get('Content-Type') || '';
  const data = ct.includes('json') ? await r.json() : await r.text();
  if (!r.ok) { const e = new Error(data?.error || `Erro ${r.status}`); e.status = r.status; throw e; }
  return data;
}

export function toast(msg, isErr = false) {
  const t = document.getElementById('toast'); if (!t) return alert(msg);
  const d = document.createElement('div'); d.textContent = msg; if (isErr) d.className = 'err';
  t.appendChild(d); setTimeout(() => d.remove(), isErr ? 6000 : 3500);
}

export function qrSvg(text, cell = 4) {
  if (!window.qrcode || !text) return '';
  const q = window.qrcode(0, 'M'); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}

export function formData(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
    else o[el.name] = el.value;
  }
  return o;
}

export async function copiar(text) {
  try { await navigator.clipboard.writeText(text); toast('Copiado.'); }
  catch { prompt('Copie o texto:', text); }
}

export function baixarCsv(nome, linhas) {
  const cell = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = '﻿' + linhas.map((l) => l.map(cell).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = nome + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export const csvNum = (v) => (v == null ? '' : String(Number(v).toFixed(2)).replace('.', ','));
