// Oriente One v1.2.0 | Formulário público do assessment
import { esc, api, toast } from './ui.js';

const token = location.pathname.split('/').filter(Boolean).pop();
const KEY = `oo_rascunho_${token}`;
const DONE = `oo_enviado_${token}`;
const root = document.getElementById('root');
let D, pages, page = 0;
const state = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || { perfil: {}, respostas: {} }; } catch { return { perfil: {}, respostas: {} }; } })();
const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sem armazenamento */ } };

function header(sub) {
  const i = D.instrumento;
  return `<div class="pub-head"><div class="in"><div class="brand">ORIENTE <span>ONE</span></div>
    <h1>${esc(i.publicTitle)}</h1><p>${esc(D.empresa)}${D.unidade ? ' · ' + esc(D.unidade) : ''}${i.audience ? ' · ' + esc(i.audience) : ''}</p>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
}

function buildPages() {
  const i = D.instrumento; const p = [];
  p.push({ kind: 'intro' });
  if (i.profile.length) p.push({ kind: 'profile' });
  for (const s of i.sections) p.push({ kind: 'section', s });
  return p;
}

function campo(it, bucket) {
  const val = state[bucket][it.id] ?? '';
  const req = it.required ? ' <span class="req">*</span>' : '';
  if (it.type === 'scale') {
    const sc = D.instrumento.scale; const opts = [];
    for (let n = sc.min; n <= sc.max; n++) opts.push(`<label><input type="radio" name="${it.id}" value="${n}" ${String(val) === String(n) ? 'checked' : ''}><span>${n}</span></label>`);
    if (it.allowNA) opts.push(`<label class="na"><input type="radio" name="${it.id}" value="NA" ${val === 'NA' ? 'checked' : ''}><span>Não se aplica</span></label>`);
    return `<div class="item" data-id="${it.id}"><p>${esc(it.text)}${req}</p><div class="scale">${opts.join('')}</div><div class="ends"><span>${sc.min} · ${esc(sc.minLabel)}</span><span>${sc.max} · ${esc(sc.maxLabel)}</span></div></div>`;
  }
  if (it.type === 'choice') {
    return `<div class="item" data-id="${it.id}"><p>${esc(it.text)}${req}</p><div class="choices">${it.options.map((o) => `<label><input type="radio" name="${it.id}" value="${esc(o)}" ${val === o ? 'checked' : ''}>${esc(o)}</label>`).join('')}</div></div>`;
  }
  if (it.type === 'textarea') return `<div class="item" data-id="${it.id}"><p>${esc(it.text)}${req}</p><textarea name="${it.id}" maxlength="4000">${esc(val)}</textarea></div>`;
  return `<div class="item" data-id="${it.id}"><p>${esc(it.text)}${req}</p><input name="${it.id}" type="${it.type === 'email' ? 'email' : 'text'}" value="${esc(val)}" maxlength="300"></div>`;
}

function render() {
  const pg = pages[page]; const i = D.instrumento;
  const total = pages.length - 1;
  const prog = total ? Math.round((page / total) * 100) : 0;
  let body = '';
  if (pg.kind === 'intro') {
    body = `<div class="card"><p class="intro">${esc(i.intro)}</p>
      ${i.anonimo ? '<p class="note info">Suas respostas são anônimas. Não pedimos nome nem e-mail.</p>' : ''}
      <p class="muted small">Escala de respostas: ${i.scale.min} = ${esc(i.scale.minLabel)} até ${i.scale.max} = ${esc(i.scale.maxLabel)}. Campos com <span style="color:var(--red)">*</span> são obrigatórios. Suas respostas ficam salvas neste aparelho até o envio.</p>
      <div class="nav-btns"><span></span><button class="btn primary" id="nx">Começar</button></div></div>`;
  } else {
    const items = pg.kind === 'profile' ? i.profile : pg.s.items;
    const bucket = pg.kind === 'profile' ? 'perfil' : 'respostas';
    const title = pg.kind === 'profile' ? (i.anonimo ? 'Dados do respondente (sem identificação nominal)' : 'Identificação') : pg.s.title;
    const last = page === pages.length - 1;
    body = `<div class="progress"><div class="bar"><i style="width:${prog}%"></i></div><div class="small muted" style="margin-top:4px">Etapa ${page} de ${total}</div></div>
      <form class="card" id="f" data-bucket="${bucket}">${pg.s?.group ? `<div class="small muted">${esc(pg.s.group)}</div>` : ''}<div class="sec-title">${esc(title)}</div>
      ${pg.s?.note ? `<p class="muted small" style="margin:0 0 6px">${esc(pg.s.note)}</p>` : ''}
      ${items.map((it) => campo(it, bucket)).join('')}
      <div class="nav-btns"><button type="button" class="btn" id="bk">Voltar</button><button class="btn primary" id="nx">${last ? 'Enviar respostas' : 'Continuar'}</button></div></form>`;
  }
  root.innerHTML = header() + `<div class="pub-main">${body}</div>`;
  const f = document.getElementById('f');
  if (f) {
    f.addEventListener('input', (e) => { const el = e.target; if (!el.name) return; state[f.dataset.bucket][el.name] = el.value; salvar(); el.closest('.item')?.classList.remove('missing'); });
    f.addEventListener('change', (e) => { const el = e.target; if (!el.name) return; state[f.dataset.bucket][el.name] = el.value; salvar(); el.closest('.item')?.classList.remove('missing'); });
    f.onsubmit = (e) => { e.preventDefault(); avancar(); };
    document.getElementById('bk').onclick = () => { page--; render(); scrollTo(0, 0); };
  } else document.getElementById('nx').onclick = avancar;
}

function faltando() {
  const pg = pages[page]; if (pg.kind === 'intro') return [];
  const items = pg.kind === 'profile' ? D.instrumento.profile : pg.s.items;
  const bucket = pg.kind === 'profile' ? 'perfil' : 'respostas';
  return items.filter((it) => it.required && !String(state[bucket][it.id] ?? '').trim());
}

async function avancar() {
  const miss = faltando();
  if (miss.length) {
    miss.forEach((it) => document.querySelector(`.item[data-id="${it.id}"]`)?.classList.add('missing'));
    document.querySelector(`.item[data-id="${miss[0].id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast(`Responda ${miss.length === 1 ? 'a pergunta destacada' : `as ${miss.length} perguntas destacadas`}.`, true);
    return;
  }
  if (page < pages.length - 1) { page++; render(); scrollTo(0, 0); return; }
  const btn = document.getElementById('nx'); btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    await api(`/public/c/${token}`, { method: 'POST', body: state });
    try { localStorage.removeItem(KEY); localStorage.setItem(DONE, '1'); } catch { /* ok */ }
    concluido();
  } catch (e) { toast(e.message, true); btn.disabled = false; btn.textContent = 'Enviar respostas'; }
}

function concluido(jaEnviado = false) {
  root.innerHTML = header() + `<div class="pub-main"><div class="card center" style="padding:40px 20px">
    <div style="font-size:44px;color:var(--teal)">✓</div><h2>${jaEnviado ? 'Você já respondeu esta pesquisa' : 'Respostas enviadas'}</h2>
    <p class="muted">Obrigado pela participação. ${D.instrumento.anonimo ? 'Suas respostas são anônimas e serão analisadas apenas de forma agregada.' : ''}</p>
    ${jaEnviado ? '<button class="btn" id="nova">Responder novamente (outra pessoa neste aparelho)</button>' : ''}</div></div>`;
  document.getElementById('nova')?.addEventListener('click', () => { try { localStorage.removeItem(DONE); } catch { /* ok */ } state.perfil = {}; state.respostas = {}; page = 0; render(); });
}

(async () => {
  try {
    D = await api(`/public/c/${token}`);
    document.title = `${D.instrumento.publicTitle} · ${D.empresa}`;
    if (D.encerrado) { root.innerHTML = header() + '<div class="pub-main"><div class="card center"><h2>Pesquisa encerrada</h2><p class="muted">O período de respostas terminou. Em caso de dúvida, fale com o responsável na sua empresa.</p></div></div>'; return; }
    pages = buildPages();
    let done = false; try { done = localStorage.getItem(DONE) === '1'; } catch { /* ok */ }
    if (done) return concluido(true);
    render();
  } catch (e) {
    root.innerHTML = `<div class="pub-main"><div class="card center"><h2>Link inválido</h2><p class="muted">${esc(e.message)}</p></div></div>`;
  }
})();
