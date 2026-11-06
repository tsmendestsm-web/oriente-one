// Oriente One v1.2.0 | API (Cloudflare Pages Functions + D1)
import { INSTRUMENTS, PRODUTOS } from './instruments.js';
import { resultadoOrg, resultadoNR1 } from './scoring.js';
import { pixCopiaCola } from './pix.js';
import { asaasAtivo, garantirCliente, emitirBoleto, cancelarBoleto } from './asaas.js';
import { enviarEmail, layout, botao } from './mail.js';
import { calcularBase, montarPrompt, normalizar, gerarComGemini, PILARES } from './motor-org.js';

export const VERSION = '1.2.0';

// ---------------------------------------------------------------- utilidades
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
const err = (msg, status = 400) => json({ error: msg }, status);
class HttpError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
const fail = (msg, status = 400) => { throw new HttpError(msg, status); };

const hojeBR = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const token = (n = 24) => {
  const a = new Uint8Array(n); crypto.getRandomValues(a);
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(a, (b) => abc[b % abc.length]).join('');
};
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => (d ? d.split('-').reverse().join('/') : '');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const r2 = (v) => Math.round(Number(v) * 100) / 100;

function addMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}
function vencNaCompetencia(comp, dia) {
  const [y, m] = comp.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${comp}-${String(Math.min(Math.max(1, dia || 10), last)).padStart(2, '0')}`;
}
function mesesEntre(de, ate) {
  const out = []; let [y, m] = de.split('-').map(Number); const [ya, ma] = ate.split('-').map(Number);
  while (y < ya || (y === ya && m <= ma)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } if (out.length > 60) break; }
  return out;
}
const isComp = (s) => /^\d{4}-\d{2}$/.test(s || '');
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

// ---------------------------------------------------------------- senha / sessão
async function hashSenha(senha, saltB64) {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  const b64 = (u) => btoa(String.fromCharCode(...new Uint8Array(u)));
  return `pbkdf2$100000$${b64(salt)}$${b64(bits)}`;
}
async function conferirSenha(senha, stored) {
  const [, , salt] = String(stored).split('$');
  if (!salt) return false;
  return (await hashSenha(senha, salt)) === stored;
}
const COOKIE = 'oo_s';
const lerCookie = (req) => (req.headers.get('Cookie') || '').split(/;\s*/).map((c) => c.split('=')).find(([k]) => k === COOKIE)?.[1];
const cookieSessao = (t, maxAge) => `${COOKIE}=${t}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

async function usuarioDaSessao(req, env) {
  const t = lerCookie(req);
  if (!t) return null;
  return env.DB.prepare(
    `SELECT u.id, u.org_id, u.nome, u.email, u.papel, o.nome AS org_nome FROM sessions s
     JOIN users u ON u.id = s.user_id JOIN orgs o ON o.id = u.org_id
     WHERE s.token = ? AND s.expires_at > datetime('now') AND u.ativo = 1`
  ).bind(t).first();
}

const all = async (env, sql, ...b) => (await env.DB.prepare(sql).bind(...b).all()).results;
const one = (env, sql, ...b) => env.DB.prepare(sql).bind(...b).first();
const run = (env, sql, ...b) => env.DB.prepare(sql).bind(...b).run();
const log = (env, u, tipo, ref, detalhe) =>
  run(env, 'INSERT INTO eventos (org_id,user_id,tipo,ref,detalhe) VALUES (?,?,?,?,?)', u?.org_id ?? null, u?.id ?? null, tipo, String(ref ?? ''), detalhe ? JSON.stringify(detalhe) : null);

function pick(body, fields) {
  const o = {};
  for (const f of fields) if (body[f] !== undefined) o[f] = typeof body[f] === 'string' ? body[f].trim() : body[f];
  return o;
}
async function insert(env, table, data) {
  const k = Object.keys(data);
  const r = await run(env, `INSERT INTO ${table} (${k.join(',')}) VALUES (${k.map(() => '?').join(',')})`, ...k.map((x) => data[x] ?? null));
  return r.meta.last_row_id;
}
async function update(env, table, id, orgId, data) {
  const k = Object.keys(data);
  if (!k.length) return;
  await run(env, `UPDATE ${table} SET ${k.map((x) => `${x} = ?`).join(', ')} WHERE id = ? AND org_id = ?`, ...k.map((x) => data[x] ?? null), id, orgId);
}

// ---------------------------------------------------------------- roteador
export async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/';
  const method = request.method;
  const origin = env.APP_URL || url.origin;
  let body = {};
  if (method !== 'GET' && method !== 'HEAD') body = await request.json().catch(() => ({}));
  const ctx = { request, env, url, path, method, body, origin, q: Object.fromEntries(url.searchParams) };

  try {
    // ---------- públicas
    if (path === '/health') return json({ ok: true, version: VERSION });
    if (path === '/setup/status' && method === 'GET') {
      const c = await one(env, 'SELECT COUNT(*) AS n FROM users');
      return json({ needsSetup: !c.n, version: VERSION });
    }
    if (path === '/setup' && method === 'POST') return setup(ctx);
    if (path === '/login' && method === 'POST') return login(ctx);
    if (path === '/logout' && method === 'POST') {
      const t = lerCookie(request); if (t) await run(env, 'DELETE FROM sessions WHERE token = ?', t);
      return json({ ok: true }, 200, { 'Set-Cookie': cookieSessao('', 0) });
    }
    let m;
    if ((m = path.match(/^\/public\/c\/([A-Za-z0-9]+)$/))) return method === 'POST' ? publicSubmit(ctx, m[1]) : publicCampanha(ctx, m[1]);
    if ((m = path.match(/^\/public\/s\/([A-Za-z0-9]+)$/))) return publicSponsor(ctx, m[1]);
    if (path === '/webhooks/asaas' && method === 'POST') return webhookAsaas(ctx);

    // ---------- autenticadas
    const user = await usuarioDaSessao(request, env);
    if (!user) return err('Sessão expirada. Entre novamente.', 401);
    ctx.user = user;
    const org = user.org_id;

    if (path === '/me') return json({ user, version: VERSION, asaas: asaasAtivo(env), resend: !!env.RESEND_API_KEY, ia: !!env.GEMINI_API_KEY });
    if (path === '/dashboard') return dashboard(ctx);

    // Organização / usuários
    if (path === '/org' && method === 'GET') return json(await one(env, 'SELECT * FROM orgs WHERE id = ?', org));
    if (path === '/org' && method === 'PUT') {
      soAdmin(user);
      const d = pick(body, ['nome', 'cnpj', 'email', 'pix_chave', 'pix_nome', 'pix_cidade', 'instrucoes_pagamento']);
      const k = Object.keys(d); if (k.length) await run(env, `UPDATE orgs SET ${k.map((x) => `${x}=?`).join(',')} WHERE id = ?`, ...k.map((x) => d[x]), org);
      return json({ ok: true });
    }
    if (path === '/users' && method === 'GET') return json(await all(env, 'SELECT id,nome,email,papel,ativo,created_at FROM users WHERE org_id = ? ORDER BY nome', org));
    if (path === '/users' && method === 'POST') {
      soAdmin(user);
      if (!body.nome || !body.email || !body.senha || body.senha.length < 8) fail('Informe nome, e-mail e senha (mínimo 8 caracteres).');
      const ex = await one(env, 'SELECT id FROM users WHERE email = ?', body.email.toLowerCase().trim());
      if (ex) fail('Já existe um usuário com esse e-mail.');
      const id = await insert(env, 'users', { org_id: org, nome: body.nome.trim(), email: body.email.toLowerCase().trim(), senha_hash: await hashSenha(body.senha), papel: ['admin', 'financeiro', 'consultor'].includes(body.papel) ? body.papel : 'consultor' });
      return json({ id });
    }
    if ((m = path.match(/^\/users\/(\d+)$/)) && method === 'PUT') {
      if (Number(m[1]) !== user.id) soAdmin(user);
      const d = {};
      if (body.nome) d.nome = body.nome.trim();
      if (body.senha) { if (body.senha.length < 8) fail('Senha com no mínimo 8 caracteres.'); d.senha_hash = await hashSenha(body.senha); }
      if (user.papel === 'admin') { if (body.papel) d.papel = body.papel; if (body.ativo !== undefined) d.ativo = body.ativo ? 1 : 0; }
      await update(env, 'users', Number(m[1]), org, d);
      return json({ ok: true });
    }

    // Clientes
    if (path === '/clientes' && method === 'GET') return listarClientes(ctx);
    if (path === '/clientes' && method === 'POST') return salvarCliente(ctx);
    if ((m = path.match(/^\/clientes\/(\d+)$/))) {
      if (method === 'GET') return detalheCliente(ctx, Number(m[1]));
      if (method === 'PUT') return salvarCliente(ctx, Number(m[1]));
    }

    // Serviços
    if (path === '/servicos' && method === 'GET') return json(await all(env, 'SELECT * FROM servicos WHERE org_id = ? ORDER BY ativo DESC, nome', org));
    if (path === '/servicos' && method === 'POST') {
      if (!body.nome) fail('Informe o nome do serviço.');
      const id = await insert(env, 'servicos', { org_id: org, ...pick(body, ['nome', 'descricao', 'valor_padrao', 'produto']), produto: PRODUTOS[body.produto] ? body.produto : null });
      return json({ id });
    }
    if ((m = path.match(/^\/servicos\/(\d+)$/)) && method === 'PUT') {
      const d = pick(body, ['nome', 'descricao', 'valor_padrao', 'produto', 'ativo']);
      if ('produto' in d && !PRODUTOS[d.produto]) d.produto = null;
      await update(env, 'servicos', Number(m[1]), org, d);
      return json({ ok: true });
    }

    // Contratos
    if (path === '/contratos' && method === 'GET') return listarContratos(ctx);
    if (path === '/contratos' && method === 'POST') return criarContrato(ctx);
    if ((m = path.match(/^\/contratos\/(\d+)$/))) {
      if (method === 'GET') return detalheContrato(ctx, Number(m[1]));
      if (method === 'PUT') return editarContrato(ctx, Number(m[1]));
    }

    // Faturamento
    if (path === '/faturas' && method === 'GET') return listarFaturas(ctx);
    if (path === '/faturas' && method === 'POST') return faturaAvulsa(ctx);
    if (path === '/faturas/gerar' && method === 'POST') return gerarCompetencia(ctx);
    if ((m = path.match(/^\/faturas\/(\d+)(?:\/(\w+))?$/))) {
      const id = Number(m[1]); const acao = m[2];
      if (!acao && method === 'GET') return json(await faturaCompleta(env, id, org));
      if (!acao && method === 'PUT') return editarFatura(ctx, id);
      if (acao === 'emitir' && method === 'POST') return emitirFatura(ctx, id);
      if (acao === 'enviar' && method === 'POST') return enviarFatura(ctx, id);
      if (acao === 'baixa' && method === 'POST') return baixarFatura(ctx, id);
      if (acao === 'estornar' && method === 'POST') return estornarFatura(ctx, id);
      if (acao === 'cancelar' && method === 'POST') return cancelarFatura(ctx, id);
    }

    // Relatórios
    if (path === '/relatorios/clientes') return relClientes(ctx);
    if (path === '/relatorios/faturamento') return relFaturamento(ctx);
    if (path === '/relatorios/recebimento') return relRecebimento(ctx);
    if (path === '/relatorios/inadimplencia') return relInadimplencia(ctx);

    // Assessments
    if (path === '/produtos') return json(Object.entries(PRODUTOS).map(([k, p]) => ({
      key: k, nome: p.nome, disponivel: p.instrumentos.every((i) => !INSTRUMENTS[i].emConstrucao),
      instrumentos: p.instrumentos.map((i) => ({ key: i, nome: INSTRUMENTS[i].nome, audience: INSTRUMENTS[i].audience || null })),
    })));
    if (path === '/instrumentos' && method === 'GET') return json(INSTRUMENTS);
    if (path === '/projetos' && method === 'GET') return listarProjetos(ctx);
    if (path === '/projetos' && method === 'POST') return criarProjeto(ctx);
    if ((m = path.match(/^\/projetos\/(\d+)\/diagnostico(?:\/(\w+))?$/))) {
      const id = Number(m[1]); const acao = m[2];
      if (!acao && method === 'GET') return verDiagnostico(ctx, id);
      if (!acao && method === 'PUT') return salvarDiagnostico(ctx, id);
      if (acao === 'gerar' && method === 'POST') return gerarDiagnostico(ctx, id);
      if (acao === 'prompt' && method === 'GET') return promptDiagnostico(ctx, id);
      if (acao === 'importar' && method === 'POST') return importarDiagnostico(ctx, id);
    }
    if ((m = path.match(/^\/projetos\/(\d+)(?:\/([\w.]+))?$/))) {
      const id = Number(m[1]); const acao = m[2];
      if (!acao && method === 'GET') return detalheProjeto(ctx, id);
      if (!acao && method === 'PUT') {
        const d = pick(body, ['status', 'prazo', 'sponsor_nome', 'sponsor_email', 'titulo', 'unidade']);
        await update(env, 'projetos', id, org, d); return json({ ok: true });
      }
      if (acao === 'enviar' && method === 'POST') return enviarProjeto(ctx, id);
      if (acao === 'resultado') return resultadoProjeto(ctx, id);
      if (acao === 'export.csv') return exportarCsv(ctx, id);
    }
    return err('Rota não encontrada.', 404);
  } catch (e) {
    if (e instanceof HttpError) return err(e.message, e.status);
    console.error(e);
    return err('Erro interno: ' + (e.message || e), 500);
  }
}

const soAdmin = (u) => { if (u.papel !== 'admin') fail('Apenas administradores podem fazer isso.', 403); };
const podeFinanceiro = (u) => { if (!['admin', 'financeiro'].includes(u.papel)) fail('Apenas o financeiro pode fazer isso.', 403); };

// ---------------------------------------------------------------- setup / login
async function setup({ env, body }) {
  const c = await one(env, 'SELECT COUNT(*) AS n FROM users');
  if (c.n) fail('A plataforma já foi configurada.', 403);
  if (!body.org_nome || !body.nome || !body.email || !body.senha || body.senha.length < 8) fail('Preencha todos os campos (senha com no mínimo 8 caracteres).');
  const orgId = await insert(env, 'orgs', { nome: body.org_nome.trim(), cnpj: body.cnpj || null, pix_nome: body.org_nome.trim() });
  await insert(env, 'users', { org_id: orgId, nome: body.nome.trim(), email: body.email.toLowerCase().trim(), senha_hash: await hashSenha(body.senha), papel: 'admin' });
  // Serviços padrão vinculados aos assessments
  const padrao = [
    ['Diagnóstico Organizacional', 'org'],
    ['Diagnóstico NR-1 (Riscos Psicossociais)', 'nr1'],
    ['Diagnóstico Familiar Sistêmico-Empresarial', 'dsfe'],
    ['Consultoria Mensal (Retainer)', null],
  ];
  for (const [nome, produto] of padrao) await insert(env, 'servicos', { org_id: orgId, nome, produto });
  return json({ ok: true });
}

async function login({ env, body }) {
  const u = await one(env, 'SELECT * FROM users WHERE email = ? AND ativo = 1', String(body.email || '').toLowerCase().trim());
  if (!u || !(await conferirSenha(String(body.senha || ''), u.senha_hash))) fail('E-mail ou senha inválidos.', 401);
  const t = token(40);
  await run(env, "INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,datetime('now','+30 days'))", t, u.id);
  await run(env, "DELETE FROM sessions WHERE expires_at < datetime('now')");
  return json({ ok: true }, 200, { 'Set-Cookie': cookieSessao(t, 30 * 86400) });
}

// ---------------------------------------------------------------- dashboard
async function dashboard({ env, user }) {
  const org = user.org_id; const hoje = hojeBR(); const comp = hoje.slice(0, 7);
  const [cli, ctr, fat, rec, venc, aReceber, proj] = await Promise.all([
    one(env, "SELECT COUNT(*) n FROM clientes WHERE org_id=? AND status='ativo'", org),
    one(env, "SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN modalidade='mensal' THEN valor ELSE 0 END),0) mrr FROM contratos WHERE org_id=? AND status='ativo'", org),
    one(env, "SELECT COALESCE(SUM(valor),0) v, COUNT(*) n FROM faturas WHERE org_id=? AND competencia=? AND status!='cancelada'", org, comp),
    one(env, "SELECT COALESCE(SUM(valor_pago),0) v FROM faturas WHERE org_id=? AND status='paga' AND substr(pago_em,1,7)=?", org, comp),
    one(env, "SELECT COALESCE(SUM(valor),0) v, COUNT(*) n, COUNT(DISTINCT cliente_id) c FROM faturas WHERE org_id=? AND status='aberta' AND vencimento < ?", org, hoje),
    one(env, "SELECT COALESCE(SUM(valor),0) v, COUNT(*) n FROM faturas WHERE org_id=? AND status='aberta' AND vencimento >= ?", org, hoje),
    one(env, "SELECT COUNT(*) n FROM projetos WHERE org_id=? AND status='aberto'", org),
  ]);
  const pendentesGerar = await one(env,
    `SELECT COUNT(*) n FROM contratos c WHERE c.org_id=? AND c.status='ativo' AND c.modalidade='mensal' AND substr(c.data_inicio,1,7) <= ?
     AND (c.data_fim IS NULL OR c.data_fim='' OR substr(c.data_fim,1,7) >= ?)
     AND NOT EXISTS (SELECT 1 FROM faturas f WHERE f.contrato_id=c.id AND f.competencia=? AND f.status!='cancelada')`, org, comp, comp, comp);
  const proximas = await all(env,
    `SELECT f.id,f.numero,f.valor,f.vencimento,f.status,c.razao_social cliente FROM faturas f JOIN clientes c ON c.id=f.cliente_id
     WHERE f.org_id=? AND f.status='aberta' ORDER BY f.vencimento LIMIT 8`, org);
  const projetos = await all(env,
    `SELECT p.id,p.titulo,p.produto,p.status,p.created_at,c.razao_social cliente,
      (SELECT COUNT(*) FROM respostas r JOIN campanhas k ON k.id=r.campanha_id WHERE k.projeto_id=p.id) respostas
     FROM projetos p JOIN clientes c ON c.id=p.cliente_id WHERE p.org_id=? AND p.status='aberto' ORDER BY p.created_at DESC LIMIT 6`, org);
  return json({
    hoje, competencia: comp,
    clientesAtivos: cli.n, contratosAtivos: ctr.n, recorrenciaMensal: ctr.mrr,
    faturadoMes: fat.v, faturasMes: fat.n, recebidoMes: rec.v,
    vencido: venc.v, faturasVencidas: venc.n, clientesInadimplentes: venc.c,
    aReceber: aReceber.v, projetosAbertos: proj.n, pendentesGerar: pendentesGerar.n,
    proximas, projetos,
  });
}

// ---------------------------------------------------------------- clientes
const CAMPOS_CLIENTE = ['razao_social', 'nome_fantasia', 'cnpj', 'email_financeiro', 'telefone', 'endereco', 'cidade', 'uf', 'cep', 'sponsor_nome', 'sponsor_email', 'sponsor_telefone', 'status', 'observacoes'];
async function listarClientes({ env, user, q }) {
  const where = ['c.org_id = ?']; const b = [user.org_id];
  if (q.status) { where.push('c.status = ?'); b.push(q.status); }
  if (q.busca) { where.push('(c.razao_social LIKE ? OR c.nome_fantasia LIKE ? OR c.cnpj LIKE ?)'); b.push(`%${q.busca}%`, `%${q.busca}%`, `%${q.busca}%`); }
  return json(await all(env,
    `SELECT c.*, (SELECT COUNT(*) FROM contratos k WHERE k.cliente_id=c.id AND k.status='ativo') contratos_ativos,
      (SELECT COALESCE(SUM(valor),0) FROM faturas f WHERE f.cliente_id=c.id AND f.status='aberta' AND f.vencimento < ?) vencido
     FROM clientes c WHERE ${where.join(' AND ')} ORDER BY c.status, c.razao_social`, hojeBR(), ...b));
}
async function salvarCliente({ env, user, body }, id) {
  const d = pick(body, CAMPOS_CLIENTE);
  if (!id && !d.razao_social) fail('Informe a razão social.');
  if (d.status && !['ativo', 'inativo'].includes(d.status)) fail('Status inválido.');
  if (d.uf) d.uf = d.uf.toUpperCase().slice(0, 2);
  if (id) { await update(env, 'clientes', id, user.org_id, d); return json({ id }); }
  const nid = await insert(env, 'clientes', { org_id: user.org_id, ...d });
  await log(env, user, 'cliente.criado', nid);
  return json({ id: nid });
}
async function detalheCliente({ env, user }, id) {
  const c = await one(env, 'SELECT * FROM clientes WHERE id=? AND org_id=?', id, user.org_id);
  if (!c) fail('Cliente não encontrado.', 404);
  c.contratos = await all(env, 'SELECT k.*, s.nome servico FROM contratos k LEFT JOIN servicos s ON s.id=k.servico_id WHERE k.cliente_id=? ORDER BY k.created_at DESC', id);
  c.faturas = await all(env, 'SELECT * FROM faturas WHERE cliente_id=? ORDER BY vencimento DESC LIMIT 60', id);
  c.projetos = await all(env, 'SELECT * FROM projetos WHERE cliente_id=? ORDER BY created_at DESC', id);
  return json(c);
}

// ---------------------------------------------------------------- contratos
async function proximoCodigo(env, org) {
  const ano = hojeBR().slice(0, 4);
  const r = await one(env, "SELECT MAX(CAST(substr(codigo, 10) AS INTEGER)) n FROM contratos WHERE org_id=? AND codigo LIKE ?", org, `CTR-${ano}-%`);
  return `CTR-${ano}-${String((r?.n || 0) + 1).padStart(3, '0')}`;
}
async function proximoNumeroFatura(env, org) {
  const ano = hojeBR().slice(0, 4);
  const r = await one(env, "SELECT MAX(CAST(substr(numero, 10) AS INTEGER)) n FROM faturas WHERE org_id=? AND numero LIKE ?", org, `FAT-${ano}-%`);
  return `FAT-${ano}-${String((r?.n || 0) + 1).padStart(4, '0')}`;
}

async function listarContratos({ env, user, q }) {
  const where = ['k.org_id = ?']; const b = [user.org_id];
  if (q.status) { where.push('k.status = ?'); b.push(q.status); }
  if (q.cliente_id) { where.push('k.cliente_id = ?'); b.push(Number(q.cliente_id)); }
  return json(await all(env,
    `SELECT k.*, c.razao_social cliente, c.status cliente_status, s.nome servico, s.produto,
      (SELECT COUNT(*) FROM faturas f WHERE f.contrato_id=k.id AND f.status!='cancelada') faturas,
      (SELECT COUNT(*) FROM projetos p WHERE p.contrato_id=k.id) projetos
     FROM contratos k JOIN clientes c ON c.id=k.cliente_id LEFT JOIN servicos s ON s.id=k.servico_id
     WHERE ${where.join(' AND ')} ORDER BY k.status, k.created_at DESC`, ...b));
}

async function criarContrato({ env, user, body }) {
  podeFinanceiro(user);
  const org = user.org_id;
  const cli = await one(env, 'SELECT * FROM clientes WHERE id=? AND org_id=?', Number(body.cliente_id), org);
  if (!cli) fail('Selecione o cliente.');
  const modalidade = ['mensal', 'parcelado', 'unico'].includes(body.modalidade) ? body.modalidade : 'mensal';
  const valor = r2(body.valor);
  if (!(valor > 0)) fail('Informe o valor do contrato.');
  if (!isDate(body.data_inicio)) fail('Informe a data de início.');
  if (!body.objeto) fail('Descreva o objeto do contrato.');
  const parcelas = modalidade === 'parcelado' ? Math.max(1, Math.min(60, Number(body.parcelas) || 1)) : 1;
  const primeiro = modalidade === 'mensal' ? null : (isDate(body.primeiro_vencimento) ? body.primeiro_vencimento : fail('Informe o primeiro vencimento.'));
  // O contrato registra exatamente um serviço cadastrado e ativo; é ele que define o que fica disponível.
  const servico = body.servico_id ? await one(env, 'SELECT * FROM servicos WHERE id=? AND org_id=? AND ativo=1', Number(body.servico_id), org) : null;
  if (!servico) fail('Selecione o serviço contratado (apenas serviços cadastrados e ativos).');

  const id = await insert(env, 'contratos', {
    org_id: org, cliente_id: cli.id, servico_id: servico.id,
    codigo: await proximoCodigo(env, org), objeto: body.objeto.trim(), modalidade, valor, parcelas,
    dia_vencimento: Math.max(1, Math.min(31, Number(body.dia_vencimento) || 10)),
    data_inicio: body.data_inicio, data_fim: isDate(body.data_fim) ? body.data_fim : null, primeiro_vencimento: primeiro,
    status: 'ativo',
    sponsor_nome: body.sponsor_nome || cli.sponsor_nome || null, sponsor_email: body.sponsor_email || cli.sponsor_email || null,
    observacoes: body.observacoes || null,
  });
  // Parcelado / único: agenda todas as faturas na criação
  let geradas = 0;
  if (modalidade !== 'mensal') {
    const base = r2(valor / parcelas);
    for (let i = 0; i < parcelas; i++) {
      const v = i === parcelas - 1 ? r2(valor - base * (parcelas - 1)) : base;
      const venc = addMonths(primeiro, i);
      await insert(env, 'faturas', {
        org_id: org, contrato_id: id, cliente_id: cli.id, numero: await proximoNumeroFatura(env, org),
        competencia: venc.slice(0, 7), parcela: i + 1, total_parcelas: parcelas,
        descricao: parcelas > 1 ? `${body.objeto.trim()} · parcela ${i + 1}/${parcelas}` : body.objeto.trim(),
        valor: v, vencimento: venc, status: 'aberta',
      });
      geradas++;
    }
  }
  await log(env, user, 'contrato.criado', id, { geradas });
  return json({ id, faturasGeradas: geradas });
}

async function editarContrato({ env, user, body }, id) {
  podeFinanceiro(user);
  const d = pick(body, ['objeto', 'servico_id', 'valor', 'dia_vencimento', 'data_fim', 'status', 'sponsor_nome', 'sponsor_email', 'observacoes']);
  if (d.status && !['ativo', 'suspenso', 'encerrado'].includes(d.status)) fail('Status inválido.');
  if (d.valor !== undefined) d.valor = r2(d.valor);
  if (d.servico_id !== undefined) {
    const atual = await one(env, 'SELECT servico_id FROM contratos WHERE id=? AND org_id=?', id, user.org_id);
    if (!atual) fail('Contrato não encontrado.', 404);
    if (Number(d.servico_id) !== atual.servico_id) {
      const s = await one(env, 'SELECT id FROM servicos WHERE id=? AND org_id=? AND ativo=1', Number(d.servico_id), user.org_id);
      if (!s) fail('Serviço inválido ou inativo.');
      const p = await one(env, 'SELECT COUNT(*) n FROM projetos WHERE contrato_id=?', id);
      if (p.n) fail('Este contrato já tem diagnóstico enviado. O serviço não pode mais ser trocado.');
      d.servico_id = s.id;
    } else delete d.servico_id;
  }
  await update(env, 'contratos', id, user.org_id, d);
  await log(env, user, 'contrato.editado', id, d);
  return json({ ok: true });
}

async function detalheContrato({ env, user }, id) {
  const k = await one(env,
    `SELECT k.*, c.razao_social cliente, c.sponsor_nome cliente_sponsor_nome, c.sponsor_email cliente_sponsor_email, s.nome servico, s.produto
     FROM contratos k JOIN clientes c ON c.id=k.cliente_id LEFT JOIN servicos s ON s.id=k.servico_id WHERE k.id=? AND k.org_id=?`, id, user.org_id);
  if (!k) fail('Contrato não encontrado.', 404);
  k.faturas = await all(env, 'SELECT * FROM faturas WHERE contrato_id=? ORDER BY vencimento', id);
  k.projetos = await all(env,
    `SELECT p.*, (SELECT COUNT(*) FROM respostas r JOIN campanhas c ON c.id=r.campanha_id WHERE c.projeto_id=p.id) respostas
     FROM projetos p WHERE p.contrato_id=? ORDER BY p.created_at DESC`, id);
  return json(k);
}

// ---------------------------------------------------------------- faturas
async function listarFaturas({ env, user, q }) {
  const where = ['f.org_id = ?']; const b = [user.org_id]; const hoje = hojeBR();
  if (isComp(q.competencia)) { where.push('f.competencia = ?'); b.push(q.competencia); }
  if (q.cliente_id) { where.push('f.cliente_id = ?'); b.push(Number(q.cliente_id)); }
  if (q.contrato_id) { where.push('f.contrato_id = ?'); b.push(Number(q.contrato_id)); }
  if (q.status === 'vencida') { where.push("f.status='aberta' AND f.vencimento < ?"); b.push(hoje); }
  else if (q.status === 'a_vencer') { where.push("f.status='aberta' AND f.vencimento >= ?"); b.push(hoje); }
  else if (q.status) { where.push('f.status = ?'); b.push(q.status); }
  const rows = await all(env,
    `SELECT f.*, c.razao_social cliente, k.codigo contrato FROM faturas f JOIN clientes c ON c.id=f.cliente_id JOIN contratos k ON k.id=f.contrato_id
     WHERE ${where.join(' AND ')} ORDER BY f.vencimento, f.numero LIMIT 1000`, ...b);
  rows.forEach((f) => (f.situacao = situacao(f, hoje)));
  return json(rows);
}
function situacao(f, hoje = hojeBR()) {
  if (f.status === 'paga') return 'paga';
  if (f.status === 'cancelada') return 'cancelada';
  return f.vencimento < hoje ? 'vencida' : 'a_vencer';
}
const diasAtraso = (venc, hoje = hojeBR()) => Math.max(0, Math.round((Date.parse(hoje) - Date.parse(venc)) / 86400000));

async function faturaCompleta(env, id, org) {
  const f = await one(env,
    `SELECT f.*, c.razao_social cliente, c.cnpj cliente_cnpj, c.email_financeiro, c.endereco, c.cidade, c.uf, c.cep, k.codigo contrato, k.objeto
     FROM faturas f JOIN clientes c ON c.id=f.cliente_id JOIN contratos k ON k.id=f.contrato_id WHERE f.id=? AND f.org_id=?`, id, org);
  if (!f) fail('Fatura não encontrada.', 404);
  f.situacao = situacao(f);
  f.org = await one(env, 'SELECT nome,cnpj,email,pix_chave,pix_nome,pix_cidade,instrucoes_pagamento FROM orgs WHERE id=?', org);
  return f;
}

async function gerarCompetencia({ env, user, body }) {
  podeFinanceiro(user);
  const comp = body.competencia;
  if (!isComp(comp)) fail('Competência inválida (AAAA-MM).');
  const org = user.org_id;
  const contratos = await all(env,
    `SELECT k.* FROM contratos k WHERE k.org_id=? AND k.status='ativo' AND k.modalidade='mensal'
     AND substr(k.data_inicio,1,7) <= ? AND (k.data_fim IS NULL OR k.data_fim='' OR substr(k.data_fim,1,7) >= ?)
     AND NOT EXISTS (SELECT 1 FROM faturas f WHERE f.contrato_id=k.id AND f.competencia=? AND f.status!='cancelada')`, org, comp, comp, comp);
  const [y, m] = comp.split('-');
  const ids = [];
  for (const k of contratos) {
    const id = await insert(env, 'faturas', {
      org_id: org, contrato_id: k.id, cliente_id: k.cliente_id, numero: await proximoNumeroFatura(env, org),
      competencia: comp, descricao: `${k.objeto} · competência ${m}/${y}`, valor: k.valor,
      vencimento: vencNaCompetencia(comp, k.dia_vencimento), status: 'aberta',
    });
    ids.push(id);
  }
  await log(env, user, 'faturamento.gerado', comp, { n: ids.length });
  return json({ geradas: ids.length, ids });
}

async function faturaAvulsa({ env, user, body }) {
  podeFinanceiro(user);
  const k = await one(env, 'SELECT * FROM contratos WHERE id=? AND org_id=?', Number(body.contrato_id), user.org_id);
  if (!k) fail('Selecione o contrato.');
  if (!(Number(body.valor) > 0) || !isDate(body.vencimento)) fail('Informe valor e vencimento.');
  const id = await insert(env, 'faturas', {
    org_id: user.org_id, contrato_id: k.id, cliente_id: k.cliente_id, numero: await proximoNumeroFatura(env, user.org_id),
    competencia: isComp(body.competencia) ? body.competencia : body.vencimento.slice(0, 7),
    descricao: body.descricao || k.objeto, valor: r2(body.valor), vencimento: body.vencimento, status: 'aberta',
  });
  return json({ id });
}

async function editarFatura({ env, user, body }, id) {
  podeFinanceiro(user);
  const f = await faturaCompleta(env, id, user.org_id);
  if (f.status !== 'aberta') fail('Só é possível editar faturas em aberto.');
  const d = pick(body, ['descricao', 'linha_digitavel', 'boleto_url']);
  if (body.valor !== undefined || body.vencimento !== undefined) {
    if (f.boleto_provider === 'asaas') fail('Esta fatura tem boleto registrado. Cancele e gere outra para alterar valor ou vencimento.');
    if (body.valor !== undefined) d.valor = r2(body.valor);
    if (body.vencimento !== undefined) { if (!isDate(body.vencimento)) fail('Vencimento inválido.'); d.vencimento = body.vencimento; }
    d.pix_copia_cola = null; d.emitida_em = null;
  }
  if (d.linha_digitavel || d.boleto_url) { d.boleto_provider = 'manual'; d.emitida_em = d.emitida_em ?? new Date().toISOString(); }
  await update(env, 'faturas', id, user.org_id, d);
  return json({ ok: true });
}

async function emitirFatura({ env, user, body }, id) {
  podeFinanceiro(user);
  const org = user.org_id;
  const f = await faturaCompleta(env, id, org);
  if (f.status !== 'aberta') fail('A fatura não está em aberto.');
  const d = {};
  if (f.org.pix_chave) {
    d.pix_copia_cola = pixCopiaCola({ chave: f.org.pix_chave, nome: f.org.pix_nome || f.org.nome, cidade: f.org.pix_cidade, valor: f.valor, txid: f.numero.replace(/-/g, ''), descricao: f.numero });
  }
  const querBoleto = body.boleto !== false;
  if (querBoleto && asaasAtivo(env) && !f.boleto_id) {
    const cli = await one(env, 'SELECT * FROM clientes WHERE id=?', f.cliente_id);
    const customerId = await garantirCliente(env, cli);
    if (customerId !== cli.asaas_customer_id) await run(env, 'UPDATE clientes SET asaas_customer_id=? WHERE id=?', customerId, cli.id);
    const b = await emitirBoleto(env, { customerId, fatura: f, descricao: `${f.numero} · ${f.descricao || f.objeto}` });
    Object.assign(d, { boleto_provider: 'asaas', boleto_id: b.id, boleto_url: b.url, linha_digitavel: b.linha });
  }
  if (!d.pix_copia_cola && !d.boleto_id && !f.boleto_url && !f.linha_digitavel) {
    fail('Nada para emitir: cadastre a chave PIX em Configurações ou ative a integração de boletos (Asaas).');
  }
  d.emitida_em = new Date().toISOString();
  await update(env, 'faturas', id, org, d);
  await log(env, user, 'fatura.emitida', id, { boleto: !!d.boleto_id });
  return json(await faturaCompleta(env, id, org));
}

async function enviarFatura({ env, user, origin, body }, id) {
  podeFinanceiro(user);
  const f = await faturaCompleta(env, id, user.org_id);
  const to = body.email || f.email_financeiro;
  if (!to) fail('O cliente não tem e-mail financeiro cadastrado.');
  if (!f.emitida_em) fail('Emita a cobrança antes de enviar.');
  const linhas = [
    `<p>Olá, segue a cobrança referente a <b>${esc(f.descricao || f.objeto)}</b>.</p>`,
    `<table cellpadding="6" style="border-collapse:collapse;font-size:14px;margin:12px 0">
      <tr><td style="color:#64748B">Fatura</td><td><b>${esc(f.numero)}</b></td></tr>
      <tr><td style="color:#64748B">Contrato</td><td>${esc(f.contrato)}</td></tr>
      <tr><td style="color:#64748B">Valor</td><td><b>${brl(f.valor)}</b></td></tr>
      <tr><td style="color:#64748B">Vencimento</td><td><b>${dataBR(f.vencimento)}</b></td></tr></table>`,
  ];
  if (f.boleto_url) linhas.push(botao(f.boleto_url, 'Abrir boleto'));
  if (f.linha_digitavel) linhas.push(`<p style="font-size:13px;color:#64748B">Linha digitável:<br><span style="font-family:monospace;color:#1A1F2B">${esc(f.linha_digitavel)}</span></p>`);
  if (f.pix_copia_cola) linhas.push(`<p style="font-size:13px;color:#64748B">PIX copia e cola:<br><span style="font-family:monospace;font-size:11px;color:#1A1F2B;word-break:break-all">${esc(f.pix_copia_cola)}</span></p>`);
  if (f.org.instrucoes_pagamento) linhas.push(`<p style="font-size:13px">${esc(f.org.instrucoes_pagamento)}</p>`);
  const r = await enviarEmail(env, { to, subject: `${f.org.nome} · Fatura ${f.numero} · vencimento ${dataBR(f.vencimento)}`, html: layout(`Fatura ${f.numero}`, linhas.join('')), replyTo: f.org.email });
  if (!r.ok) fail('Falha no envio: ' + r.error);
  await update(env, 'faturas', id, user.org_id, { enviada_em: new Date().toISOString() });
  await log(env, user, 'fatura.enviada', id, { to });
  return json({ ok: true });
}

async function baixarFatura({ env, user, body }, id) {
  podeFinanceiro(user);
  const f = await faturaCompleta(env, id, user.org_id);
  if (f.status !== 'aberta') fail('A fatura não está em aberto.');
  const pago_em = isDate(body.pago_em) ? body.pago_em : hojeBR();
  const valor_pago = body.valor_pago !== undefined && body.valor_pago !== '' ? r2(body.valor_pago) : f.valor;
  await update(env, 'faturas', id, user.org_id, {
    status: 'paga', pago_em, valor_pago, forma_pagamento: body.forma_pagamento || 'PIX', obs_baixa: body.obs_baixa || null,
  });
  await log(env, user, 'fatura.baixada', id, { pago_em, valor_pago });
  return json({ ok: true });
}
async function estornarFatura({ env, user }, id) {
  podeFinanceiro(user);
  const f = await faturaCompleta(env, id, user.org_id);
  if (f.status !== 'paga') fail('A fatura não está paga.');
  await update(env, 'faturas', id, user.org_id, { status: 'aberta', pago_em: null, valor_pago: null, forma_pagamento: null, obs_baixa: null });
  await log(env, user, 'fatura.estornada', id);
  return json({ ok: true });
}
async function cancelarFatura({ env, user, body }, id) {
  podeFinanceiro(user);
  const f = await faturaCompleta(env, id, user.org_id);
  if (f.status !== 'aberta') fail('Só é possível cancelar faturas em aberto.');
  if (f.boleto_provider === 'asaas' && f.boleto_id && asaasAtivo(env)) {
    try { await cancelarBoleto(env, f.boleto_id); } catch (e) { fail('Não foi possível cancelar o boleto no Asaas: ' + e.message); }
  }
  await update(env, 'faturas', id, user.org_id, { status: 'cancelada', obs_baixa: body.motivo || null });
  await log(env, user, 'fatura.cancelada', id, { motivo: body.motivo });
  return json({ ok: true });
}

async function webhookAsaas({ env, request, body }) {
  if (!env.ASAAS_WEBHOOK_TOKEN || request.headers.get('asaas-access-token') !== env.ASAAS_WEBHOOK_TOKEN) return err('unauthorized', 401);
  const ev = body.event; const p = body.payment || {};
  const f = p.id ? await one(env, "SELECT * FROM faturas WHERE boleto_provider='asaas' AND boleto_id=?", p.id) : null;
  if (!f) return json({ ok: true, ignored: true });
  if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED_IN_CASH'].includes(ev) && f.status === 'aberta') {
    await run(env, "UPDATE faturas SET status='paga', pago_em=?, valor_pago=?, forma_pagamento=?, obs_baixa='Baixa automática Asaas' WHERE id=?",
      (p.paymentDate || p.clientPaymentDate || hojeBR()).slice(0, 10), r2(p.value ?? f.valor), p.billingType === 'PIX' ? 'PIX' : 'Boleto', f.id);
    await log(env, null, 'fatura.baixada.webhook', f.id, { ev });
  }
  if (ev === 'PAYMENT_REFUNDED' && f.status === 'paga') {
    await run(env, "UPDATE faturas SET status='aberta', pago_em=NULL, valor_pago=NULL, obs_baixa='Estorno Asaas' WHERE id=?", f.id);
  }
  return json({ ok: true });
}

// ---------------------------------------------------------------- relatórios
function periodo(q) {
  const hoje = hojeBR().slice(0, 7);
  const ate = isComp(q.ate) ? q.ate : hoje;
  let de = isComp(q.de) ? q.de : null;
  if (!de) { const [y, m] = ate.split('-').map(Number); const d = new Date(Date.UTC(y, m - 12, 1)); de = d.toISOString().slice(0, 7); }
  if (de > ate) fail('Período inválido.');
  return { de, ate, meses: mesesEntre(de, ate) };
}
const filtroAtivos = (q) => (q.ativos === '0' ? '' : " AND c.status='ativo'");

function matriz(rows, meses, campoMes, campoValor) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.cliente_id)) map.set(r.cliente_id, { cliente_id: r.cliente_id, cliente: r.cliente, status: r.cliente_status, meses: Object.fromEntries(meses.map((m) => [m, 0])), total: 0 });
    const o = map.get(r.cliente_id);
    if (o.meses[r[campoMes]] !== undefined) { o.meses[r[campoMes]] = r2(o.meses[r[campoMes]] + r[campoValor]); o.total = r2(o.total + r[campoValor]); }
  }
  const linhas = [...map.values()].sort((a, b) => a.cliente.localeCompare(b.cliente));
  const totais = Object.fromEntries(meses.map((m) => [m, r2(linhas.reduce((s, l) => s + l.meses[m], 0))]));
  return { linhas, totais, total: r2(linhas.reduce((s, l) => s + l.total, 0)) };
}

async function relFaturamento({ env, user, q }) {
  const p = periodo(q);
  const rows = await all(env,
    `SELECT f.cliente_id, c.razao_social cliente, c.status cliente_status, f.competencia, SUM(f.valor) valor
     FROM faturas f JOIN clientes c ON c.id=f.cliente_id
     WHERE f.org_id=? AND f.status!='cancelada' AND f.competencia BETWEEN ? AND ? ${filtroAtivos(q)}
     GROUP BY f.cliente_id, f.competencia`, user.org_id, p.de, p.ate);
  return json({ ...p, ...matriz(rows, p.meses, 'competencia', 'valor') });
}

async function relRecebimento({ env, user, q }) {
  const p = periodo(q); const hoje = hojeBR();
  const rows = await all(env,
    `SELECT f.cliente_id, c.razao_social cliente, c.status cliente_status, substr(f.pago_em,1,7) mes, SUM(f.valor_pago) valor
     FROM faturas f JOIN clientes c ON c.id=f.cliente_id
     WHERE f.org_id=? AND f.status='paga' AND substr(f.pago_em,1,7) BETWEEN ? AND ? ${filtroAtivos(q)}
     GROUP BY f.cliente_id, mes`, user.org_id, p.de, p.ate);
  // Indicadores por mês de vencimento: previsto, recebido, em atraso, inadimplência %
  const venc = await all(env,
    `SELECT substr(f.vencimento,1,7) mes,
      SUM(f.valor) previsto,
      SUM(CASE WHEN f.status='paga' THEN f.valor ELSE 0 END) liquidado,
      SUM(CASE WHEN f.status='paga' AND f.pago_em <= f.vencimento THEN f.valor ELSE 0 END) em_dia,
      SUM(CASE WHEN f.status='aberta' AND f.vencimento < ? THEN f.valor ELSE 0 END) em_atraso
     FROM faturas f JOIN clientes c ON c.id=f.cliente_id
     WHERE f.org_id=? AND f.status!='cancelada' AND substr(f.vencimento,1,7) BETWEEN ? AND ? ${filtroAtivos(q)}
     GROUP BY mes`, hoje, user.org_id, p.de, p.ate);
  const indicadores = p.meses.map((m) => {
    const v = venc.find((x) => x.mes === m) || { previsto: 0, liquidado: 0, em_dia: 0, em_atraso: 0 };
    const vencidoAteHoje = m <= hoje.slice(0, 7);
    return {
      mes: m, previsto: r2(v.previsto), liquidado: r2(v.liquidado), em_dia: r2(v.em_dia), em_atraso: r2(v.em_atraso),
      inadimplencia: vencidoAteHoje && v.previsto ? r2((v.em_atraso / v.previsto) * 100) : null,
    };
  });
  return json({ ...p, ...matriz(rows, p.meses, 'mes', 'valor'), indicadores });
}

async function relInadimplencia({ env, user, q }) {
  const hoje = hojeBR();
  const rows = await all(env,
    `SELECT f.id, f.numero, f.valor, f.vencimento, f.competencia, f.descricao, f.enviada_em, f.cliente_id, c.razao_social cliente, c.status cliente_status,
      c.email_financeiro, c.telefone, k.codigo contrato
     FROM faturas f JOIN clientes c ON c.id=f.cliente_id JOIN contratos k ON k.id=f.contrato_id
     WHERE f.org_id=? AND f.status='aberta' AND f.vencimento < ? ${filtroAtivos(q)} ORDER BY f.vencimento`, user.org_id, hoje);
  const porCliente = new Map();
  const faixas = { '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const f of rows) {
    f.dias = diasAtraso(f.vencimento, hoje);
    const fx = f.dias <= 30 ? '1-30' : f.dias <= 60 ? '31-60' : f.dias <= 90 ? '61-90' : '90+';
    f.faixa = fx; faixas[fx] = r2(faixas[fx] + f.valor);
    if (!porCliente.has(f.cliente_id)) porCliente.set(f.cliente_id, { cliente_id: f.cliente_id, cliente: f.cliente, status: f.cliente_status, email: f.email_financeiro, telefone: f.telefone, faturas: 0, valor: 0, maiorAtraso: 0, faixas: { '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } });
    const c = porCliente.get(f.cliente_id);
    c.faturas++; c.valor = r2(c.valor + f.valor); c.maiorAtraso = Math.max(c.maiorAtraso, f.dias); c.faixas[fx] = r2(c.faixas[fx] + f.valor);
  }
  const aVencer = await one(env, "SELECT COALESCE(SUM(f.valor),0) v FROM faturas f JOIN clientes c ON c.id=f.cliente_id WHERE f.org_id=? AND f.status='aberta' AND f.vencimento >= ?" + filtroAtivos(q), user.org_id, hoje);
  const total = r2(rows.reduce((s, f) => s + f.valor, 0));
  return json({ hoje, total, aVencer: aVencer.v, faixas, clientes: [...porCliente.values()].sort((a, b) => b.valor - a.valor), faturas: rows });
}

async function relClientes({ env, user, q }) {
  const hoje = hojeBR();
  const where = q.status ? ' AND c.status = ?' : '';
  const b = [hoje, hoje, user.org_id]; if (q.status) b.push(q.status);
  const rows = await all(env,
    `SELECT c.id, c.razao_social, c.nome_fantasia, c.cnpj, c.status, c.cidade, c.uf, c.sponsor_nome, c.email_financeiro, c.created_at,
      (SELECT COUNT(*) FROM contratos k WHERE k.cliente_id=c.id AND k.status='ativo') contratos_ativos,
      (SELECT COALESCE(SUM(valor),0) FROM contratos k WHERE k.cliente_id=c.id AND k.status='ativo' AND k.modalidade='mensal') recorrencia,
      (SELECT COALESCE(SUM(valor),0) FROM faturas f WHERE f.cliente_id=c.id AND f.status!='cancelada') faturado,
      (SELECT COALESCE(SUM(valor_pago),0) FROM faturas f WHERE f.cliente_id=c.id AND f.status='paga') recebido,
      (SELECT COALESCE(SUM(valor),0) FROM faturas f WHERE f.cliente_id=c.id AND f.status='aberta' AND f.vencimento >= ?) a_vencer,
      (SELECT COALESCE(SUM(valor),0) FROM faturas f WHERE f.cliente_id=c.id AND f.status='aberta' AND f.vencimento < ?) vencido,
      (SELECT MAX(pago_em) FROM faturas f WHERE f.cliente_id=c.id AND f.status='paga') ultimo_pagamento,
      (SELECT COUNT(*) FROM projetos p WHERE p.cliente_id=c.id) projetos
     FROM clientes c WHERE c.org_id=? ${where} ORDER BY c.status, c.razao_social`, ...b);
  const tot = (k) => r2(rows.reduce((s, r) => s + (r[k] || 0), 0));
  return json({ hoje, clientes: rows, totais: { recorrencia: tot('recorrencia'), faturado: tot('faturado'), recebido: tot('recebido'), a_vencer: tot('a_vencer'), vencido: tot('vencido') } });
}

// ---------------------------------------------------------------- assessments
async function listarProjetos({ env, user, q }) {
  const where = ['p.org_id = ?']; const b = [user.org_id];
  if (q.contrato_id) { where.push('p.contrato_id = ?'); b.push(Number(q.contrato_id)); }
  if (q.cliente_id) { where.push('p.cliente_id = ?'); b.push(Number(q.cliente_id)); }
  if (q.status) { where.push('p.status = ?'); b.push(q.status); }
  return json(await all(env,
    `SELECT p.*, c.razao_social cliente, k.codigo contrato,
      (SELECT COUNT(*) FROM respostas r JOIN campanhas x ON x.id=r.campanha_id WHERE x.projeto_id=p.id) respostas
     FROM projetos p JOIN clientes c ON c.id=p.cliente_id JOIN contratos k ON k.id=p.contrato_id
     WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC`, ...b));
}

async function criarProjeto(ctx) {
  const { env, user, body } = ctx;
  const k = await one(env, 'SELECT k.*, c.razao_social, c.nome_fantasia, c.sponsor_nome csn, c.sponsor_email cse, s.produto servico_produto, s.nome servico_nome FROM contratos k JOIN clientes c ON c.id=k.cliente_id LEFT JOIN servicos s ON s.id=k.servico_id WHERE k.id=? AND k.org_id=?', Number(body.contrato_id), user.org_id);
  if (!k) fail('Contrato não encontrado.');
  if (k.status !== 'ativo') fail('O contrato precisa estar ativo para enviar assessments.');
  // Só o diagnóstico vinculado ao serviço contratado pode ser enviado
  if (!k.servico_produto) fail(`O serviço contratado${k.servico_nome ? ` (${k.servico_nome})` : ''} não inclui diagnóstico.`);
  if (body.produto && body.produto !== k.servico_produto) fail('Este diagnóstico não faz parte do serviço contratado.');
  body.produto = k.servico_produto;
  const prod = PRODUTOS[body.produto];
  if (!prod) fail('Selecione o diagnóstico.');
  if (prod.instrumentos.some((i) => INSTRUMENTS[i].emConstrucao)) fail(`${prod.nome} ainda está em construção: o questionário não foi carregado na plataforma.`);
  const sponsor_nome = (body.sponsor_nome || k.sponsor_nome || k.csn || '').trim();
  const sponsor_email = (body.sponsor_email || k.sponsor_email || k.cse || '').trim().toLowerCase();
  if (!sponsor_nome || !/^\S+@\S+\.\S+$/.test(sponsor_email)) fail('Informe nome e e-mail do sponsor responsável no cliente.');
  const empresa = k.nome_fantasia || k.razao_social;
  const id = await insert(env, 'projetos', {
    org_id: user.org_id, contrato_id: k.id, cliente_id: k.cliente_id, produto: body.produto,
    titulo: (body.titulo || `${prod.nome} · ${empresa}`).trim(), unidade: body.unidade || null,
    sponsor_nome, sponsor_email, sponsor_token: token(22), prazo: isDate(body.prazo) ? body.prazo : null, status: 'aberto',
  });
  for (const inst of prod.instrumentos) {
    await insert(env, 'campanhas', { projeto_id: id, org_id: user.org_id, instrumento: inst, token: token(18), meta_respostas: Number(body[`meta_${inst}`]) || null });
  }
  await log(env, user, 'projeto.criado', id, { produto: body.produto });
  let envio = null;
  if (body.enviar) envio = await enviarProjetoInterno(ctx, id);
  return json({ id, envio });
}

async function projetoCompleto(env, id, org) {
  const p = await one(env, `SELECT p.*, c.razao_social cliente, c.nome_fantasia, k.codigo contrato FROM projetos p JOIN clientes c ON c.id=p.cliente_id JOIN contratos k ON k.id=p.contrato_id WHERE p.id=? AND p.org_id=?`, id, org);
  if (!p) fail('Projeto não encontrado.', 404);
  p.campanhas = await all(env, `SELECT c.*, (SELECT COUNT(*) FROM respostas r WHERE r.campanha_id=c.id) respostas, (SELECT MAX(created_at) FROM respostas r WHERE r.campanha_id=c.id) ultima FROM campanhas c WHERE c.projeto_id=? ORDER BY c.id`, id);
  p.campanhas.forEach((c) => { c.nome = INSTRUMENTS[c.instrumento].nome; c.audience = INSTRUMENTS[c.instrumento].audience || null; });
  return p;
}
async function detalheProjeto({ env, user, origin }, id) {
  const p = await projetoCompleto(env, id, user.org_id);
  p.sponsor_url = `${origin}/s/${p.sponsor_token}`;
  p.campanhas.forEach((c) => (c.url = `${origin}/a/${c.token}`));
  return json(p);
}

async function enviarProjetoInterno({ env, user, origin }, id) {
  const p = await projetoCompleto(env, id, user.org_id);
  const org = await one(env, 'SELECT nome,email FROM orgs WHERE id=?', user.org_id);
  const empresa = p.nome_fantasia || p.cliente;
  const sponsorUrl = `${origin}/s/${p.sponsor_token}`;
  const lista = p.campanhas.map((c) => `<li style="margin-bottom:6px"><b>${esc(c.nome)}</b>${c.audience ? ` · ${esc(c.audience)}` : ''}<br><a href="${origin}/a/${c.token}" style="color:#0E9F8E">${origin}/a/${c.token}</a></li>`).join('');
  const html = layout(`${esc(p.titulo)}`, `
    <p>Olá, ${esc(p.sponsor_nome.split(' ')[0])}.</p>
    <p>Você é o sponsor do <b>${esc(PRODUTOS[p.produto].nome)}</b> da <b>${esc(empresa)}</b>. Preparamos uma página com os QR Codes e links de acesso para você distribuir aos participantes.</p>
    ${botao(sponsorUrl, 'Abrir QR Codes para divulgação')}
    <p style="font-size:13px;color:#64748B">Na página você pode imprimir os QR Codes, copiar os links e acompanhar quantas respostas já chegaram.</p>
    <p style="font-size:13px;margin-top:20px">Links diretos:</p><ul style="font-size:13px;padding-left:18px">${lista}</ul>
    ${p.prazo ? `<p style="font-size:13px">Prazo para respostas: <b>${dataBR(p.prazo)}</b>.</p>` : ''}
    ${p.produto === 'nr1' ? '<p style="font-size:13px;color:#64748B">O Formulário A é destinado a gestores, SST e RH. O Formulário B é para todos os colaboradores e é 100% anônimo.</p>' : ''}
  `);
  const r = await enviarEmail(env, { to: p.sponsor_email, subject: `${org.nome} · ${PRODUTOS[p.produto].nome} · links para os participantes`, html, replyTo: org.email || user.email });
  if (r.ok) await run(env, "UPDATE projetos SET enviado_em=datetime('now') WHERE id=?", id);
  await log(env, user, 'projeto.enviado', id, r);
  return r;
}
async function enviarProjeto(ctx, id) {
  const r = await enviarProjetoInterno(ctx, id);
  if (!r.ok) fail('Falha no envio: ' + r.error);
  return json({ ok: true });
}

async function respostasDo(env, campanhaId) {
  return (await all(env, 'SELECT perfil, respostas, created_at FROM respostas WHERE campanha_id=? ORDER BY id', campanhaId))
    .map((r) => ({ perfil: JSON.parse(r.perfil || '{}'), respostas: JSON.parse(r.respostas || '{}'), created_at: r.created_at }));
}

function distribuicoes(inst, lista) {
  const out = [];
  const campos = [...inst.profile, ...inst.sections.flatMap((s) => s.items)].filter((i) => i.type === 'choice');
  for (const c of campos) {
    const cont = {};
    for (const r of lista) { const v = r.perfil[c.id] ?? r.respostas[c.id]; if (v) cont[v] = (cont[v] || 0) + 1; }
    out.push({ id: c.id, text: c.text, options: c.options.map((o) => ({ label: o, n: cont[o] || 0 })) });
  }
  return out;
}
function abertas(inst, lista) {
  const campos = [...inst.profile, ...inst.sections.flatMap((s) => s.items)].filter((i) => (i.type === 'text' || i.type === 'textarea') && i.id !== 'nome');
  return campos.map((c) => ({ id: c.id, text: c.text, respostas: lista.map((r) => r.perfil[c.id] ?? r.respostas[c.id]).filter((v) => v && String(v).trim().length > 1) }));
}

async function resultadoProjeto({ env, user }, id) {
  const p = await projetoCompleto(env, id, user.org_id);
  const dados = {};
  for (const c of p.campanhas) dados[c.instrumento] = await respostasDo(env, c.id);
  const out = { projeto: { id: p.id, titulo: p.titulo, produto: p.produto, cliente: p.cliente, unidade: p.unidade, status: p.status }, campanhas: {} };
  for (const c of p.campanhas) {
    const inst = INSTRUMENTS[c.instrumento]; const lista = dados[c.instrumento];
    out.campanhas[c.instrumento] = {
      nome: inst.nome, n: lista.length,
      distribuicoes: distribuicoes(inst, lista), abertas: abertas(inst, lista),
      respondentes: inst.anonimo ? null : lista.map((r) => ({ nome: r.perfil.nome, email: r.perfil.email, em: r.created_at })),
    };
  }
  if (p.produto === 'org') out.resultado = resultadoOrg(dados.org.map((r) => r.respostas));
  if (p.produto === 'nr1') out.resultado = resultadoNR1((dados.nr1_lid || []).map((r) => r.respostas), (dados.nr1_col || []).map((r) => r.respostas));
  return json(out);
}

async function exportarCsv({ env, user, q }, id) {
  const p = await projetoCompleto(env, id, user.org_id);
  const camp = p.campanhas.find((c) => c.instrumento === q.instrumento) || p.campanhas[0];
  const inst = INSTRUMENTS[camp.instrumento];
  const lista = await respostasDo(env, camp.id);
  const cols = [...inst.profile, ...inst.sections.flatMap((s) => s.items)];
  const cell = (v) => { const s = String(v ?? '').replace(/\r?\n/g, ' '); return /[;"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const linhas = [['Data/hora', ...cols.map((c) => c.text)].map(cell).join(';')];
  for (const r of lista) linhas.push([r.created_at, ...cols.map((c) => r.perfil[c.id] ?? r.respostas[c.id] ?? '')].map(cell).join(';'));
  const nome = `${p.cliente}-${camp.instrumento}`.normalize('NFD').replace(/[^\w-]+/g, '_');
  return new Response('﻿' + linhas.join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nome}.csv"` } });
}

// ---------------------------------------------------------------- páginas públicas
async function campanhaPorToken(env, t) {
  return one(env,
    `SELECT k.*, p.status projeto_status, p.prazo, p.unidade, p.titulo, c.razao_social, c.nome_fantasia, o.nome org_nome
     FROM campanhas k JOIN projetos p ON p.id=k.projeto_id JOIN clientes c ON c.id=p.cliente_id JOIN orgs o ON o.id=k.org_id WHERE k.token=?`, t);
}
async function publicCampanha({ env }, t) {
  const k = await campanhaPorToken(env, t);
  if (!k) fail('Link inválido.', 404);
  const inst = INSTRUMENTS[k.instrumento];
  const encerrado = k.projeto_status !== 'aberto' || (k.prazo && k.prazo < hojeBR());
  return json({ empresa: k.nome_fantasia || k.razao_social, unidade: k.unidade, org: k.org_nome, encerrado, instrumento: inst });
}
async function publicSubmit({ env, body, request }, t) {
  const k = await campanhaPorToken(env, t);
  if (!k) fail('Link inválido.', 404);
  if (k.projeto_status !== 'aberto' || (k.prazo && k.prazo < hojeBR())) fail('Esta pesquisa foi encerrada.', 410);
  const inst = INSTRUMENTS[k.instrumento];
  const perfil = {}; const respostas = {};
  for (const f of inst.profile) {
    const v = String(body.perfil?.[f.id] ?? '').trim().slice(0, 300);
    if (f.required && !v) fail(`Responda: ${f.text}`);
    if (f.type === 'choice' && v && !f.options.includes(v)) fail(`Opção inválida em: ${f.text}`);
    if (v) perfil[f.id] = v;
  }
  for (const s of inst.sections) for (const it of s.items) {
    let v = body.respostas?.[it.id];
    v = v === undefined || v === null ? '' : String(v).trim();
    if (it.type === 'scale') {
      if (v === 'NA' && it.allowNA) { respostas[it.id] = 'NA'; continue; }
      const n = Number(v);
      if (!v) { if (it.required) fail(`Responda: ${it.text}`); continue; }
      if (!Number.isInteger(n) || n < inst.scale.min || n > inst.scale.max) fail(`Valor inválido em: ${it.text}`);
      respostas[it.id] = n;
    } else {
      if (it.required && !v) fail(`Responda: ${it.text}`);
      if (it.type === 'choice' && v && !it.options.includes(v)) fail(`Opção inválida em: ${it.text}`);
      if (v) respostas[it.id] = v.slice(0, 4000);
    }
  }
  await insert(env, 'respostas', { campanha_id: k.id, perfil: JSON.stringify(perfil), respostas: JSON.stringify(respostas) });
  return json({ ok: true });
}
async function publicSponsor({ env, origin }, t) {
  const p = await one(env, `SELECT p.*, c.razao_social, c.nome_fantasia, o.nome org_nome FROM projetos p JOIN clientes c ON c.id=p.cliente_id JOIN orgs o ON o.id=p.org_id WHERE p.sponsor_token=?`, t);
  if (!p) fail('Link inválido.', 404);
  const camps = await all(env, 'SELECT c.instrumento, c.token, c.meta_respostas, (SELECT COUNT(*) FROM respostas r WHERE r.campanha_id=c.id) respostas FROM campanhas c WHERE c.projeto_id=? ORDER BY c.id', p.id);
  return json({
    titulo: p.titulo, produto: PRODUTOS[p.produto].nome, empresa: p.nome_fantasia || p.razao_social, unidade: p.unidade, org: p.org_nome,
    sponsor: p.sponsor_nome, prazo: p.prazo, status: p.status,
    campanhas: camps.map((c) => ({ nome: INSTRUMENTS[c.instrumento].nome, publico: INSTRUMENTS[c.instrumento].audience || 'Participantes', anonimo: INSTRUMENTS[c.instrumento].anonimo, url: `${origin}/a/${c.token}`, respostas: c.respostas, meta: c.meta_respostas })),
  });
}

// ---------------------------------------------------------------- motor do Diagnóstico Organizacional
async function contextoDiagnostico(env, id, org) {
  const p = await projetoCompleto(env, id, org);
  if (p.produto !== 'org') fail('O motor de geração se aplica ao Diagnóstico Organizacional.');
  const camp = p.campanhas.find((c) => c.instrumento === 'org');
  const respostas = await respostasDo(env, camp.id);
  if (!respostas.length) fail('Ainda não há respostas para gerar o diagnóstico.');
  const base = calcularBase({ empresa: p.nome_fantasia || p.cliente, unidade: p.unidade, respostas });
  base.razao_social = p.cliente;
  return { p, base };
}
async function proximaVersao(env, org) {
  const ano = hojeBR().slice(0, 4);
  const r = await one(env, "SELECT COUNT(*) n FROM diagnosticos WHERE org_id=? AND substr(gerado_em,1,4)=?", org, ano);
  return `${ano}.${(r?.n || 0) + 1}`;
}
async function gravarDiagnostico(env, user, id, { conteudo, base, fonte, modelo }) {
  const atual = await one(env, 'SELECT id, versao FROM diagnosticos WHERE projeto_id=?', id);
  const dados = { conteudo: JSON.stringify(conteudo), base: JSON.stringify(base), fonte, modelo: modelo || null, n_respostas: base.n, gerado_por: user.id };
  if (atual) {
    await run(env, "UPDATE diagnosticos SET conteudo=?, base=?, fonte=?, modelo=?, n_respostas=?, gerado_por=?, gerado_em=datetime('now'), editado_em=NULL WHERE id=?",
      dados.conteudo, dados.base, fonte, dados.modelo, base.n, user.id, atual.id);
  } else {
    await insert(env, 'diagnosticos', { projeto_id: id, org_id: user.org_id, versao: await proximaVersao(env, user.org_id), ...dados });
  }
  await log(env, user, 'diagnostico.gerado', id, { fonte, n: base.n });
}

async function verDiagnostico({ env, user }, id) {
  const p = await projetoCompleto(env, id, user.org_id);
  const d = await one(env, 'SELECT * FROM diagnosticos WHERE projeto_id=? AND org_id=?', id, user.org_id);
  const camp = p.campanhas.find((c) => c.instrumento === 'org');
  return json({
    projeto: { id: p.id, produto: p.produto, cliente: p.cliente, empresa: p.nome_fantasia || p.cliente, unidade: p.unidade, contrato: p.contrato },
    respostasAtuais: camp?.respostas || 0,
    ia: !!env.GEMINI_API_KEY,
    pilaresDef: PILARES.map((x) => ({ nome: x.nome, questoes: x.itens, indicativo: !!x.indicativo })),
    diagnostico: d ? { ...d, conteudo: JSON.parse(d.conteudo), base: JSON.parse(d.base || 'null') } : null,
  });
}

async function gerarDiagnostico({ env, user }, id) {
  if (!env.GEMINI_API_KEY) fail('A geração automática precisa da chave GEMINI_API_KEY. Use "Gerar via Claude" enquanto isso.');
  const { base } = await contextoDiagnostico(env, id, user.org_id);
  const { conteudo, modelo } = await gerarComGemini(env, montarPrompt(base));
  await gravarDiagnostico(env, user, id, { conteudo, base, fonte: 'gemini', modelo });
  return json({ ok: true });
}

async function promptDiagnostico({ env, user }, id) {
  const { base } = await contextoDiagnostico(env, id, user.org_id);
  return json({ prompt: montarPrompt(base), n: base.n });
}

async function importarDiagnostico({ env, user, body }, id) {
  const { base } = await contextoDiagnostico(env, id, user.org_id);
  let conteudo;
  try { conteudo = normalizar(body.texto); } catch (e) { fail('Não consegui ler o resultado colado: ' + e.message); }
  await gravarDiagnostico(env, user, id, { conteudo, base, fonte: 'manual', modelo: 'colado' });
  return json({ ok: true });
}

async function salvarDiagnostico({ env, user, body }, id) {
  const d = await one(env, 'SELECT id FROM diagnosticos WHERE projeto_id=? AND org_id=?', id, user.org_id);
  if (!d) fail('Gere o diagnóstico antes de editar.');
  let conteudo;
  try { conteudo = normalizar(body.conteudo); } catch (e) { fail(e.message); }
  const versao = String(body.versao || '').trim().slice(0, 20) || null;
  await run(env, "UPDATE diagnosticos SET conteudo=?, versao=COALESCE(?, versao), editado_em=datetime('now') WHERE id=?", JSON.stringify(conteudo), versao, d.id);
  await log(env, user, 'diagnostico.editado', id);
  return json({ ok: true });
}
