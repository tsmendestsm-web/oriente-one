// Oriente One v1.0.0 | Painel administrativo
import { esc, brl, num, dataBR, mesBR, hoje, compAtual, addComp, api, toast, qrSvg, formData, copiar, baixarCsv, csvNum, VERSION } from './ui.js';

const $app = document.getElementById('app');
const S = { me: null, servicos: null, produtos: null };

// ------------------------------------------------------------------ helpers de UI
const badgeFatura = (s) => ({
  paga: '<span class="badge b-green">Paga</span>', vencida: '<span class="badge b-red">Vencida</span>',
  a_vencer: '<span class="badge b-blue">A vencer</span>', cancelada: '<span class="badge b-gray">Cancelada</span>',
}[s] || s);
const badgeStatus = (s) => ({
  ativo: '<span class="badge b-green">Ativo</span>', inativo: '<span class="badge b-gray">Inativo</span>',
  suspenso: '<span class="badge b-amber">Suspenso</span>', encerrado: '<span class="badge b-gray">Encerrado</span>',
  aberto: '<span class="badge b-teal">Aberto</span>',
}[s] || `<span class="badge b-gray">${esc(s)}</span>`);
const MODALIDADE = { mensal: 'Mensal recorrente', parcelado: 'Parcelado', unico: 'Pagamento único' };
const PRODUTO_NOME = { org: 'Diagnóstico Organizacional', nr1: 'Diagnóstico NR-1', dsfe: 'Diagnóstico Familiar Sistêmico-Empresarial' };
const clsBadge = (c) => {
  if (!c) return '<span class="badge b-gray">sem dados</span>';
  const map = { ADEQUADO: 'b-green', 'ATENÇÃO': 'b-amber', 'CRÍTICO': 'b-red', 'Muito boa': 'b-green', Boa: 'b-blue', 'Em desenvolvimento': 'b-red' };
  return `<span class="badge ${map[c] || 'b-gray'}">${esc(c)}</span>`;
};
const clsBar = (c) => ({ ADEQUADO: 'green', 'ATENÇÃO': 'amber', 'CRÍTICO': 'red', 'Muito boa': 'green', Boa: '', 'Em desenvolvimento': 'red' }[c] ?? '');

function modal(title, body, { wide = false, submit = 'Salvar', onSubmit, footer } = {}) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<form class="modal ${wide ? 'wide' : ''}" novalidate>
    <header><h2>${esc(title)}</h2><button type="button" class="btn ghost sm" data-close>✕</button></header>
    <div class="body">${body}</div>
    <footer>${footer ?? `<button type="button" class="btn" data-close>Cancelar</button>${onSubmit ? `<button class="btn primary" type="submit">${esc(submit)}</button>` : ''}`}</footer>
  </form>`;
  const close = () => bg.remove();
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  bg.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!onSubmit) return;
    const btn = bg.querySelector('button[type=submit]'); btn.disabled = true;
    try { const r = await onSubmit(formData(e.target), e.target); if (r !== false) close(); }
    catch (err) { toast(err.message, true); }
    finally { btn.disabled = false; }
  });
  document.body.appendChild(bg);
  bg.querySelector('input,select,textarea')?.focus();
  return { el: bg, close };
}
const confirmar = (msg) => window.confirm(msg);
const opt = (v, label, sel) => `<option value="${esc(v)}" ${String(sel ?? '') === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
const field = (name, label, value = '', type = 'text', extra = '') =>
  `<label class="f"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value ?? '')}" ${extra}></label>`;

async function servicos() { if (!S.servicos) S.servicos = await api('/servicos'); return S.servicos; }
async function produtos() { if (!S.produtos) S.produtos = await api('/produtos'); return S.produtos; }

// ------------------------------------------------------------------ autenticação
async function boot() {
  try {
    S.me = await api('/me');
    shell();
  } catch (e) {
    if (e.status !== 401) { $app.innerHTML = `<div class="auth"><div class="box">${esc(e.message)}</div></div>`; return; }
    const st = await api('/setup/status').catch(() => ({ needsSetup: false }));
    st.needsSetup ? telaSetup() : telaLogin();
  }
}

function telaLogin() {
  $app.innerHTML = `<div class="auth"><form class="box" id="f">
    <div class="brand">ORIENTE <span>ONE</span></div>
    <p class="muted" style="margin:0 0 20px">Plataforma Oriente · acesso restrito</p>
    ${field('email', 'E-mail', '', 'email', 'required autocomplete="username"')}
    ${field('senha', 'Senha', '', 'password', 'required autocomplete="current-password"')}
    <button class="btn primary" style="width:100%">Entrar</button>
    <p class="small muted center" style="margin-top:16px">v${VERSION}</p></form></div>`;
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/login', { method: 'POST', body: formData(e.target) }); boot(); } catch (err) { toast(err.message, true); }
  };
}

function telaSetup() {
  $app.innerHTML = `<div class="auth"><form class="box" id="f">
    <div class="brand">ORIENTE <span>ONE</span></div>
    <p class="muted" style="margin:0 0 20px">Primeira configuração: crie a empresa emissora e o usuário administrador.</p>
    ${field('org_nome', 'Empresa emissora', 'Oriente Soluções', 'text', 'required')}
    ${field('cnpj', 'CNPJ')}
    ${field('nome', 'Seu nome', '', 'text', 'required')}
    ${field('email', 'E-mail', '', 'email', 'required')}
    ${field('senha', 'Senha (mín. 8 caracteres)', '', 'password', 'required minlength="8"')}
    <button class="btn primary" style="width:100%">Criar e entrar</button></form></div>`;
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    try { await api('/setup', { method: 'POST', body: d }); await api('/login', { method: 'POST', body: d }); boot(); } catch (err) { toast(err.message, true); }
  };
}

// ------------------------------------------------------------------ shell e rotas
const NAV = [
  ['painel', 'Painel', '◧'],
  ['grp', 'Comercial'], ['clientes', 'Clientes', '◉'], ['contratos', 'Contratos', '▤'],
  ['grp', 'Financeiro'], ['faturamento', 'Faturamento', '$'], ['relatorios', 'Relatórios', '▥'],
  ['grp', 'Plataforma de Trabalho'], ['assessments', 'Assessments', '◎'],
  ['grp', 'Sistema'], ['config', 'Configurações', '⚙'],
];

function shell() {
  $app.innerHTML = `<div class="shell">
    <aside class="side" id="side">
      <div class="brand">ORIENTE <span>ONE</span><small>${esc(S.me.user.org_nome)}</small></div>
      <nav class="nav">${NAV.map(([k, l, i]) => (k === 'grp' ? `<div class="grp">${l}</div>` : `<a href="#/${k}" data-nav="${k}"><span style="width:16px;text-align:center">${i}</span>${l}</a>`)).join('')}</nav>
      <div class="foot"><b>${esc(S.me.user.nome)}</b>${esc(S.me.user.papel)} · v${VERSION}<button class="btn sm" id="sair">Sair</button></div>
    </aside>
    <main class="main" id="view"></main></div>`;
  document.getElementById('sair').onclick = async () => { await api('/logout', { method: 'POST' }); location.hash = ''; boot(); };
  window.onhashchange = route;
  route();
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') [...document.querySelectorAll('.modal-bg')].pop()?.remove(); });

async function route() {
  document.querySelectorAll('.modal-bg').forEach((m) => m.remove());
  const [, sec = 'painel', a, b] = (location.hash || '#/painel').split('/');
  document.querySelectorAll('[data-nav]').forEach((x) => x.classList.toggle('on', x.dataset.nav === sec));
  document.getElementById('side')?.classList.remove('open');
  const v = document.getElementById('view');
  v.innerHTML = '<div class="empty">Carregando…</div>';
  try {
    const fn = { painel: vPainel, clientes: a ? vCliente : vClientes, contratos: a ? vContrato : vContratos, faturamento: vFaturamento, relatorios: vRelatorios, assessments: a ? vProjeto : vProjetos, config: vConfig }[sec] || vPainel;
    await fn(v, a, b);
  } catch (e) {
    if (e.status === 401) return boot();
    v.innerHTML = `<div class="card"><b>Erro:</b> ${esc(e.message)}</div>`;
  }
}
const topo = (titulo, sub = '', acoes = '') => `<div class="top"><div><button class="btn sm menu-btn" onclick="document.getElementById('side').classList.toggle('open')">☰</button><h1>${titulo}</h1>${sub ? `<div class="muted">${sub}</div>` : ''}</div><div class="actions">${acoes}</div></div>`;

// ------------------------------------------------------------------ painel
async function vPainel(v) {
  const d = await api('/dashboard');
  v.innerHTML = topo('Painel', `Competência ${mesBR(d.competencia)} · hoje ${dataBR(d.hoje)}`, `<a class="btn" href="#/contratos">Novo contrato</a><a class="btn primary" href="#/faturamento">Faturamento</a>`) + `
    ${d.pendentesGerar ? `<div class="note">${d.pendentesGerar} contrato(s) mensal(is) ainda sem fatura em ${mesBR(d.competencia)}. <a href="#/faturamento">Gerar faturamento</a></div>` : ''}
    <div class="grid g4" style="margin-bottom:16px">
      <div class="kpi navy"><div class="l">Clientes ativos</div><div class="v">${d.clientesAtivos}</div><div class="s">${d.contratosAtivos} contratos ativos</div></div>
      <div class="kpi"><div class="l">Recorrência mensal</div><div class="v">${brl(d.recorrenciaMensal)}</div><div class="s">contratos mensais ativos</div></div>
      <div class="kpi"><div class="l">Faturado no mês</div><div class="v">${brl(d.faturadoMes)}</div><div class="s">recebido ${brl(d.recebidoMes)}</div></div>
      <div class="kpi red"><div class="l">Inadimplência</div><div class="v">${brl(d.vencido)}</div><div class="s">${d.faturasVencidas} fatura(s) · ${d.clientesInadimplentes} cliente(s)</div></div>
    </div>
    <div class="grid g2">
      <div class="card"><h2>Próximos vencimentos</h2>${d.proximas.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fatura</th><th>Cliente</th><th>Vencimento</th><th class="num">Valor</th></tr></thead><tbody>
        ${d.proximas.map((f) => `<tr class="click" data-fat="${f.id}"><td>${esc(f.numero)}</td><td>${esc(f.cliente)}</td><td>${dataBR(f.vencimento)} ${f.vencimento < d.hoje ? badgeFatura('vencida') : ''}</td><td class="num">${brl(f.valor)}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">Nenhuma fatura em aberto.</div>'}
        <p class="small muted">A receber (a vencer): <b>${brl(d.aReceber)}</b></p></div>
      <div class="card"><h2>Assessments em andamento</h2>${d.projetos.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Projeto</th><th>Cliente</th><th class="num">Respostas</th></tr></thead><tbody>
        ${d.projetos.map((p) => `<tr class="click" onclick="location.hash='#/assessments/${p.id}'"><td>${esc(PRODUTO_NOME[p.produto])}</td><td>${esc(p.cliente)}</td><td class="num">${p.respostas}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">Nenhum assessment aberto. Envie a partir de um contrato.</div>'}</div>
    </div>`;
  v.querySelectorAll('[data-fat]').forEach((tr) => (tr.onclick = () => abrirFatura(Number(tr.dataset.fat), () => vPainel(v))));
}

// ------------------------------------------------------------------ clientes
async function vClientes(v) {
  const st = sessionStorage.getItem('cli_status') ?? 'ativo';
  const lista = await api('/clientes' + (st ? `?status=${st}` : ''));
  v.innerHTML = topo('Clientes', `${lista.length} cliente(s)`, `<button class="btn primary" id="novo">Novo cliente</button>`) + `
    <div class="filters"><label class="f"><span>Situação</span><select id="st">${opt('ativo', 'Ativos', st)}${opt('inativo', 'Inativos', st)}${opt('', 'Todos', st)}</select></label>
    <label class="f" style="flex:1"><span>Buscar</span><input id="busca" placeholder="Razão social, fantasia ou CNPJ"></label></div>
    <div class="card" style="padding:0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th>CNPJ</th><th>Sponsor</th><th>Contratos</th><th class="num">Vencido</th><th>Status</th></tr></thead>
    <tbody id="tb">${lista.map((c) => `<tr class="click" data-id="${c.id}" data-s="${esc((c.razao_social + ' ' + (c.nome_fantasia || '') + ' ' + (c.cnpj || '')).toLowerCase())}">
      <td><b>${esc(c.nome_fantasia || c.razao_social)}</b>${c.nome_fantasia ? `<div class="small muted">${esc(c.razao_social)}</div>` : ''}</td>
      <td class="nowrap">${esc(c.cnpj || '–')}</td><td>${esc(c.sponsor_nome || '–')}</td><td>${c.contratos_ativos}</td>
      <td class="num">${c.vencido ? `<span style="color:var(--red)">${brl(c.vencido)}</span>` : '–'}</td><td>${badgeStatus(c.status)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nenhum cliente.</td></tr>'}</tbody></table></div></div>`;
  v.querySelector('#st').onchange = (e) => { sessionStorage.setItem('cli_status', e.target.value); vClientes(v); };
  v.querySelector('#busca').oninput = (e) => { const t = e.target.value.toLowerCase(); v.querySelectorAll('#tb tr[data-s]').forEach((r) => (r.style.display = r.dataset.s.includes(t) ? '' : 'none')); };
  v.querySelectorAll('#tb tr[data-id]').forEach((tr) => (tr.onclick = () => (location.hash = `#/clientes/${tr.dataset.id}`)));
  v.querySelector('#novo').onclick = () => formCliente(null, (id) => (location.hash = `#/clientes/${id}`));
}

function formCliente(c, done) {
  c = c || { status: 'ativo' };
  modal(c.id ? 'Editar cliente' : 'Novo cliente', `
    <div class="row">${field('razao_social', 'Razão social *', c.razao_social, 'text', 'required')}${field('nome_fantasia', 'Nome fantasia', c.nome_fantasia)}</div>
    <div class="row">${field('cnpj', 'CNPJ / CPF', c.cnpj)}${field('email_financeiro', 'E-mail financeiro (cobranças)', c.email_financeiro, 'email')}${field('telefone', 'Telefone', c.telefone)}</div>
    <div class="row">${field('endereco', 'Endereço', c.endereco)}${field('cidade', 'Cidade', c.cidade)}${field('uf', 'UF', c.uf, 'text', 'maxlength="2"')}${field('cep', 'CEP', c.cep)}</div>
    <h3 style="margin:8px 0 10px">Sponsor do projeto no cliente</h3>
    <div class="row">${field('sponsor_nome', 'Nome', c.sponsor_nome)}${field('sponsor_email', 'E-mail', c.sponsor_email, 'email')}${field('sponsor_telefone', 'Telefone', c.sponsor_telefone)}</div>
    <div class="row"><label class="f"><span>Status</span><select name="status">${opt('ativo', 'Ativo', c.status)}${opt('inativo', 'Inativo', c.status)}</select></label></div>
    <label class="f"><span>Observações</span><textarea name="observacoes">${esc(c.observacoes || '')}</textarea></label>`, {
    wide: true,
    onSubmit: async (d) => {
      if (!d.razao_social) throw new Error('Informe a razão social.');
      const r = c.id ? await api(`/clientes/${c.id}`, { method: 'PUT', body: d }) : await api('/clientes', { method: 'POST', body: d });
      toast('Cliente salvo.'); done?.(r.id);
    },
  });
}

async function vCliente(v, id) {
  const c = await api(`/clientes/${id}`);
  const venc = c.faturas.filter((f) => f.status === 'aberta' && f.vencimento < hoje()).reduce((s, f) => s + f.valor, 0);
  v.innerHTML = topo(esc(c.nome_fantasia || c.razao_social), `${esc(c.razao_social)} ${badgeStatus(c.status)}`,
    `<a class="btn" href="#/clientes">← Clientes</a><button class="btn" id="ed">Editar</button><button class="btn primary" id="nc">Novo contrato</button>`) + `
    <div class="grid g2">
      <div class="card"><h2>Cadastro</h2><dl class="dl">
        <dt>CNPJ</dt><dd>${esc(c.cnpj || '–')}</dd><dt>E-mail financeiro</dt><dd>${esc(c.email_financeiro || '–')}</dd>
        <dt>Telefone</dt><dd>${esc(c.telefone || '–')}</dd><dt>Endereço</dt><dd>${esc([c.endereco, c.cidade, c.uf, c.cep].filter(Boolean).join(', ') || '–')}</dd>
        <dt>Sponsor</dt><dd>${esc(c.sponsor_nome || '–')}<div class="small muted">${esc([c.sponsor_email, c.sponsor_telefone].filter(Boolean).join(' · '))}</div></dd>
        <dt>Observações</dt><dd>${esc(c.observacoes || '–')}</dd></dl></div>
      <div class="card"><h2>Situação financeira</h2><div class="grid g2">
        <div class="kpi"><div class="l">Faturado</div><div class="v">${brl(c.faturas.filter((f) => f.status !== 'cancelada').reduce((s, f) => s + f.valor, 0))}</div><div class="s">últimas 60 faturas</div></div>
        <div class="kpi ${venc ? 'red' : ''}"><div class="l">Vencido</div><div class="v">${brl(venc)}</div></div></div></div>
    </div>
    <div class="card"><h2>Contratos</h2>${tabelaContratos(c.contratos.map((k) => ({ ...k, cliente: c.razao_social })), false)}</div>
    <div class="card"><h2>Faturas</h2>${tabelaFaturas(c.faturas.map((f) => ({ ...f, situacao: f.status === 'aberta' ? (f.vencimento < hoje() ? 'vencida' : 'a_vencer') : f.status })), false)}</div>
    <div class="card"><h2>Assessments</h2>${c.projetos.length ? `<table class="tbl"><tbody>${c.projetos.map((p) => `<tr class="click" onclick="location.hash='#/assessments/${p.id}'"><td>${esc(p.titulo)}</td><td>${dataBR(p.created_at)}</td><td>${badgeStatus(p.status)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Nenhum assessment enviado.</div>'}</div>`;
  v.querySelector('#ed').onclick = () => formCliente(c, () => vCliente(v, id));
  v.querySelector('#nc').onclick = () => formContrato(c.id);
  ligarTabelas(v, () => vCliente(v, id));
}

// ------------------------------------------------------------------ contratos
function tabelaContratos(lista, comCliente = true) {
  if (!lista.length) return '<div class="empty">Nenhum contrato.</div>';
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Código</th>${comCliente ? '<th>Cliente</th>' : ''}<th>Objeto</th><th>Modalidade</th><th class="num">Valor</th><th>Início</th><th>Status</th></tr></thead><tbody>
    ${lista.map((k) => `<tr class="click" onclick="location.hash='#/contratos/${k.id}'"><td class="nowrap"><b>${esc(k.codigo)}</b></td>${comCliente ? `<td>${esc(k.cliente)}</td>` : ''}
      <td>${esc(k.objeto)}${k.servico ? `<div class="small muted">${esc(k.servico)}</div>` : ''}</td><td>${MODALIDADE[k.modalidade]}${k.modalidade === 'parcelado' ? ` · ${k.parcelas}x` : ''}</td>
      <td class="num">${brl(k.valor)}${k.modalidade === 'mensal' ? '<span class="small muted">/mês</span>' : ''}</td><td>${dataBR(k.data_inicio)}</td><td>${badgeStatus(k.status)}</td></tr>`).join('')}
  </tbody></table></div>`;
}

async function vContratos(v) {
  const st = sessionStorage.getItem('ctr_status') ?? 'ativo';
  const lista = await api('/contratos' + (st ? `?status=${st}` : ''));
  v.innerHTML = topo('Contratos', `${lista.length} contrato(s)`, `<button class="btn primary" id="novo">Novo contrato</button>`) + `
    <div class="filters"><label class="f"><span>Status</span><select id="st">${opt('ativo', 'Ativos', st)}${opt('suspenso', 'Suspensos', st)}${opt('encerrado', 'Encerrados', st)}${opt('', 'Todos', st)}</select></label></div>
    <div class="card" style="padding:0">${tabelaContratos(lista)}</div>`;
  v.querySelector('#st').onchange = (e) => { sessionStorage.setItem('ctr_status', e.target.value); vContratos(v); };
  v.querySelector('#novo').onclick = () => formContrato();
}

async function formContrato(clienteId) {
  const [clientes, servs] = await Promise.all([api('/clientes?status=ativo'), servicos()]);
  if (!clientes.length) { toast('Cadastre um cliente ativo antes.', true); return; }
  const m = modal('Novo contrato', `
    <div class="row"><label class="f"><span>Cliente *</span><select name="cliente_id" required>${clientes.map((c) => opt(c.id, c.nome_fantasia || c.razao_social, clienteId)).join('')}</select></label>
    <label class="f"><span>Serviço contratado</span><select name="servico_id"><option value="">–</option>${servs.filter((s) => s.ativo).map((s) => opt(s.id, s.nome)).join('')}</select></label></div>
    ${field('objeto', 'Objeto do contrato *', '', 'text', 'required placeholder="Ex.: Consultoria em Gestão de Pessoas · 12 meses"')}
    <div class="row"><label class="f"><span>Modalidade de cobrança *</span><select name="modalidade" id="mod">${opt('mensal', 'Mensal recorrente')}${opt('parcelado', 'Parcelado')}${opt('unico', 'Pagamento único')}</select></label>
    ${field('valor', '<span id="lv">Valor mensal (R$) *</span>', '', 'number', 'step="0.01" min="0" required')}
    <label class="f" id="w-parc" style="display:none"><span>Parcelas</span><input name="parcelas" type="number" min="1" max="60" value="2"></label></div>
    <div class="row">${field('data_inicio', 'Início *', hoje(), 'date', 'required')}${field('data_fim', 'Término (opcional)', '', 'date')}
    <label class="f" id="w-dia"><span>Dia de vencimento</span><input name="dia_vencimento" type="number" min="1" max="31" value="10"></label>
    <label class="f" id="w-pv" style="display:none"><span>1º vencimento *</span><input name="primeiro_vencimento" type="date"></label></div>
    <h3 style="margin:8px 0 10px">Sponsor (para envio dos assessments)</h3>
    <div class="row">${field('sponsor_nome', 'Nome', '')}${field('sponsor_email', 'E-mail', '', 'email')}</div>
    <p class="small muted" style="margin-top:-6px">Em branco, usa o sponsor do cadastro do cliente.</p>
    <label class="f"><span>Observações</span><textarea name="observacoes"></textarea></label>`, {
    wide: true, submit: 'Criar contrato',
    onSubmit: async (d) => {
      const r = await api('/contratos', { method: 'POST', body: d });
      toast(r.faturasGeradas ? `Contrato criado com ${r.faturasGeradas} fatura(s) agendada(s).` : 'Contrato criado.');
      location.hash = `#/contratos/${r.id}`;
    },
  });
  const f = m.el.querySelector('form');
  const sync = () => {
    const mod = f.modalidade.value;
    f.querySelector('#lv').textContent = mod === 'mensal' ? 'Valor mensal (R$) *' : 'Valor total (R$) *';
    f.querySelector('#w-parc').style.display = mod === 'parcelado' ? '' : 'none';
    f.querySelector('#w-dia').style.display = mod === 'mensal' ? '' : 'none';
    f.querySelector('#w-pv').style.display = mod === 'mensal' ? 'none' : '';
  };
  f.modalidade.onchange = sync;
  f.servico_id.onchange = () => { const s = servs.find((x) => String(x.id) === f.servico_id.value); if (s) { if (!f.objeto.value) f.objeto.value = s.nome; if (s.valor_padrao && !f.valor.value) f.valor.value = s.valor_padrao; } };
}

async function vContrato(v, id) {
  const k = await api(`/contratos/${id}`);
  const prods = await produtos();
  const sponsor = k.sponsor_nome || k.cliente_sponsor_nome;
  v.innerHTML = topo(`${esc(k.codigo)}`, `${esc(k.cliente)} · ${esc(k.objeto)} ${badgeStatus(k.status)}`,
    `<a class="btn" href="#/contratos">← Contratos</a><button class="btn" id="ed">Editar</button>
     <button class="btn" id="fav">Fatura avulsa</button><button class="btn primary" id="diag" ${k.status !== 'ativo' ? 'disabled' : ''}>Enviar diagnóstico</button>`) + `
    <div class="grid g2">
      <div class="card"><h2>Contrato</h2><dl class="dl">
        <dt>Cliente</dt><dd><a href="#/clientes/${k.cliente_id}">${esc(k.cliente)}</a></dd>
        <dt>Serviço</dt><dd>${esc(k.servico || '–')}</dd>
        <dt>Modalidade</dt><dd>${MODALIDADE[k.modalidade]}${k.modalidade === 'parcelado' ? ` · ${k.parcelas} parcelas` : ''}</dd>
        <dt>Valor</dt><dd><b>${brl(k.valor)}</b>${k.modalidade === 'mensal' ? ' por mês' : ' total'}</dd>
        <dt>Vigência</dt><dd>${dataBR(k.data_inicio)} a ${k.data_fim ? dataBR(k.data_fim) : 'indeterminado'}</dd>
        ${k.modalidade === 'mensal' ? `<dt>Vencimento</dt><dd>todo dia ${k.dia_vencimento}</dd>` : ''}
        <dt>Sponsor</dt><dd>${esc(sponsor || '–')} <span class="small muted">${esc(k.sponsor_email || k.cliente_sponsor_email || '')}</span></dd>
        <dt>Observações</dt><dd>${esc(k.observacoes || '–')}</dd></dl></div>
      <div class="card"><h2>Assessments do contrato</h2>
        ${k.projetos.length ? `<table class="tbl"><tbody>${k.projetos.map((p) => `<tr class="click" onclick="location.hash='#/assessments/${p.id}'"><td><b>${esc(PRODUTO_NOME[p.produto])}</b><div class="small muted">${esc(p.titulo)}</div></td><td class="num">${p.respostas} resp.</td><td>${badgeStatus(p.status)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Nenhum diagnóstico enviado ainda.</div>'}
        <div class="small muted" style="margin-top:10px">${prods.map((p) => `${esc(p.nome)}: ${p.disponivel ? '<span class="badge b-green">disponível</span>' : '<span class="badge b-amber">em construção</span>'}`).join(' · ')}</div>
      </div>
    </div>
    <div class="card"><h2>Faturas do contrato</h2>${tabelaFaturas(k.faturas.map((f) => ({ ...f, cliente: k.cliente, situacao: f.status === 'aberta' ? (f.vencimento < hoje() ? 'vencida' : 'a_vencer') : f.status })), false)}</div>`;
  v.querySelector('#ed').onclick = () => editarContrato(k, () => vContrato(v, id));
  v.querySelector('#fav').onclick = () => modal('Fatura avulsa', `
      <input type="hidden" name="contrato_id" value="${k.id}">
      ${field('descricao', 'Descrição', k.objeto)}
      <div class="row">${field('valor', 'Valor (R$) *', '', 'number', 'step="0.01" min="0" required')}${field('vencimento', 'Vencimento *', '', 'date', 'required')}${field('competencia', 'Competência', compAtual(), 'month')}</div>`,
    { submit: 'Criar fatura', onSubmit: async (d) => { await api('/faturas', { method: 'POST', body: d }); toast('Fatura criada.'); vContrato(v, id); } });
  v.querySelector('#diag').onclick = () => enviarDiagnostico(k, prods);
  ligarTabelas(v, () => vContrato(v, id));
}

function editarContrato(k, done) {
  modal(`Editar ${k.codigo}`, `
    ${field('objeto', 'Objeto', k.objeto)}
    <div class="row">${field('valor', k.modalidade === 'mensal' ? 'Valor mensal (R$)' : 'Valor total (R$)', k.valor, 'number', 'step="0.01"')}
    ${k.modalidade === 'mensal' ? field('dia_vencimento', 'Dia de vencimento', k.dia_vencimento, 'number', 'min="1" max="31"') : ''}
    ${field('data_fim', 'Término', k.data_fim || '', 'date')}
    <label class="f"><span>Status</span><select name="status">${opt('ativo', 'Ativo', k.status)}${opt('suspenso', 'Suspenso', k.status)}${opt('encerrado', 'Encerrado', k.status)}</select></label></div>
    <div class="row">${field('sponsor_nome', 'Sponsor', k.sponsor_nome || '')}${field('sponsor_email', 'E-mail do sponsor', k.sponsor_email || '', 'email')}</div>
    <label class="f"><span>Observações</span><textarea name="observacoes">${esc(k.observacoes || '')}</textarea></label>
    ${k.modalidade !== 'mensal' ? '<p class="small muted">Alterar o valor não muda faturas já agendadas. Edite as faturas em aberto individualmente se necessário.</p>' : '<p class="small muted">O novo valor vale para as próximas competências geradas.</p>'}`,
  { wide: true, onSubmit: async (d) => { await api(`/contratos/${k.id}`, { method: 'PUT', body: d }); toast('Contrato atualizado.'); done(); } });
}

function enviarDiagnostico(k, prods) {
  const sugerido = k.produto && prods.find((p) => p.key === k.produto && p.disponivel) ? k.produto : prods.find((p) => p.disponivel)?.key;
  const m = modal('Enviar diagnóstico ao sponsor', `
    <p class="muted" style="margin-top:0">O sponsor recebe por e-mail uma página com os QR Codes e links para distribuir aos participantes.</p>
    <label class="f"><span>Diagnóstico *</span><select name="produto">${prods.map((p) => `<option value="${p.key}" ${p.key === sugerido ? 'selected' : ''} ${p.disponivel ? '' : 'disabled'}>${esc(p.nome)}${p.disponivel ? '' : ' (em construção)'}</option>`).join('')}</select></label>
    <div id="nr1info" class="note info" style="display:none">O Diagnóstico NR-1 gera dois links: Formulário A (Liderança: gestores, SST e RH) e Formulário B (Colaboradores, anônimo). Índice consolidado = A × 40% + B × 60%.</div>
    <div class="row">${field('sponsor_nome', 'Sponsor *', k.sponsor_nome || k.cliente_sponsor_nome || '', 'text', 'required')}${field('sponsor_email', 'E-mail do sponsor *', k.sponsor_email || k.cliente_sponsor_email || '', 'email', 'required')}</div>
    <div class="row">${field('unidade', 'Unidade / filial (opcional)', '')}${field('prazo', 'Prazo para respostas', '', 'date')}</div>
    <input type="hidden" name="contrato_id" value="${k.id}">
    <label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="enviar" checked style="width:auto"> <span style="margin:0">Enviar e-mail ao sponsor agora</span></label>`, {
    submit: 'Criar e enviar',
    onSubmit: async (d) => {
      const r = await api('/projetos', { method: 'POST', body: d });
      if (d.enviar) r.envio?.ok ? toast('Diagnóstico criado e e-mail enviado ao sponsor.') : toast('Diagnóstico criado, mas o e-mail não foi enviado: ' + (r.envio?.error || ''), true);
      else toast('Diagnóstico criado.');
      location.hash = `#/assessments/${r.id}`;
    },
  });
  const f = m.el.querySelector('form');
  const sync = () => (f.querySelector('#nr1info').style.display = f.produto.value === 'nr1' ? '' : 'none');
  f.produto.onchange = sync; sync();
}

// ------------------------------------------------------------------ faturas
function tabelaFaturas(lista, comCliente = true, selecionavel = false) {
  if (!lista.length) return '<div class="empty">Nenhuma fatura.</div>';
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${selecionavel ? '<th><input type="checkbox" id="selall" style="width:auto"></th>' : ''}<th>Fatura</th>${comCliente ? '<th>Cliente</th>' : ''}<th>Descrição</th><th>Comp.</th><th>Vencimento</th><th class="num">Valor</th><th>Cobrança</th><th>Situação</th></tr></thead><tbody>
    ${lista.map((f) => `<tr class="click" data-fat="${f.id}">${selecionavel ? `<td onclick="event.stopPropagation()"><input type="checkbox" class="sel" value="${f.id}" ${f.status !== 'aberta' ? 'disabled' : ''} style="width:auto"></td>` : ''}
      <td class="nowrap"><b>${esc(f.numero)}</b></td>${comCliente ? `<td>${esc(f.cliente)}</td>` : ''}<td>${esc(f.descricao || '')}</td><td>${mesBR(f.competencia)}</td>
      <td class="nowrap">${dataBR(f.vencimento)}</td><td class="num">${brl(f.valor)}</td>
      <td class="nowrap">${f.emitida_em ? `<span class="badge b-teal">${f.boleto_provider === 'asaas' ? 'Boleto' : f.boleto_url || f.linha_digitavel ? 'Boleto' : 'PIX'}</span>` : '<span class="badge b-gray">não emitida</span>'}${f.enviada_em ? ' <span class="badge b-blue">enviada</span>' : ''}</td>
      <td class="nowrap">${badgeFatura(f.situacao)}${f.status === 'paga' ? `<div class="small muted">${dataBR(f.pago_em)}</div>` : ''}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function ligarTabelas(v, reload) {
  v.querySelectorAll('tr[data-fat]').forEach((tr) => (tr.onclick = () => abrirFatura(Number(tr.dataset.fat), reload)));
}

async function vFaturamento(v) {
  const comp = sessionStorage.getItem('fat_comp') || compAtual();
  const st = sessionStorage.getItem('fat_status') || '';
  const q = new URLSearchParams(); if (st !== 'todas_abertas') q.set('competencia', comp);
  if (st === 'todas_abertas') q.set('status', 'aberta'); else if (st) q.set('status', st);
  const lista = await api('/faturas?' + q);
  const tot = (fn) => lista.filter(fn).reduce((s, f) => s + (f.status === 'paga' ? f.valor_pago ?? f.valor : f.valor), 0);
  v.innerHTML = topo('Faturamento', `Competência ${mesBR(comp)}`, `<button class="btn" id="lote" disabled>Emitir selecionadas</button><button class="btn primary" id="gerar">Gerar faturamento de ${mesBR(comp)}</button>`) + `
    <div class="filters">
      <label class="f"><span>Competência</span><div style="display:flex;gap:4px"><button class="btn sm" id="prev">‹</button><input type="month" id="comp" value="${comp}" style="width:150px"><button class="btn sm" id="next">›</button></div></label>
      <label class="f"><span>Situação</span><select id="st">${opt('', 'Todas da competência', st)}${opt('a_vencer', 'A vencer', st)}${opt('vencida', 'Vencidas', st)}${opt('paga', 'Pagas', st)}${opt('cancelada', 'Canceladas', st)}${opt('todas_abertas', 'Todas em aberto (qualquer competência)', st)}</select></label>
    </div>
    <div class="grid g4" style="margin-bottom:16px">
      <div class="kpi navy"><div class="l">Faturado</div><div class="v">${brl(tot((f) => f.status !== 'cancelada'))}</div><div class="s">${lista.filter((f) => f.status !== 'cancelada').length} fatura(s)</div></div>
      <div class="kpi"><div class="l">Recebido</div><div class="v">${brl(tot((f) => f.status === 'paga'))}</div></div>
      <div class="kpi amber"><div class="l">A vencer</div><div class="v">${brl(tot((f) => f.situacao === 'a_vencer'))}</div></div>
      <div class="kpi red"><div class="l">Vencido</div><div class="v">${brl(tot((f) => f.situacao === 'vencida'))}</div></div>
    </div>
    <div class="card" style="padding:0">${tabelaFaturas(lista, true, true)}</div>
    <p class="small muted">Contratos mensais geram fatura pelo botão "Gerar faturamento". Contratos parcelados e de pagamento único têm as faturas agendadas na criação.</p>`;
  const setComp = (c) => { sessionStorage.setItem('fat_comp', c); vFaturamento(v); };
  v.querySelector('#comp').onchange = (e) => e.target.value && setComp(e.target.value);
  v.querySelector('#prev').onclick = () => setComp(addComp(comp, -1));
  v.querySelector('#next').onclick = () => setComp(addComp(comp, 1));
  v.querySelector('#st').onchange = (e) => { sessionStorage.setItem('fat_status', e.target.value); vFaturamento(v); };
  v.querySelector('#gerar').onclick = async () => {
    if (!confirmar(`Gerar as faturas de ${mesBR(comp)} para todos os contratos mensais ativos que ainda não foram faturados?`)) return;
    try { const r = await api('/faturas/gerar', { method: 'POST', body: { competencia: comp } }); toast(r.geradas ? `${r.geradas} fatura(s) gerada(s).` : 'Nenhuma fatura pendente para esta competência.'); vFaturamento(v); }
    catch (e) { toast(e.message, true); }
  };
  const lote = v.querySelector('#lote');
  const sels = () => [...v.querySelectorAll('.sel:checked')].map((x) => Number(x.value));
  v.querySelectorAll('.sel').forEach((c) => (c.onchange = () => (lote.disabled = !sels().length)));
  v.querySelector('#selall')?.addEventListener('change', (e) => { v.querySelectorAll('.sel:not(:disabled)').forEach((c) => (c.checked = e.target.checked)); lote.disabled = !sels().length; });
  lote.onclick = async () => {
    const ids = sels(); const enviar = confirmar(`Emitir ${ids.length} cobrança(s). Deseja também enviar por e-mail aos clientes?\n\nOK = emitir e enviar · Cancelar = só emitir`);
    let ok = 0, falhas = [];
    for (const id of ids) {
      try { await api(`/faturas/${id}/emitir`, { method: 'POST', body: {} }); if (enviar) await api(`/faturas/${id}/enviar`, { method: 'POST', body: {} }); ok++; }
      catch (e) { falhas.push(`#${id}: ${e.message}`); }
    }
    toast(`${ok} cobrança(s) processada(s).`); if (falhas.length) toast(falhas.join(' | '), true);
    vFaturamento(v);
  };
  ligarTabelas(v, () => vFaturamento(v));
}

async function abrirFatura(id, reload) {
  const f = await api(`/faturas/${id}`);
  const aberta = f.status === 'aberta';
  const pix = f.pix_copia_cola;
  const m = modal(`Fatura ${f.numero}`, `
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
      <div><div class="big" style="font-size:28px">${brl(f.valor)}</div><div class="muted">vencimento ${dataBR(f.vencimento)} · ${badgeFatura(f.situacao)}</div></div>
      ${pix ? `<div class="qr">${qrSvg(pix)}</div>` : ''}
    </div>
    <dl class="dl">
      <dt>Cliente</dt><dd>${esc(f.cliente)} <span class="small muted">${esc(f.cliente_cnpj || '')}</span></dd>
      <dt>Contrato</dt><dd>${esc(f.contrato)} · ${esc(f.objeto)}</dd>
      <dt>Descrição</dt><dd>${esc(f.descricao || '')}</dd>
      <dt>Competência</dt><dd>${mesBR(f.competencia)}${f.parcela ? ` · parcela ${f.parcela}/${f.total_parcelas}` : ''}</dd>
      <dt>E-mail de cobrança</dt><dd>${esc(f.email_financeiro || '–')}</dd>
      <dt>Emitida</dt><dd>${f.emitida_em ? dataBR(f.emitida_em) : 'não'}${f.enviada_em ? ` · enviada em ${dataBR(f.enviada_em)}` : ''}</dd>
      ${f.boleto_url ? `<dt>Boleto</dt><dd><a href="${esc(f.boleto_url)}" target="_blank" rel="noopener">abrir boleto</a></dd>` : ''}
      ${f.linha_digitavel ? `<dt>Linha digitável</dt><dd class="mono">${esc(f.linha_digitavel)} <button type="button" class="btn sm" data-copy="${esc(f.linha_digitavel)}">copiar</button></dd>` : ''}
      ${pix ? `<dt>PIX copia e cola</dt><dd class="mono">${esc(pix)} <button type="button" class="btn sm" data-copy="${esc(pix)}">copiar</button></dd>` : ''}
      ${f.status === 'paga' ? `<dt>Pagamento</dt><dd><b>${brl(f.valor_pago)}</b> em ${dataBR(f.pago_em)} · ${esc(f.forma_pagamento || '')}${f.obs_baixa ? `<div class="small muted">${esc(f.obs_baixa)}</div>` : ''}</dd>` : ''}
      ${f.status === 'cancelada' && f.obs_baixa ? `<dt>Motivo</dt><dd>${esc(f.obs_baixa)}</dd>` : ''}
    </dl>
    ${aberta && !f.org.pix_chave && !S.me.asaas ? '<div class="note" style="margin-top:14px">Configure a chave PIX em Configurações ou ative a integração de boletos para emitir cobranças.</div>' : ''}`, {
    wide: true,
    footer: `<button type="button" class="btn" data-close>Fechar</button>
      ${aberta ? `<button type="button" class="btn danger" data-a="cancelar">Cancelar fatura</button>
      <button type="button" class="btn" data-a="editar">Editar / boleto manual</button>
      <button type="button" class="btn" data-a="emitir">${f.emitida_em ? 'Reemitir' : 'Emitir cobrança'}</button>
      <button type="button" class="btn" data-a="enviar" ${f.emitida_em ? '' : 'disabled'}>Enviar por e-mail</button>
      <button type="button" class="btn primary" data-a="baixa">Dar baixa</button>` : ''}
      ${f.status === 'paga' ? '<button type="button" class="btn danger" data-a="estornar">Estornar baixa</button>' : ''}`,
  });
  m.el.querySelectorAll('[data-copy]').forEach((b) => (b.onclick = () => copiar(b.dataset.copy)));
  const act = async (fn) => { try { await fn(); m.close(); reload?.(); } catch (e) { toast(e.message, true); } };
  m.el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'emitir') act(async () => { await api(`/faturas/${id}/emitir`, { method: 'POST', body: {} }); toast('Cobrança emitida.'); setTimeout(() => abrirFatura(id, reload), 50); });
    if (a === 'enviar') act(async () => { await api(`/faturas/${id}/enviar`, { method: 'POST', body: {} }); toast('Fatura enviada por e-mail.'); });
    if (a === 'estornar' && confirmar('Desfazer a baixa desta fatura?')) act(async () => { await api(`/faturas/${id}/estornar`, { method: 'POST' }); toast('Baixa estornada.'); });
    if (a === 'cancelar') { const motivo = prompt('Motivo do cancelamento:'); if (motivo !== null) act(async () => { await api(`/faturas/${id}/cancelar`, { method: 'POST', body: { motivo } }); toast('Fatura cancelada.'); }); }
    if (a === 'baixa') { m.close(); modal(`Baixa · ${f.numero}`, `
        <div class="row">${field('pago_em', 'Data do pagamento', hoje(), 'date', 'required')}${field('valor_pago', 'Valor recebido (R$)', f.valor, 'number', 'step="0.01"')}
        <label class="f"><span>Forma</span><select name="forma_pagamento">${['PIX', 'Boleto', 'Transferência', 'Dinheiro', 'Cartão', 'Outro'].map((x) => opt(x, x, f.boleto_provider === 'asaas' ? 'Boleto' : 'PIX')).join('')}</select></label></div>
        <label class="f"><span>Observação</span><input name="obs_baixa"></label>`,
      { submit: 'Confirmar baixa', onSubmit: async (d) => { await api(`/faturas/${id}/baixa`, { method: 'POST', body: d }); toast('Baixa registrada.'); reload?.(); } }); }
    if (a === 'editar') { m.close(); modal(`Editar · ${f.numero}`, `
        ${field('descricao', 'Descrição', f.descricao)}
        <div class="row">${field('valor', 'Valor (R$)', f.valor, 'number', 'step="0.01"')}${field('vencimento', 'Vencimento', f.vencimento, 'date')}</div>
        <h3 style="margin:8px 0 10px">Boleto emitido fora da plataforma (opcional)</h3>
        ${field('linha_digitavel', 'Linha digitável', f.linha_digitavel || '')}${field('boleto_url', 'Link do boleto (PDF)', f.boleto_url || '', 'url')}
        <p class="small muted">Use se você gerou o boleto no internet banking. Alterar valor ou vencimento apaga o PIX gerado; emita de novo depois.</p>`,
      { onSubmit: async (d) => {
        const body = { descricao: d.descricao, linha_digitavel: d.linha_digitavel, boleto_url: d.boleto_url };
        if (Number(d.valor) !== f.valor) body.valor = d.valor;
        if (d.vencimento !== f.vencimento) body.vencimento = d.vencimento;
        await api(`/faturas/${id}`, { method: 'PUT', body }); toast('Fatura atualizada.'); reload?.();
      } }); }
  }));
}

// ------------------------------------------------------------------ relatórios
async function vRelatorios(v, tab = 'clientes') {
  const de = sessionStorage.getItem('rel_de') || addComp(compAtual(), -5);
  const ate = sessionStorage.getItem('rel_ate') || compAtual();
  const ativos = sessionStorage.getItem('rel_ativos') ?? '1';
  const tabs = [['clientes', 'Clientes'], ['faturamento', 'Faturamento'], ['recebimento', 'Recebimento'], ['inadimplencia', 'Inadimplência']];
  const usaPeriodo = tab === 'faturamento' || tab === 'recebimento';
  v.innerHTML = topo('Relatórios', '', `<button class="btn" id="csv">Exportar CSV</button><button class="btn" onclick="print()">Imprimir</button>`) + `
    <div class="tabs">${tabs.map(([k, l]) => `<a href="#/relatorios/${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</div>
    <div class="filters">
      ${usaPeriodo ? `<label class="f"><span>De</span><input type="month" id="de" value="${de}"></label><label class="f"><span>Até</span><input type="month" id="ate" value="${ate}"></label>` : ''}
      ${tab !== 'clientes' ? `<label class="f"><span>Clientes</span><select id="ativos">${opt('1', 'Somente ativos', ativos)}${opt('0', 'Todos', ativos)}</select></label>` : `<label class="f"><span>Situação</span><select id="ativos">${opt('1', 'Somente ativos', ativos)}${opt('0', 'Todos', ativos)}</select></label>`}
    </div><div id="rel"><div class="empty">Carregando…</div></div>`;
  const re = () => vRelatorios(v, tab);
  v.querySelector('#de')?.addEventListener('change', (e) => { sessionStorage.setItem('rel_de', e.target.value); re(); });
  v.querySelector('#ate')?.addEventListener('change', (e) => { sessionStorage.setItem('rel_ate', e.target.value); re(); });
  v.querySelector('#ativos').onchange = (e) => { sessionStorage.setItem('rel_ativos', e.target.value); re(); };
  const box = v.querySelector('#rel');
  let csv = null;

  if (tab === 'clientes') {
    const d = await api('/relatorios/clientes' + (ativos === '1' ? '?status=ativo' : ''));
    box.innerHTML = `<div class="card" style="padding:0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th>Status</th><th>Contratos</th><th class="num">Recorrência/mês</th><th class="num">Faturado</th><th class="num">Recebido</th><th class="num">A vencer</th><th class="num">Vencido</th><th>Último pgto.</th><th>Projetos</th></tr></thead><tbody>
      ${d.clientes.map((c) => `<tr class="click" onclick="location.hash='#/clientes/${c.id}'"><td><b>${esc(c.nome_fantasia || c.razao_social)}</b><div class="small muted">${esc(c.cnpj || '')}</div></td><td>${badgeStatus(c.status)}</td><td>${c.contratos_ativos}</td>
        <td class="num">${brl(c.recorrencia)}</td><td class="num">${brl(c.faturado)}</td><td class="num">${brl(c.recebido)}</td><td class="num">${brl(c.a_vencer)}</td><td class="num" style="${c.vencido ? 'color:var(--red);font-weight:600' : ''}">${brl(c.vencido)}</td><td>${dataBR(c.ultimo_pagamento)}</td><td>${c.projetos}</td></tr>`).join('') || '<tr><td colspan="10" class="empty">Sem clientes.</td></tr>'}
      </tbody><tfoot><tr><td colspan="3">Total (${d.clientes.length})</td><td class="num">${brl(d.totais.recorrencia)}</td><td class="num">${brl(d.totais.faturado)}</td><td class="num">${brl(d.totais.recebido)}</td><td class="num">${brl(d.totais.a_vencer)}</td><td class="num">${brl(d.totais.vencido)}</td><td colspan="2"></td></tr></tfoot></table></div></div>`;
    csv = () => baixarCsv('relatorio-clientes', [['Cliente', 'Razão social', 'CNPJ', 'Status', 'Contratos ativos', 'Recorrência mensal', 'Faturado', 'Recebido', 'A vencer', 'Vencido', 'Último pagamento', 'Sponsor', 'E-mail financeiro'],
      ...d.clientes.map((c) => [c.nome_fantasia || c.razao_social, c.razao_social, c.cnpj, c.status, c.contratos_ativos, csvNum(c.recorrencia), csvNum(c.faturado), csvNum(c.recebido), csvNum(c.a_vencer), csvNum(c.vencido), dataBR(c.ultimo_pagamento), c.sponsor_nome, c.email_financeiro])]);
  }

  if (tab === 'faturamento' || tab === 'recebimento') {
    const d = await api(`/relatorios/${tab}?de=${de}&ate=${ate}&ativos=${ativos}`);
    const tituloMes = tab === 'faturamento' ? 'competência' : 'mês do recebimento';
    let ind = '';
    if (tab === 'recebimento') {
      ind = `<div class="card"><h2>Recebimento e inadimplência por mês de vencimento</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mês</th><th class="num">Previsto</th><th class="num">Liquidado</th><th class="num">Pago em dia</th><th class="num">Em atraso</th><th class="num">Inadimplência</th></tr></thead><tbody>
        ${d.indicadores.map((i) => `<tr><td>${mesBR(i.mes)}</td><td class="num">${brl(i.previsto)}</td><td class="num">${brl(i.liquidado)}</td><td class="num">${brl(i.em_dia)}</td><td class="num" style="${i.em_atraso ? 'color:var(--red)' : ''}">${brl(i.em_atraso)}</td><td class="num">${i.inadimplencia == null ? '–' : `<b style="color:${i.inadimplencia > 10 ? 'var(--red)' : i.inadimplencia > 0 ? 'var(--amber)' : 'var(--green)'}">${num(i.inadimplencia)}%</b>`}</td></tr>`).join('')}
        </tbody></table></div><p class="small muted">Inadimplência = valor vencido e não pago ÷ valor previsto com vencimento no mês, na data de hoje.</p></div>`;
    }
    box.innerHTML = `${ind}<div class="card" style="padding:0"><div style="padding:14px 18px 0"><h2>${tab === 'faturamento' ? 'Faturamento por cliente e competência' : 'Recebimento por cliente e mês'}</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th>${d.meses.map((m) => `<th class="num">${mesBR(m)}</th>`).join('')}<th class="num">Total</th></tr></thead><tbody>
      ${d.linhas.map((l) => `<tr><td class="nowrap">${esc(l.cliente)} ${l.status === 'inativo' ? '<span class="badge b-gray">inativo</span>' : ''}</td>${d.meses.map((m) => `<td class="num">${l.meses[m] ? brl(l.meses[m]) : '<span class="muted">–</span>'}</td>`).join('')}<td class="num"><b>${brl(l.total)}</b></td></tr>`).join('') || `<tr><td colspan="${d.meses.length + 2}" class="empty">Sem movimento no período.</td></tr>`}
      </tbody><tfoot><tr><td>Total</td>${d.meses.map((m) => `<td class="num">${brl(d.totais[m])}</td>`).join('')}<td class="num">${brl(d.total)}</td></tr></tfoot></table></div>
      <p class="small muted" style="padding:0 18px 14px">Colunas por ${tituloMes}. Faturas canceladas não entram.</p></div>`;
    csv = () => baixarCsv(`relatorio-${tab}-${de}-a-${ate}`, [['Cliente', ...d.meses.map(mesBR), 'Total'], ...d.linhas.map((l) => [l.cliente, ...d.meses.map((m) => csvNum(l.meses[m])), csvNum(l.total)]), ['Total', ...d.meses.map((m) => csvNum(d.totais[m])), csvNum(d.total)],
      ...(d.indicadores ? [[], ['Mês', 'Previsto', 'Liquidado', 'Pago em dia', 'Em atraso', 'Inadimplência %'], ...d.indicadores.map((i) => [mesBR(i.mes), csvNum(i.previsto), csvNum(i.liquidado), csvNum(i.em_dia), csvNum(i.em_atraso), i.inadimplencia == null ? '' : csvNum(i.inadimplencia)])] : [])]);
  }

  if (tab === 'inadimplencia') {
    const d = await api(`/relatorios/inadimplencia?ativos=${ativos}`);
    box.innerHTML = `<div class="grid g4" style="margin-bottom:16px">
        <div class="kpi red"><div class="l">Total vencido</div><div class="v">${brl(d.total)}</div><div class="s">${d.faturas.length} fatura(s) · ${d.clientes.length} cliente(s)</div></div>
        <div class="kpi amber"><div class="l">1 a 30 dias</div><div class="v">${brl(d.faixas['1-30'])}</div></div>
        <div class="kpi amber"><div class="l">31 a 90 dias</div><div class="v">${brl(d.faixas['31-60'] + d.faixas['61-90'])}</div></div>
        <div class="kpi red"><div class="l">Acima de 90 dias</div><div class="v">${brl(d.faixas['90+'])}</div></div></div>
      <div class="card" style="padding:0"><div style="padding:14px 18px 0"><h2>Por cliente</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th>Contato</th><th class="num">Faturas</th><th class="num">1-30</th><th class="num">31-60</th><th class="num">61-90</th><th class="num">90+</th><th class="num">Total</th><th class="num">Maior atraso</th></tr></thead><tbody>
        ${d.clientes.map((c) => `<tr class="click" onclick="location.hash='#/clientes/${c.cliente_id}'"><td><b>${esc(c.cliente)}</b></td><td class="small">${esc(c.email || '')}<br>${esc(c.telefone || '')}</td><td class="num">${c.faturas}</td>${['1-30', '31-60', '61-90', '90+'].map((k) => `<td class="num">${c.faixas[k] ? brl(c.faixas[k]) : '–'}</td>`).join('')}<td class="num"><b style="color:var(--red)">${brl(c.valor)}</b></td><td class="num">${c.maiorAtraso} dias</td></tr>`).join('') || '<tr><td colspan="9" class="empty">Nenhum cliente inadimplente.</td></tr>'}
      </tbody></table></div></div>
      <div class="card" style="padding:0"><div style="padding:14px 18px 0"><h2>Faturas vencidas</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fatura</th><th>Cliente</th><th>Contrato</th><th>Vencimento</th><th class="num">Dias</th><th class="num">Valor</th><th>Cobrança enviada</th></tr></thead><tbody>
        ${d.faturas.map((f) => `<tr class="click" data-fat="${f.id}"><td>${esc(f.numero)}</td><td>${esc(f.cliente)}</td><td>${esc(f.contrato)}</td><td>${dataBR(f.vencimento)}</td><td class="num">${f.dias}</td><td class="num">${brl(f.valor)}</td><td>${f.enviada_em ? dataBR(f.enviada_em) : '<span class="badge b-amber">não enviada</span>'}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Nenhuma fatura vencida.</td></tr>'}
      </tbody></table></div></div><p class="small muted">A vencer (em dia): ${brl(d.aVencer)} · posição em ${dataBR(d.hoje)}</p>`;
    ligarTabelas(box, re);
    csv = () => baixarCsv(`inadimplencia-${d.hoje}`, [['Fatura', 'Cliente', 'Contrato', 'Competência', 'Vencimento', 'Dias de atraso', 'Faixa', 'Valor', 'E-mail', 'Telefone'], ...d.faturas.map((f) => [f.numero, f.cliente, f.contrato, mesBR(f.competencia), dataBR(f.vencimento), f.dias, f.faixa, csvNum(f.valor), f.email_financeiro, f.telefone])]);
  }
  v.querySelector('#csv').onclick = () => csv?.();
}

// ------------------------------------------------------------------ assessments
async function vProjetos(v) {
  const lista = await api('/projetos');
  v.innerHTML = topo('Assessments', 'Diagnósticos enviados a partir dos contratos', `<a class="btn primary" href="#/contratos">Enviar a partir de um contrato</a>`) + `
    <div class="card" style="padding:0">${lista.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Diagnóstico</th><th>Cliente</th><th>Contrato</th><th>Sponsor</th><th>Criado</th><th class="num">Respostas</th><th>Status</th></tr></thead><tbody>
      ${lista.map((p) => `<tr class="click" onclick="location.hash='#/assessments/${p.id}'"><td><b>${esc(PRODUTO_NOME[p.produto])}</b>${p.unidade ? `<div class="small muted">${esc(p.unidade)}</div>` : ''}</td><td>${esc(p.cliente)}</td><td>${esc(p.contrato)}</td><td>${esc(p.sponsor_nome)}<div class="small muted">${p.enviado_em ? 'e-mail enviado ' + dataBR(p.enviado_em) : 'e-mail não enviado'}</div></td><td>${dataBR(p.created_at)}</td><td class="num">${p.respostas}</td><td>${badgeStatus(p.status)}</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="empty">Nenhum assessment ainda. Abra um contrato ativo e clique em "Enviar diagnóstico".</div>'}</div>`;
}

async function vProjeto(v, id, tab = 'links') {
  const p = await api(`/projetos/${id}`);
  v.innerHTML = topo(esc(PRODUTO_NOME[p.produto]), `${esc(p.cliente)}${p.unidade ? ' · ' + esc(p.unidade) : ''} · ${esc(p.contrato)} ${badgeStatus(p.status)}`,
    `<a class="btn" href="#/assessments">← Assessments</a>
     <button class="btn" id="st">${p.status === 'aberto' ? 'Encerrar coleta' : 'Reabrir coleta'}</button>
     <button class="btn primary" id="env">${p.enviado_em ? 'Reenviar ao sponsor' : 'Enviar ao sponsor'}</button>`) + `
    <div class="tabs"><a href="#/assessments/${id}/links" class="${tab === 'links' ? 'on' : ''}">Links e QR Codes</a><a href="#/assessments/${id}/resultado" class="${tab === 'resultado' ? 'on' : ''}">Resultado</a></div>
    <div id="pv"></div>`;
  v.querySelector('#env').onclick = async () => { try { await api(`/projetos/${id}/enviar`, { method: 'POST' }); toast('E-mail enviado ao sponsor.'); vProjeto(v, id, tab); } catch (e) { toast(e.message, true); } };
  v.querySelector('#st').onclick = async () => { await api(`/projetos/${id}`, { method: 'PUT', body: { status: p.status === 'aberto' ? 'encerrado' : 'aberto' } }); vProjeto(v, id, tab); };
  const box = v.querySelector('#pv');
  if (tab === 'links') {
    box.innerHTML = `<div class="card"><h2>Sponsor</h2><dl class="dl"><dt>Responsável</dt><dd>${esc(p.sponsor_nome)} · ${esc(p.sponsor_email)}</dd>
        <dt>E-mail</dt><dd>${p.enviado_em ? `enviado em ${dataBR(p.enviado_em)}` : '<span class="badge b-amber">ainda não enviado</span>'}</dd>
        <dt>Prazo</dt><dd>${p.prazo ? dataBR(p.prazo) : 'sem prazo'}</dd>
        <dt>Página do sponsor</dt><dd><div class="linkbox"><input readonly value="${esc(p.sponsor_url)}"><button class="btn sm" data-copy="${esc(p.sponsor_url)}">Copiar</button><a class="btn sm" href="${esc(p.sponsor_url)}" target="_blank">Abrir</a></div></dd></dl></div>
      <div class="grid g2">${p.campanhas.map((c) => `<div class="card"><h2>${esc(c.nome)}</h2><p class="muted" style="margin-top:-6px">${esc(c.audience || 'Participantes')}</p>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div class="qr">${qrSvg(c.url)}</div>
        <div style="flex:1;min-width:200px"><div class="big">${c.respostas}</div><div class="muted">resposta(s)${c.ultima ? ` · última em ${dataBR(c.ultima)}` : ''}</div>
        <div class="linkbox" style="margin-top:12px"><input readonly value="${esc(c.url)}"><button class="btn sm" data-copy="${esc(c.url)}">Copiar</button></div>
        <a class="btn sm" style="margin-top:8px" href="${esc(c.url)}" target="_blank">Ver formulário</a></div></div></div>`).join('')}</div>`;
    box.querySelectorAll('[data-copy]').forEach((b) => (b.onclick = () => copiar(b.dataset.copy)));
    return;
  }
  const r = await api(`/projetos/${id}/resultado`);
  box.innerHTML = renderResultado(r, p);
  box.querySelectorAll('[data-csv]').forEach((b) => (b.onclick = () => (location.href = `/api/projetos/${id}/export.csv?instrumento=${b.dataset.csv}`)));
}

function linhaDim(s, escala) {
  const pct = escala === 5 ? ((s.mean - 1) / 4) * 100 : s.index;
  const cls = s.avaliacao || s.classificacao;
  return `<div class="dim"><div><b>${esc(s.title)}</b></div><div class="bar ${clsBar(cls)}"><i style="width:${Math.max(0, pct || 0)}%"></i></div>
    <div class="right"><b>${escala === 5 ? num(s.mean, 2) : num(s.index)}</b></div><div class="cls">${clsBadge(cls)}</div></div>`;
}
function blocoAbertas(c) {
  return c.abertas.filter((a) => a.respostas.length).map((a) => `<div style="margin-bottom:14px"><h3>${esc(a.text)}</h3>${a.respostas.map((t) => `<div class="quote">${esc(t)}</div>`).join('')}</div>`).join('') || '<div class="muted">Sem respostas abertas.</div>';
}
function blocoDistrib(c) {
  return c.distribuicoes.map((d) => { const tot = d.options.reduce((s, o) => s + o.n, 0) || 1; return `<div style="margin-bottom:12px"><h3 style="margin-bottom:6px">${esc(d.text)}</h3>${d.options.map((o) => `<div style="display:grid;grid-template-columns:200px 1fr 40px;gap:8px;align-items:center;font-size:12px;margin:3px 0"><span>${esc(o.label)}</span><div class="bar navy"><i style="width:${(o.n / tot) * 100}%"></i></div><span class="right">${o.n}</span></div>`).join('')}</div>`; }).join('');
}

function renderResultado(r, p) {
  const res = r.resultado;
  const camps = Object.entries(r.campanhas);
  const exp = camps.map(([k, c]) => `<button class="btn sm" data-csv="${k}" style="white-space:normal;text-align:left">CSV · ${esc(c.nome.replace('Diagnóstico ', ''))}</button>`).join(' ');
  if (p.produto === 'org') {
    const c = r.campanhas.org;
    if (!c.n) return '<div class="card empty">Ainda não há respostas.</div>';
    return `<div class="grid g3" style="margin-bottom:16px"><div class="kpi navy"><div class="l">Score global</div><div class="v">${num(res.mean, 2)} <span class="small muted">/ 5</span></div><div class="s">${clsBadge(res.avaliacao)}</div></div>
      <div class="kpi"><div class="l">Respondentes</div><div class="v">${c.n}</div></div><div class="kpi"><div class="l">Exportar</div><div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">${exp}</div></div></div>
      <div class="card"><h2>Pilares</h2>${res.sections.map((s) => linhaDim(s, 5)).join('')}<p class="small muted">Itens 32 e 33 (dependência de pessoas-chave) têm pontuação invertida. Faixas: ≥ 4,0 Muito boa · ≥ 3,0 Boa · abaixo Em desenvolvimento.</p></div>
      <div class="card"><h2>Itens por pilar</h2>${res.sections.map((s) => `<h3 style="margin:12px 0 6px">${esc(s.title)}</h3><table class="tbl"><tbody>${s.items.map((i) => `<tr><td>${esc(i.text)}${i.reverse ? ' <span class="badge b-gray">invertido</span>' : ''}</td><td class="num">${num(i.mean, 2)}</td></tr>`).join('')}</tbody></table>`).join('')}</div>
      <div class="grid g2"><div class="card"><h2>Contexto da empresa</h2>${blocoDistrib(c)}</div><div class="card"><h2>Respostas abertas</h2>${blocoAbertas(c)}</div></div>
      <div class="card"><h2>Respondentes</h2><table class="tbl"><tbody>${c.respondentes.map((x) => `<tr><td>${esc(x.nome)}</td><td>${esc(x.email || '')}</td><td>${dataBR(x.em)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  if (p.produto === 'nr1') {
    const A = res.A, B = res.B;
    const nA = r.campanhas.nr1_lid?.n || 0, nB = r.campanhas.nr1_col?.n || 0;
    if (!nA && !nB) return '<div class="card empty">Ainda não há respostas.</div>';
    return `${res.parcial ? `<div class="note">Resultado parcial: ${!nA ? 'Formulário A (Liderança)' : 'Formulário B (Colaboradores)'} ainda sem respostas. O índice consolidado considera só o formulário respondido.</div>` : ''}
      ${res.alertaDivergencia ? `<div class="note" style="background:var(--red-soft);color:var(--red)"><b>Alerta de divergência:</b> a liderança avalia ${res.gapGeral > 0 ? 'acima' : 'abaixo'} dos colaboradores em ${num(Math.abs(res.gapGeral))} pontos.</div>` : ''}
      <div class="grid g4" style="margin-bottom:16px">
        <div class="kpi navy"><div class="l">Índice Explore NR-1</div><div class="v">${num(res.consolidado)}</div><div class="s">${clsBadge(res.classificacao)} · A×40% + B×60%</div></div>
        <div class="kpi"><div class="l">Formulário A · Liderança</div><div class="v">${A ? num(A.index) : '–'}</div><div class="s">${nA} resposta(s) ${A ? clsBadge(A.classificacao) : ''}</div></div>
        <div class="kpi"><div class="l">Formulário B · Colaboradores</div><div class="v">${B ? num(B.index) : '–'}</div><div class="s">${nB} resposta(s) ${B ? clsBadge(B.classificacao) : ''}</div></div>
        <div class="kpi"><div class="l">Exportar</div><div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">${exp}</div></div></div>
      ${A ? `<div class="card"><h2>Formulário A · dimensões (índice 0 a 100)</h2>${A.sections.map((s) => linhaDim(s, 100)).join('')}</div>` : ''}
      ${B ? `<div class="card"><h2>Formulário B · dimensões (índice 0 a 100)</h2>${B.sections.map((s) => linhaDim(s, 100)).join('')}</div>` : ''}
      ${res.divergencias.length ? `<div class="card"><h2>Liderança × Colaboradores (riscos psicossociais)</h2><table class="tbl"><thead><tr><th>Dimensão</th><th class="num">Liderança</th><th class="num">Colaboradores</th><th class="num">Diferença</th><th></th></tr></thead><tbody>
        ${res.divergencias.map((d) => `<tr><td>${esc(d.title)}</td><td class="num">${num(d.lideranca)}</td><td class="num">${num(d.colaboradores)}</td><td class="num"><b>${d.gap > 0 ? '+' : ''}${num(d.gap)}</b></td><td>${d.alerta ? '<span class="badge b-red">divergência crítica</span>' : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <p class="small muted">Índice = (média − 1) ÷ 4 × 100. Faixas: ≥ 70 ADEQUADO · 50 a 69,9 ATENÇÃO · abaixo de 50 CRÍTICO. Divergência crítica: diferença ≥ 15 pontos. Respostas "Não se aplica" não entram no cálculo.</p>
      <div class="grid g2">${camps.map(([, c]) => `<div class="card"><h2>${esc(c.nome)}</h2>${c.distribuicoes.length ? blocoDistrib(c) : ''}<h3 style="margin:14px 0 8px">Respostas abertas</h3>${blocoAbertas(c)}</div>`).join('')}</div>`;
  }
  return '<div class="card empty">Sem cálculo disponível.</div>';
}

// ------------------------------------------------------------------ configurações
async function vConfig(v) {
  const [org, users, servs] = await Promise.all([api('/org'), api('/users'), api('/servicos')]);
  S.servicos = servs;
  const admin = S.me.user.papel === 'admin';
  v.innerHTML = topo('Configurações') + `
    <div class="grid g2">
      <form class="card" id="forg"><h2>Empresa emissora e recebimento</h2>
        ${field('nome', 'Nome', org.nome)}${field('cnpj', 'CNPJ', org.cnpj)}${field('email', 'E-mail para respostas dos clientes', org.email, 'email')}
        <h3 style="margin:8px 0 10px">PIX</h3>
        ${field('pix_chave', 'Chave PIX (CNPJ, e-mail, telefone ou aleatória)', org.pix_chave)}
        <div class="row">${field('pix_nome', 'Nome do recebedor', org.pix_nome)}${field('pix_cidade', 'Cidade do recebedor', org.pix_cidade)}</div>
        <label class="f"><span>Instruções de pagamento (aparecem no e-mail)</span><textarea name="instrucoes_pagamento">${esc(org.instrucoes_pagamento || '')}</textarea></label>
        <button class="btn primary" ${admin ? '' : 'disabled'}>Salvar</button></form>
      <div class="card"><h2>Integrações</h2><dl class="dl">
        <dt>E-mail (Resend)</dt><dd>${S.me.resend ? '<span class="badge b-green">ativo</span>' : '<span class="badge b-red">sem RESEND_API_KEY</span>'}</dd>
        <dt>Boleto registrado (Asaas)</dt><dd>${S.me.asaas ? '<span class="badge b-green">ativo</span> baixa automática por webhook' : '<span class="badge b-gray">desativado</span> cobrança por PIX e baixa manual'}</dd>
        <dt>Webhook Asaas</dt><dd class="mono">${location.origin}/api/webhooks/asaas</dd></dl>
        <p class="small muted">As chaves ficam nos secrets do Cloudflare Pages, nunca no código. Veja o README.</p></div>
    </div>
    <div class="card"><div class="top" style="margin-bottom:8px"><h2>Serviços</h2><button class="btn sm" id="nserv">Novo serviço</button></div>
      <table class="tbl"><thead><tr><th>Serviço</th><th>Assessment vinculado</th><th class="num">Valor padrão</th><th></th></tr></thead><tbody>
      ${servs.map((s) => `<tr><td>${esc(s.nome)}${s.ativo ? '' : ' <span class="badge b-gray">inativo</span>'}</td><td>${s.produto ? esc(PRODUTO_NOME[s.produto]) : '–'}</td><td class="num">${s.valor_padrao ? brl(s.valor_padrao) : '–'}</td><td class="right"><button class="btn sm" data-serv="${s.id}">Editar</button></td></tr>`).join('')}</tbody></table></div>
    <div class="card"><div class="top" style="margin-bottom:8px"><h2>Usuários</h2>${admin ? '<button class="btn sm" id="nuser">Novo usuário</button>' : ''}</div>
      <table class="tbl"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr></thead><tbody>
      ${users.map((u) => `<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${esc(u.papel)}</td><td>${u.ativo ? badgeStatus('ativo') : badgeStatus('inativo')}</td><td class="right">${admin || u.id === S.me.user.id ? `<button class="btn sm" data-user="${u.id}">Editar</button>` : ''}</td></tr>`).join('')}</tbody></table>
      <p class="small muted">Perfis: admin (tudo) · financeiro (contratos e cobranças) · consultor (clientes e assessments).</p></div>`;
  v.querySelector('#forg').onsubmit = async (e) => { e.preventDefault(); try { await api('/org', { method: 'PUT', body: formData(e.target) }); toast('Configurações salvas.'); } catch (err) { toast(err.message, true); } };
  const formServ = (s = {}) => modal(s.id ? 'Editar serviço' : 'Novo serviço', `
    ${field('nome', 'Nome *', s.nome, 'text', 'required')}${field('descricao', 'Descrição', s.descricao)}
    <div class="row">${field('valor_padrao', 'Valor padrão (R$)', s.valor_padrao, 'number', 'step="0.01"')}
    <label class="f"><span>Assessment vinculado</span><select name="produto"><option value="">Nenhum</option>${Object.entries(PRODUTO_NOME).map(([k, n]) => opt(k, n, s.produto)).join('')}</select></label>
    ${s.id ? `<label class="f"><span>Status</span><select name="ativo">${opt(1, 'Ativo', s.ativo)}${opt(0, 'Inativo', s.ativo)}</select></label>` : ''}</div>`,
  { onSubmit: async (d) => { if (d.ativo !== undefined) d.ativo = Number(d.ativo); s.id ? await api(`/servicos/${s.id}`, { method: 'PUT', body: d }) : await api('/servicos', { method: 'POST', body: d }); S.servicos = null; vConfig(v); } });
  v.querySelector('#nserv').onclick = () => formServ();
  v.querySelectorAll('[data-serv]').forEach((b) => (b.onclick = () => formServ(servs.find((s) => s.id === Number(b.dataset.serv)))));
  v.querySelector('#nuser')?.addEventListener('click', () => modal('Novo usuário', `${field('nome', 'Nome *', '', 'text', 'required')}${field('email', 'E-mail *', '', 'email', 'required')}${field('senha', 'Senha inicial (mín. 8) *', '', 'password', 'required')}
    <label class="f"><span>Perfil</span><select name="papel">${opt('consultor', 'Consultor')}${opt('financeiro', 'Financeiro')}${opt('admin', 'Admin')}</select></label>`,
  { onSubmit: async (d) => { await api('/users', { method: 'POST', body: d }); toast('Usuário criado.'); vConfig(v); } }));
  v.querySelectorAll('[data-user]').forEach((b) => (b.onclick = () => {
    const u = users.find((x) => x.id === Number(b.dataset.user));
    modal(`Editar ${u.nome}`, `${field('nome', 'Nome', u.nome)}${field('senha', 'Nova senha (deixe em branco para manter)', '', 'password')}
      ${admin ? `<div class="row"><label class="f"><span>Perfil</span><select name="papel">${opt('consultor', 'Consultor', u.papel)}${opt('financeiro', 'Financeiro', u.papel)}${opt('admin', 'Admin', u.papel)}</select></label>
      <label class="f"><span>Status</span><select name="ativo">${opt(1, 'Ativo', u.ativo)}${opt(0, 'Inativo', u.ativo)}</select></label></div>` : ''}`,
    { onSubmit: async (d) => { if (!d.senha) delete d.senha; if (d.ativo !== undefined) d.ativo = Number(d.ativo); await api(`/users/${u.id}`, { method: 'PUT', body: d }); toast('Usuário atualizado.'); vConfig(v); } });
  }));
}

boot();
