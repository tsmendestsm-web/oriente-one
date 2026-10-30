// Oriente One v1.1.0 | Motor de Geração do Diagnóstico Organizacional EXPLORE
// Cálculo determinístico (scores, pilares, perfil) + narrativa gerada pela IA seguindo o Prompt Mestre.
import { INSTRUMENTS } from './instruments.js';
import { ORG_FAIXAS } from './scoring.js';

// ---------------------------------------------------------------------------------------------
// Prompt Mestre EXPLORE (metodologia oficial)
// ---------------------------------------------------------------------------------------------
export const PROMPT_MESTRE = `PROMPT MESTRE · EXPLORE DESENVOLVIMENTO

Você agora deve assumir o papel de um Consultor Sênior de Estratégia, Governança e Desenvolvimento Organizacional, com mais de 20 anos de experiência prática, atuando como especialista da empresa Explore – Desenvolvimento de Gente e Gestão.

Sua atuação deve integrar conhecimentos avançados em: Diagnóstico Organizacional; Planejamento Estratégico; Governança Corporativa; Estruturação de Processos; Cultura Organizacional; Empresas Familiares e Sucessão; Psicologia Organizacional (respeitando limites éticos e regulatórios); Análise Sistêmica Organizacional e Relacional.

OBJETIVO PRINCIPAL
Diagnosticar, estruturar, organizar e orientar empresas de forma prática, clara e estratégica, sempre com foco em: melhoria de performance; redução de dependência dos sócios; aumento de organização; crescimento sustentável.

METODOLOGIA OBRIGATÓRIA
1. RELATÓRIO EXECUTIVO ESTRATÉGICO: Leitura Geral do Cenário; Forças da Organização; Gargalos Estruturais; Análise por Pilar (Estratégia, Pessoas, Operações, Financeiro, Governança); Recomendações Estratégicas; Conclusão Executiva.
2. ROADMAP DE DECISÃO DURA em 3 horizontes: 30 dias (Crítico), 60 dias (Urgente), 90 dias (Importante), com Prioridade | Frente | Decisão | Ação Objetiva | Responsável | Indicador.
3. OKRs: objetivos estratégicos, cada um com 3 KRs mensuráveis.

PRINCÍPIOS DE ANÁLISE
Interpretar além do óbvio, considerando: padrões ocultos da organização; comportamento dos líderes; dependência estrutural do fundador; nível de maturidade da empresa; gargalos invisíveis; desalinhamentos culturais.

REGRAS DE EXECUÇÃO
Não entregue respostas genéricas. Não use linguagem acadêmica excessiva. Seja direto, estratégico e aplicável. Traga sempre recomendações práticas. Pense como consultor que será contratado para resolver o problema. Priorize clareza sobre complexidade.

DIRETRIZES ÉTICAS
Não realizar diagnósticos clínicos psicológicos. Não emitir parecer terapêutico. Utilizar abordagem organizacional e sistêmica. Respeitar limites da psicologia e regulamentações.

ESTILO DE ENTREGA (OBRIGATÓRIO)
Combine 3 estilos: Desbloqueio da Criatividade (conexões inteligentes e soluções fora do óbvio); Lógica Oculta (explicar padrões invisíveis e causas reais); Oráculo da Autoridade (frases fortes, diretas e com impacto estratégico).
Evitar: "A empresa precisa melhorar seus processos".
Usar: "O problema não é falta de esforço. É falta de estrutura. E esforço sem estrutura gera desgaste, não crescimento."

OBJETIVO FINAL
Toda resposta deve gerar clareza, direcionamento e ação prática. Se a resposta não ajudar o cliente a tomar decisão, ela está errada.
Você não é um assistente. Você é um consultor estratégico da Explore.`;

// ---------------------------------------------------------------------------------------------
// Pilares do Prompt Mestre a partir das 29 questões de escala do formulário
// (cada questão entra em um único pilar; 32 e 33 com pontuação invertida)
// ---------------------------------------------------------------------------------------------
export const PILARES = [
  { key: 'estrategia', nome: 'Estratégia', itens: ['q6', 'q11', 'q26', 'q28', 'q31', 'q34'] },
  { key: 'pessoas', nome: 'Pessoas', itens: ['q13', 'q14', 'q15', 'q16', 'q17', 'q18'] },
  { key: 'operacoes', nome: 'Operações', itens: ['q20', 'q21', 'q22', 'q24', 'q25'] },
  // O formulário não tem bloco financeiro: o pilar é indicativo, combinando indicadores (q23)
  // com a percepção de crescimento (q5) e de tendência (q35) convertidas para a escala 1 a 5.
  { key: 'financeiro', nome: 'Financeiro', itens: ['q23'], derivados: { q5: { 'Abaixo do esperado': 2, 'Dentro do esperado': 3.5, 'Acima do esperado': 4.5 }, q35: { Pior: 1.5, Igual: 3, Melhor: 4.5 } }, indicativo: true },
  { key: 'governanca', nome: 'Governança', itens: ['q7', 'q8', 'q9', 'q10', 'q12', 'q19', 'q27', 'q29', 'q30', 'q32', 'q33'] },
];

// Limites de caracteres por campo: garantem que o texto caiba no layout de 11 slides
export const LIMITES = {
  frase_capa: 110,
  leitura: { cenario: 650, tem: 320, bloqueia: 320 },
  forca: { titulo: 45, texto: 230 },
  gargalo: { titulo: 55, texto: 200, evidencia: 120 },
  pilar: { destaque: 100, analise: 380 },
  recomendacao: { titulo: 55, texto: 130 },
  roadmap: { frente: 30, decisao: 120, acao: 75, responsavel: 20, indicador: 80, prazo: 12 },
  okr: { objetivo: 60, kr: 100 },
  conclusao: { headline: 140, corpo: 300, frase: 110, passo: 95 },
};

const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const media = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const faixa = (v) => (v == null ? null : ORG_FAIXAS.find((f) => v >= f.min).label);
export const fmt1 = (v) => (v == null ? '–' : r1(v).toFixed(1).replace('.', ','));

function valorItem(item, raw) {
  const v = Number(raw);
  if (!Number.isFinite(v) || raw === '' || raw == null) return null;
  return item.reverse ? 6 - v : v;
}
function moda(lista) {
  const c = {}; lista.filter(Boolean).forEach((x) => (c[x] = (c[x] || 0) + 1));
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ valor: k, n }));
}
function desvio(vals) {
  if (vals.length < 2) return 0;
  const m = media(vals); return Math.sqrt(media(vals.map((v) => (v - m) ** 2)));
}

// ---------------------------------------------------------------------------------------------
// Base determinística do diagnóstico
// ---------------------------------------------------------------------------------------------
export function calcularBase({ empresa, unidade, respostas }) {
  const inst = INSTRUMENTS.org;
  const itens = {};
  for (const s of inst.sections) for (const it of s.items) itens[it.id] = { ...it, secao: s.title };
  const n = respostas.length;
  const val = (id) => respostas.map((r) => valorItem(itens[id], r.respostas[id])).filter((v) => v != null);

  const porItem = Object.values(itens).filter((i) => i.type === 'scale').map((i) => {
    const vs = val(i.id);
    return { id: i.id, num: Number(i.id.slice(1)), texto: i.text.replace(/^\d+\.\s*/, ''), secao: i.secao, invertido: !!i.reverse, media: r2(media(vs)), desvio: r2(desvio(vs)), n: vs.length };
  });

  const pilares = PILARES.map((p) => {
    const vals = [];
    for (const id of p.itens) { const m = porItem.find((x) => x.id === id)?.media; if (m != null) vals.push(m); }
    if (p.derivados) for (const [id, mapa] of Object.entries(p.derivados)) {
      const vs = respostas.map((r) => mapa[r.respostas[id]]).filter((v) => v != null);
      if (vs.length) vals.push(media(vs));
    }
    const score = r1(media(vals));
    return { key: p.key, nome: p.nome, score, avaliacao: faixa(score), indicativo: !!p.indicativo, questoes: p.itens.map((id) => `Q${id.slice(1)}`).concat(p.derivados ? Object.keys(p.derivados).map((id) => `Q${id.slice(1)}`) : []) };
  });
  const scoreGlobal = r1(media(pilares.map((p) => p.score).filter((v) => v != null)));

  const secoes = inst.sections.filter((s) => s.scored).map((s) => {
    const ms = s.items.filter((i) => i.type === 'scale').map((i) => porItem.find((x) => x.id === i.id)?.media).filter((v) => v != null);
    return { titulo: s.title, media: r2(media(ms)) };
  });

  const ordenados = porItem.filter((i) => i.media != null).sort((a, b) => a.media - b.media);
  const campo = (id) => respostas.map((r) => r.respostas[id]).filter((v) => v && String(v).trim().length > 1);

  return {
    empresa, unidade: unidade || null, n,
    respondentes: respostas.map((r) => r.perfil?.nome).filter(Boolean),
    perfil: {
      setor: moda(campo('q3'))[0]?.valor || null,
      porte: moda(campo('q1'))[0]?.valor || null,
      maturidade: moda(campo('q2'))[0]?.valor || null,
      crescimento: moda(campo('q5')),
      tendencia: moda(campo('q35')),
    },
    scoreGlobal, avaliacaoGlobal: faixa(scoreGlobal), pilares, secoes,
    itens: porItem,
    maisBaixos: ordenados.slice(0, 6),
    maisAltos: ordenados.slice(-5).reverse(),
    maiorDivergencia: n > 1 ? [...porItem].filter((i) => i.desvio != null).sort((a, b) => b.desvio - a.desvio).slice(0, 4) : [],
    abertas: { setores: campo('q3'), desafios: campo('q4'), doresDesejos: campo('q36') },
  };
}

// ---------------------------------------------------------------------------------------------
// Prompt com os dados do cliente (sem nomes nem e-mails dos respondentes)
// ---------------------------------------------------------------------------------------------
export function montarPrompt(base) {
  const L = LIMITES;
  const pct = (lista) => lista.map((x) => `${x.valor} (${x.n})`).join('; ') || 'sem resposta';
  const dados = [
    `EMPRESA: ${base.empresa}${base.unidade ? ` · unidade ${base.unidade}` : ''}`,
    `RESPONDENTES: ${base.n}`,
    `SETOR declarado: ${base.abertas.setores.join(' | ') || 'não informado'}`,
    `PORTE (colaboradores): ${base.perfil.porte || 'não informado'} · TEMPO DE OPERAÇÃO: ${base.perfil.maturidade || 'não informado'}`,
    `CRESCIMENTO nos últimos 12 meses: ${pct(base.perfil.crescimento)}`,
    `SE NADA MUDAR, em 2 anos a empresa estará: ${pct(base.perfil.tendencia)}`,
    '',
    `SCORE GLOBAL: ${fmt1(base.scoreGlobal)} / 5 (${base.avaliacaoGlobal})`,
    'SCORES POR PILAR (escala 1 a 5, calculados pela plataforma; NÃO altere):',
    ...base.pilares.map((p) => `- ${p.nome}: ${fmt1(p.score)} (${p.avaliacao})${p.indicativo ? ' · indicativo: o formulário não tem bloco financeiro, combina Q23 com percepção de crescimento e tendência' : ''} · questões ${p.questoes.join(', ')}`),
    '',
    'MÉDIA POR BLOCO DO FORMULÁRIO:',
    ...base.secoes.map((s) => `- ${s.titulo}: ${fmt1(s.media)}`),
    '',
    'TODAS AS QUESTÕES (média 1 a 5; desvio = dispersão entre respondentes):',
    ...base.itens.map((i) => `- Q${i.num} [${i.secao}] ${i.texto} → média ${fmt1(i.media)}${base.n > 1 ? `, desvio ${fmt1(i.desvio)}` : ''}${i.invertido ? ' (pontuação invertida: nota alta = dependência alta = ruim; a média já está invertida)' : ''}`),
    '',
    `PIORES QUESTÕES: ${base.maisBaixos.map((i) => `Q${i.num} (${fmt1(i.media)})`).join(', ')}`,
    `MELHORES QUESTÕES: ${base.maisAltos.map((i) => `Q${i.num} (${fmt1(i.media)})`).join(', ')}`,
    base.maiorDivergencia.length ? `MAIOR DIVERGÊNCIA ENTRE RESPONDENTES: ${base.maiorDivergencia.map((i) => `Q${i.num} (desvio ${fmt1(i.desvio)})`).join(', ')}` : '',
    '',
    'PRINCIPAL DESAFIO, nas palavras dos respondentes:',
    ...(base.abertas.desafios.length ? base.abertas.desafios.map((t) => `- "${t}"`) : ['- (sem resposta)']),
    '',
    'DORES & DESEJOS, nas palavras dos respondentes:',
    ...(base.abertas.doresDesejos.length ? base.abertas.doresDesejos.map((t) => `- "${t}"`) : ['- (sem resposta)']),
  ].filter((x) => x !== null).join('\n');

  const formato = `{
  "frase_capa": "frase de impacto sobre o score global, até ${L.frase_capa} caracteres",
  "leitura": { "cenario": "leitura geral do cenário, até ${L.leitura.cenario}", "tem": "o que a organização tem, até ${L.leitura.tem}", "bloqueia": "o que está bloqueando, até ${L.leitura.bloqueia}" },
  "forcas": [ 4 itens { "titulo": "até ${L.forca.titulo}", "texto": "até ${L.forca.texto}, citando o score ou as questões que sustentam a força" } ],
  "gargalos": [ 3 itens, do mais crítico ao menos crítico { "titulo": "até ${L.gargalo.titulo}", "texto": "até ${L.gargalo.texto}", "evidencia": "até ${L.gargalo.evidencia}, dados que comprovam (ex.: Q23 média 1,7)" } ],
  "pilares": [ 5 itens na ordem Estratégia, Pessoas, Operações, Financeiro, Governança { "pilar": "nome", "destaque": "síntese para tabela, até ${L.pilar.destaque}", "analise": "análise do pilar, até ${L.pilar.analise}" } ],
  "recomendacoes": [ 5 itens ordenados por urgência e impacto { "titulo": "até ${L.recomendacao.titulo}", "texto": "até ${L.recomendacao.texto}" } ],
  "roadmap": {
    "d30": [ 3 ações críticas { "frente": "até ${L.roadmap.frente}", "decisao": "decisão dura, até ${L.roadmap.decisao}", "acao": "ação objetiva, até ${L.roadmap.acao}", "responsavel": "papel, até ${L.roadmap.responsavel}", "indicador": "até ${L.roadmap.indicador}", "prazo": "ex.: Sem 1–2, até ${L.roadmap.prazo}" } ],
    "d60": [ 3 ações urgentes, mesmo formato ],
    "d90": [ 3 ações importantes, mesmo formato ]
  },
  "okrs": [ 3 objetivos { "objetivo": "até ${L.okr.objetivo}", "krs": [ 3 resultados-chave mensuráveis com número e prazo, cada um até ${L.okr.kr} ] } ],
  "conclusao": { "headline": "até ${L.conclusao.headline}", "corpo": "até ${L.conclusao.corpo}; marque UM trecho-chave com **negrito**", "frase": "frase de fechamento, até ${L.conclusao.frase}", "proximos_passos": [ 3 itens, cada um até ${L.conclusao.passo} ] }
}`;

  return `${PROMPT_MESTRE}

────────────────────────────────────────
TAREFA
Gere o Diagnóstico Organizacional EXPLORE da empresa abaixo, a partir das respostas do assessment "Pesquisa Organizacional" preenchido pelos contatos da empresa.

Regras desta tarefa:
1. Use SOMENTE os dados fornecidos. Não invente números, fatos, nomes de pessoas ou cargos. Responsáveis no roadmap são papéis (ex.: "Sócios", "Gestor Financeiro").
2. Os scores já foram calculados. Cite-os em formato brasileiro (ex.: 3,4) e nunca os altere.
3. Use as questões (Q6 a Q34) e as frases dos respondentes como evidência. Interprete além do óbvio: padrões ocultos, dependência do fundador, desalinhamentos entre respondentes.
4. Forças vêm das maiores médias; gargalos das menores médias e das dores relatadas. Recomendações, roadmap e OKRs atacam os gargalos.
5. Respeite os limites de caracteres: o texto vai para slides de tamanho fixo.
6. Escreva em português do Brasil, tom profissional, direto, com peso nas afirmações. Evite travessão como muleta: prefira ponto, vírgula ou dois pontos.
7. Responda APENAS com um JSON válido, sem texto antes ou depois, sem markdown, exatamente neste formato:
${formato}

────────────────────────────────────────
DADOS DO ASSESSMENT
${dados}`;
}

// Esquema de saída estruturada (Gemini)
const S = (description) => ({ type: 'STRING', description });
const ARR = (items, n) => ({ type: 'ARRAY', items, minItems: n, maxItems: n });
const OBJ = (properties) => ({ type: 'OBJECT', properties, required: Object.keys(properties) });
const acao = OBJ({ frente: S('frente'), decisao: S('decisão dura'), acao: S('ação objetiva'), responsavel: S('papel responsável'), indicador: S('indicador'), prazo: S('prazo') });
export const SCHEMA = OBJ({
  frase_capa: S('frase de impacto'),
  leitura: OBJ({ cenario: S('leitura geral'), tem: S('o que a organização tem'), bloqueia: S('o que bloqueia') }),
  forcas: ARR(OBJ({ titulo: S('título'), texto: S('texto') }), 4),
  gargalos: ARR(OBJ({ titulo: S('título'), texto: S('texto'), evidencia: S('evidência') }), 3),
  pilares: ARR(OBJ({ pilar: S('nome do pilar'), destaque: S('síntese'), analise: S('análise') }), 5),
  recomendacoes: ARR(OBJ({ titulo: S('título'), texto: S('texto') }), 5),
  roadmap: OBJ({ d30: ARR(acao, 3), d60: ARR(acao, 3), d90: ARR(acao, 3) }),
  okrs: ARR(OBJ({ objetivo: S('objetivo'), krs: ARR(S('resultado-chave'), 3) }), 3),
  conclusao: OBJ({ headline: S('headline'), corpo: S('corpo com um trecho em **negrito**'), frase: S('frase de fechamento'), proximos_passos: ARR(S('passo'), 3) }),
});

// ---------------------------------------------------------------------------------------------
// Normalização: garante quantidade de itens e limites, independentemente da fonte (IA ou colado)
// ---------------------------------------------------------------------------------------------
export function cortar(txt, max) {
  let s = String(txt ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  s = s.slice(0, max - 1);
  const sp = s.lastIndexOf(' ');
  return (sp > max * 0.6 ? s.slice(0, sp) : s).replace(/[\s,;:.–-]+$/, '') + '…';
}
const lista = (v, n, fn) => Array.from({ length: n }, (_, i) => fn((Array.isArray(v) ? v : [])[i] || {}, i));

export function extrairJson(texto) {
  if (texto && typeof texto === 'object') return texto;
  let t = String(texto || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{'); const b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('Não encontrei um JSON no texto.');
  return JSON.parse(t.slice(a, b + 1));
}

export function normalizar(entrada) {
  const j = extrairJson(entrada);
  const L = LIMITES;
  const ac = (x) => ({ frente: cortar(x.frente, L.roadmap.frente), decisao: cortar(x.decisao, L.roadmap.decisao), acao: cortar(x.acao, L.roadmap.acao), responsavel: cortar(x.responsavel, L.roadmap.responsavel), indicador: cortar(x.indicador, L.roadmap.indicador), prazo: cortar(x.prazo, L.roadmap.prazo) });
  const nomes = PILARES.map((p) => p.nome);
  const out = {
    frase_capa: cortar(j.frase_capa, L.frase_capa),
    leitura: { cenario: cortar(j.leitura?.cenario, L.leitura.cenario), tem: cortar(j.leitura?.tem, L.leitura.tem), bloqueia: cortar(j.leitura?.bloqueia, L.leitura.bloqueia) },
    forcas: lista(j.forcas, 4, (x) => ({ titulo: cortar(x.titulo, L.forca.titulo), texto: cortar(x.texto, L.forca.texto) })),
    gargalos: lista(j.gargalos, 3, (x) => ({ titulo: cortar(x.titulo, L.gargalo.titulo), texto: cortar(x.texto, L.gargalo.texto), evidencia: cortar(x.evidencia, L.gargalo.evidencia) })),
    pilares: nomes.map((nome, i) => {
      const x = (j.pilares || []).find((p) => String(p.pilar || '').toLowerCase().startsWith(nome.slice(0, 5).toLowerCase())) || (j.pilares || [])[i] || {};
      return { pilar: nome, destaque: cortar(x.destaque, L.pilar.destaque), analise: cortar(x.analise, L.pilar.analise) };
    }),
    recomendacoes: lista(j.recomendacoes, 5, (x) => ({ titulo: cortar(x.titulo, L.recomendacao.titulo), texto: cortar(x.texto, L.recomendacao.texto) })),
    roadmap: { d30: lista(j.roadmap?.d30, 3, ac), d60: lista(j.roadmap?.d60, 3, ac), d90: lista(j.roadmap?.d90, 3, ac) },
    okrs: lista(j.okrs, 3, (x) => ({ objetivo: cortar(x.objetivo, L.okr.objetivo), krs: lista(x.krs, 3, (k) => cortar(typeof k === 'string' ? k : k.texto || k.text || '', L.okr.kr)) })),
    conclusao: {
      headline: cortar(j.conclusao?.headline, L.conclusao.headline),
      corpo: cortarComNegrito(j.conclusao?.corpo, L.conclusao.corpo),
      frase: cortar(j.conclusao?.frase, L.conclusao.frase),
      proximos_passos: lista(j.conclusao?.proximos_passos, 3, (p) => cortar(typeof p === 'string' ? p : '', L.conclusao.passo)),
    },
  };
  const vazios = [out.leitura.cenario, ...out.forcas.map((f) => f.titulo), ...out.gargalos.map((g) => g.titulo), ...out.recomendacoes.map((r) => r.titulo)].filter((x) => !x).length;
  if (vazios > 4) throw new Error('O conteúdo veio incompleto: faltam seções obrigatórias do diagnóstico.');
  return out;
}
function cortarComNegrito(txt, max) {
  const s = String(txt ?? '').replace(/\s+/g, ' ').trim();
  if (s.replace(/\*\*/g, '').length <= max) return s;
  const c = cortar(s.replace(/\*\*/g, ''), max);
  return c;
}

// ---------------------------------------------------------------------------------------------
// Chamada à IA (Gemini, camada gratuita do Google AI Studio)
// ---------------------------------------------------------------------------------------------
export async function gerarComGemini(env, prompt) {
  const modelo = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const baseUrl = env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com';
  const r = await fetch(`${baseUrl}/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, responseMimeType: 'application/json', responseSchema: SCHEMA, maxOutputTokens: 16384 },
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Gemini: ${data?.error?.message || `HTTP ${r.status}`}`);
  const texto = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!texto) throw new Error(`Gemini não retornou conteúdo (${data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || 'sem motivo informado'}).`);
  return { conteudo: normalizar(texto), modelo };
}
