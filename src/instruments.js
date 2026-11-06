// Oriente One v1.3.0 | Definição dos instrumentos (fonte única para formulário público e cálculo)
// Transcrito dos Google Forms originais em 30/10/2026.

const ESCALA_5 = { min: 1, max: 5, minLabel: 'Discordo Totalmente', maxLabel: 'Concordo Totalmente' };

const q = (id, text, extra = {}) => ({ id, text, type: 'scale', required: true, ...extra });

// ---------------------------------------------------------------------------
// DIAGNÓSTICO ORGANIZACIONAL (Pesquisa Organizacional)
// ---------------------------------------------------------------------------
const ORG = {
  key: 'org',
  nome: 'Diagnóstico Organizacional',
  publicTitle: 'Pesquisa Organizacional',
  intro: 'Esta pesquisa tem como objetivo gerar uma leitura estratégica clara sobre liderança, pessoas, operação e cultura.',
  anonimo: false,
  scale: { ...ESCALA_5, minLabel: 'Discordo' },
  profile: [
    { id: 'nome', text: 'Seu Nome', type: 'text', required: true },
    { id: 'email', text: 'Seu e-mail', type: 'email', required: false },
  ],
  sections: [
    {
      key: 'contexto', title: 'Contexto da Empresa', scored: false,
      items: [
        { id: 'q1', text: '1. Quantos colaboradores a empresa possui?', type: 'choice', required: false, options: ['Até 10', 'De 11 a 30', 'De 31 a 100', 'De 101 a 300', 'Acima de 300'] },
        { id: 'q2', text: '2. Há quanto tempo a empresa está em operação?', type: 'choice', required: false, options: ['Até 2 anos', '3 a 5 anos', '6 a 10 anos', 'Mais de 10 anos'] },
        { id: 'q3', text: '3. Qual o principal setor de atuação da empresa?', type: 'text', required: false },
        { id: 'q4', text: '4. Qual você considera hoje o principal desafio da empresa?', type: 'text', required: false },
        { id: 'q5', text: '5. O crescimento da empresa nos últimos 12 meses foi:', type: 'choice', required: false, options: ['Abaixo do esperado', 'Dentro do esperado', 'Acima do esperado'] },
      ],
    },
    {
      key: 'lideranca', title: 'Liderança & Decisão', scored: true,
      items: [
        q('q6', '6. As decisões estratégicas são tomadas com clareza e rapidez?'),
        q('q7', '7. Existe definição clara de papéis e responsabilidades na liderança?'),
        q('q8', '8. As lideranças estão alinhadas entre si nas decisões mais relevantes?'),
        q('q9', '9. Conflitos entre líderes são tratados de forma aberta e madura?'),
        q('q10', '10. A liderança assume responsabilidade pelos erros e aprendizados?'),
        q('q11', '11. As decisões são baseadas em dados e critérios claros, não apenas em percepções?'),
        q('q12', '12. A empresa possui fóruns regulares para decisões estratégicas (reuniões, comitês, conselhos...)?'),
      ],
    },
    {
      key: 'pessoas', title: 'Pessoas & Comportamento', scored: true,
      items: [
        q('q13', '13. Os líderes conhecem bem os pontos fortes e limitações das pessoas do time?'),
        q('q14', '14. As pessoas entendem claramente o que se espera delas.'),
        q('q15', '15. Existe confiança entre líderes e equipes.'),
        q('q16', '16. Problemas comportamentais são tratados antes de se tornarem crises.'),
        q('q17', '17. Há equilíbrio entre cobrança por resultados e cuidado com as pessoas.'),
        q('q18', '18. As pessoas se sentem responsáveis pelo sucesso da empresa.'),
        q('q19', '19. Existe coerência entre o discurso da liderança e suas atitudes diárias.'),
      ],
    },
    {
      key: 'operacao', title: 'Operação & Execução', scored: true,
      items: [
        q('q20', '20. Os processos principais da empresa são claros e bem definidos.'),
        q('q21', '21. Existem responsáveis ("donos") claros para cada área ou processo crítico.'),
        q('q22', '22. Problemas recorrentes são tratados na causa raiz.'),
        q('q23', '23. Há indicadores claros para acompanhamento da performance.'),
        q('q24', '24. O retrabalho e o improviso são exceção, não regra.'),
        q('q25', '25. A operação consegue sustentar o crescimento atual da empresa.'),
      ],
    },
    {
      key: 'cultura', title: 'Direção & Cultura', scored: true,
      items: [
        q('q26', '26. A empresa possui uma visão clara de onde quer chegar nos próximos anos.'),
        q('q27', '27. Os princípios da empresa orientam as decisões difíceis.'),
        q('q28', '28. As pessoas sabem explicar o propósito da empresa.'),
        q('q29', '29. Existe coerência entre o que a empresa comunica e o que pratica.'),
        q('q30', '30. A cultura da empresa fortalece os resultados.'),
        q('q31', '31. A empresa está preparada culturalmente para crescer.'),
      ],
    },
    {
      key: 'maturidade', title: 'Percepção & Maturidade', scored: true,
      items: [
        // 32 e 33 medem dependência: concordar = pior. Pontuação invertida no cálculo.
        q('q32', '32. Hoje, a empresa depende excessivamente de poucas pessoas-chave.', { reverse: true }),
        q('q33', '33. Se uma liderança importante saísse, a empresa sentiria forte impacto.', { reverse: true }),
        q('q34', '34. A empresa tem clareza sobre seus riscos estratégicos.'),
        { id: 'q35', text: '35. Se nada mudar, a empresa estará melhor ou pior em 2 anos?', type: 'choice', required: false, options: ['Melhor', 'Igual', 'Pior'] },
        { id: 'q36', text: '36. Fale um pouco sobre as "Dores & Desejos" da sua empresa.', type: 'textarea', required: false },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// NR-1 — blocos compartilhados (psicossocial) entre Formulário A e B
// ---------------------------------------------------------------------------
const NR1_INTRO = 'Estamos realizando esta pesquisa para mapear os riscos psicossociais, como carga de trabalho, relações interpessoais e equilíbrio entre vida pessoal e profissional. Queremos entender o que muitas vezes não aparece nas inspeções de segurança tradicionais, mas que faz parte do seu dia a dia.\n\nIMPORTANTE: este questionário é 100% anônimo. Nenhuma resposta individual será identificada. Não há respostas certas ou erradas: o que importa é a sua experiência real. As informações serão usadas exclusivamente para criar ações de suporte e prevenção.';

const PSICO_TEXTS = {
  carga: [
    'A carga de trabalho é compatível com o tempo disponível para execução das atividades.',
    'As metas são claras, realistas e atingíveis.',
    'Tenho clareza sobre o que é esperado de mim no meu trabalho.',
    'As pessoas têm autonomia suficiente para realizar seu trabalho.',
  ],
  relacoes: [
    'Sinto que posso expressar dificuldades, discordâncias ou erros no trabalho sem medo de consequências.',
    'Conflitos interpessoais são tratados de forma adequada e respeitosa.',
    'A liderança atua com coerência, respeito e responsabilidade.',
    'A empresa atua preventivamente para evitar situações de assédio moral.',
    'Quando situações de assédio moral ou pressão excessiva ocorrem, são tratadas de forma adequada.',
  ],
  reconhecimento: [
    'As pessoas se sentem reconhecidas pelo trabalho que realizam.',
    'Existe equilíbrio entre vida pessoal e trabalho.',
    'Sinto-me seguro(a) em relação à continuidade do meu emprego.',
    'A empresa toma ações concretas para cuidar da saúde mental dos colaboradores.',
  ],
  comunicacao: [
    'As pessoas se sentem seguras para relatar problemas, erros ou sobrecarga.',
    'Mudanças organizacionais são comunicadas com clareza e antecedência.',
    'Existe espaço legítimo para diálogo sobre sofrimento ou dificuldades no trabalho.',
  ],
  emocional: [
    'Quando realizo atendimento a pessoas em situação difícil ou conflituosa, me sinto apoiado(a) pela empresa.',
    'Tenho suporte adequado para lidar com situações emocionalmente desgastantes no trabalho.',
  ],
};
const PSICO_TITLES = {
  carga: 'Carga de Trabalho e Organização',
  relacoes: 'Relações Interpessoais e Liderança',
  reconhecimento: 'Reconhecimento e Bem-estar',
  comunicacao: 'Comunicação e Diálogo',
  emocional: 'Trabalho Emocional',
};
const EMOCIONAL_NOTE = 'Responda apenas se a sua função envolve atendimento a pessoas. Caso contrário, marque "Não se aplica".';

// Gera as 5 seções psicossociais numeradas a partir de `start`. Prefixo de id `p_` comum a A e B para comparação.
function psicoSections(start) {
  let n = start;
  return Object.keys(PSICO_TEXTS).map((k) => ({
    key: k,
    title: PSICO_TITLES[k],
    group: 'Risco Psicossocial no Ambiente de Trabalho',
    note: k === 'emocional' ? EMOCIONAL_NOTE : undefined,
    scored: true,
    items: PSICO_TEXTS[k].map((t, i) => {
      const num = n++;
      return q(`p_${k}_${i + 1}`, `${num}. ${t}`, k === 'emocional' ? { allowNA: true } : {});
    }),
  }));
}

const ABERTAS = (required) => ({
  key: 'abertas', title: 'Perguntas Abertas', scored: false,
  note: 'Capturar percepções qualitativas que as escalas numéricas não conseguem revelar.',
  items: [
    { id: 'f1', text: 'F1. Existe alguma situação no seu trabalho que gera desgaste, tensão ou dificuldade que não foi abordada nas perguntas acima? Descreva livremente.', type: 'textarea', required },
    { id: 'f2', text: 'F2. O que a empresa poderia fazer de diferente para melhorar o bem-estar e as condições de trabalho?', type: 'textarea', required },
    { id: 'f3', text: 'F3. Há algo que você gostaria que a liderança soubesse sobre o dia a dia de trabalho?', type: 'textarea', required },
  ],
});

// ---------------------------------------------------------------------------
// NR-1 FORMULÁRIO A — Liderança (Gestores, SST e RH)
// ---------------------------------------------------------------------------
const NR1_LID = {
  key: 'nr1_lid',
  nome: 'Diagnóstico NR-1 · Liderança (Formulário A)',
  publicTitle: 'Pesquisa de Percepção de Riscos NR-1 · Formulário A',
  audience: 'Gestores, SST e RH',
  intro: NR1_INTRO,
  anonimo: true,
  scale: ESCALA_5,
  profile: [
    { id: 'area', text: 'Área ou Departamento', type: 'choice', required: true, options: ['Operações / Produção', 'Administrativo / Financeiro', 'Recursos Humanos / SST', 'Comercial / Atendimento', 'TI / Tecnologia', 'Outro'] },
    { id: 'nivel', text: 'Nível Hierárquico', type: 'choice', required: true, options: ['Operacional', 'Tático (Coordenação / Supervisão)', 'Estratégico (Gerência / Diretoria / C-Level)'] },
    { id: 'tempo', text: 'Tempo de Empresa', type: 'choice', required: true, options: ['Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', 'Mais de 5 anos'] },
  ],
  sections: [
    {
      key: 'conformidade', title: 'Conformidade Normativa (NR-1 / PGR)', scored: true,
      note: 'Avaliar proteção legal, aderência à NR-1 e efetividade documental.',
      items: [
        q('a1', '1. A empresa possui um PGR formalizado e documentado.'),
        q('a2', '2. O Inventário de Riscos está atualizado e contempla todas as atividades da empresa.'),
        q('a2a', '2-A. O Inventário de Riscos contém, para cada perigo identificado, a caracterização da exposição dos trabalhadores: tempo de exposição, frequência e intensidade.'),
        q('a2b', '2-B. O Inventário de Riscos registra o número de trabalhadores expostos a cada perigo, com gradação de severidade, probabilidade e nível de risco documentados.'),
        q('a3', '3. O Inventário de Riscos contempla riscos físicos, químicos, biológicos, ergonômicos/mecânicos.'),
        q('a4', '4. O Inventário de Riscos contempla especificamente os riscos psicossociais (organização do trabalho, relações interpessoais, pressão, assédio).'),
        q('a4a', '4-A. A organização realizou a Avaliação Ergonômica Preliminar (AEP) das situações de trabalho, conforme exigido pela NR-17.'),
        q('a4b', '4-B. Os resultados da AEP estão integrados ao Inventário de Riscos do PGR, com os dados de identificação de perigos ergonômicos e psicossociais devidamente registrados.'),
        q('a5', '5. Existe um Plano de Ação definido para tratar os riscos identificados.'),
        q('a6', '6. As ações do Plano de Ação possuem responsáveis e prazos claros.'),
        q('a7', '7. O PGR está integrado ao PCMSO (Programa de Controle Médico de Saúde Ocupacional).'),
        q('a8', '8. Os documentos do PGR estão organizados e disponíveis para fiscalização.'),
        q('a9', '9. O PGR é revisado sempre que ocorrem mudanças relevantes (processos, pessoas ou estrutura).'),
        q('a10', '10. O PGR reflete a realidade do trabalho, e não apenas exigências formais.'),
        q('a10a', '10-A. A organização possui documento formal que descreve os critérios utilizados no GRO para gradação de severidade, probabilidade, nível de risco e classificação de prioridades.'),
        q('a11', '11. Os trabalhadores foram consultados na identificação e avaliação dos riscos do PGR.'),
        q('a11a', '11-A. A organização comunica formalmente aos trabalhadores os riscos registrados no Inventário de Riscos e as medidas de prevenção previstas no Plano de Ação.'),
        q('a11b', '11-B. A organização possui canais eficientes e bidirecionais de comunicação em SST: não apenas transmite informações, mas também recebe dúvidas, sugestões e alertas dos trabalhadores.'),
      ],
    },
    {
      key: 'treinamento', title: 'Treinamento e Capacitação', scored: true,
      note: 'Avaliar se os colaboradores têm conhecimento adequado sobre riscos e prevenção.',
      items: [
        q('a12', '12. Os colaboradores recebem treinamentos adequados sobre riscos ocupacionais (físicos, químicos, ergonômicos).'),
        q('a13', '13. Os colaboradores recebem treinamento ou orientação sobre riscos psicossociais e saúde mental no trabalho.'),
        q('a14', '14. As lideranças são capacitadas para identificar e tratar situações de sobrecarga, assédio e sofrimento no trabalho.'),
        q('a15', '15. O conteúdo dos treinamentos é aplicável ao dia a dia real do trabalho, e não apenas teórico.'),
      ],
    },
    ...psicoSections(16),
    {
      key: 'maturidade', title: 'Maturidade da Gestão de Riscos', scored: true,
      note: 'Avaliar se a empresa gere riscos de forma estruturada ou apenas reativa.',
      items: [
        q('a34', '34. A gestão de riscos faz parte da rotina da empresa, não apenas de auditorias.'),
        q('a35', '35. A liderança compreende seu papel na prevenção de riscos ocupacionais.'),
        q('a36', '36. Os riscos identificados são monitorados continuamente.'),
        q('a37', '37. A empresa analisa as causas de afastamentos por adoecimento e usa essas informações para prevenir novos casos.'),
        q('a38', '38. Existem indicadores para acompanhar riscos físicos e de segurança ocupacional.'),
        q('a39', '39. A empresa monitora indicadores específicos de saúde mental (absenteísmo, afastamentos por CID F, rotatividade). *CID: Classificação Internacional de Doenças, que engloba os Transtornos Mentais e Comportamentais.'),
        q('a40', '40. As decisões estratégicas consideram impactos na saúde e segurança das pessoas.'),
        q('a41', '41. A gestão de riscos está integrada à gestão do negócio.'),
        q('a42', '42. Existe um responsável claramente definido pela gestão do PGR.'),
        q('a43', '43. A alta liderança acompanha e cobra resultados relacionados à NR-1 e ao PGR.'),
        q('a44', '44. O Inventário de Riscos é utilizado como base para decisões, e não apenas arquivado.'),
      ],
    },
    {
      key: 'execucao', title: 'Capacidade de Execução e Sustentação', scored: true,
      note: 'Avaliar se a empresa consegue executar e sustentar o PGR ao longo do tempo.',
      items: [
        q('a45', '45. A empresa possui recursos suficientes para executar o PGR.'),
        q('a46', '46. Papéis e responsabilidades são claros na gestão de riscos.'),
        q('a47', '47. As lideranças acompanham a execução das ações previstas.'),
        q('a48', '48. As ações definidas costumam ser concluídas dentro do prazo.'),
        q('a49', '49. Existe disciplina para acompanhar indicadores e resultados.'),
        q('a50', '50. As pessoas assumem responsabilidade pelas ações acordadas.'),
        q('a51', '51. Existe acompanhamento formal quando ações do plano não são executadas no prazo.'),
        q('a52', '52. O PGR é mantido ativo mesmo sem pressão externa (fiscalização ou auditoria).'),
      ],
    },
    {
      key: 'terceiros', title: 'Gestão de Terceiros e Prestadores de Serviço', scored: true,
      note: 'Avaliar o cumprimento das obrigações normativas relativas a trabalhadores terceirizados.',
      items: [
        q('a53', '53. O PGR da organização inclui medidas de prevenção para os trabalhadores terceirizados e prestadores de serviço que atuam nas dependências da empresa ou em local previamente convencionado.', { allowNA: true }),
        q('a54', '54. A organização mantém diálogo ativo com as empresas contratadas sobre os riscos que cada parte encontra e os riscos que cada parte traz para o ambiente de trabalho compartilhado.', { allowNA: true }),
        q('a55', '55. Quando identificados riscos decorrentes da interação entre atividades da contratante e da contratada, as medidas de prevenção são definidas em conjunto, sob coordenação da contratante.', { allowNA: true }),
      ],
    },
    {
      key: 'emergencias', title: 'Preparação e Resposta a Emergências', scored: true,
      note: 'Avaliar se a organização está preparada para emergências ocupacionais.',
      items: [
        q('a56', '56. A organização possui procedimento documentado de resposta a emergências, com responsáveis definidos, meios de evacuação estabelecidos e recursos de primeiros socorros especificados.'),
        q('a57', '57. São realizados exercícios simulados periódicos de resposta a emergências, com geração e arquivamento de evidências documentadas.'),
        q('a58', '58. O procedimento de resposta a emergências está integrado ao GRO/PGR e contempla os riscos identificados no Inventário de Riscos da organização.'),
      ],
    },
    ABERTAS(false),
  ],
};

// ---------------------------------------------------------------------------
// NR-1 FORMULÁRIO B — Colaboradores (anônimo)
// ---------------------------------------------------------------------------
const NR1_COL = {
  key: 'nr1_col',
  nome: 'Diagnóstico NR-1 · Colaboradores (Formulário B)',
  publicTitle: 'Pesquisa de Percepção de Riscos NR-1 · Formulário B',
  audience: 'Todos os Colaboradores (anônimo)',
  intro: NR1_INTRO,
  anonimo: true,
  scale: ESCALA_5,
  profile: [],
  sections: [...psicoSections(1), ABERTAS(true)],
};

// ---------------------------------------------------------------------------
// DSFE — Diagnóstico Sistêmico de Famílias Empresárias (em construção)
// ---------------------------------------------------------------------------
const DSFE = {
  key: 'dsfe',
  nome: 'Diagnóstico Familiar Sistêmico-Empresarial (DSFE)',
  publicTitle: 'Diagnóstico Familiar Sistêmico-Empresarial',
  intro: '',
  anonimo: false,
  emConstrucao: true, // envio bloqueado até o questionário ser carregado neste arquivo
  scale: ESCALA_5,
  profile: [],
  sections: [],
};

export const INSTRUMENTS = { org: ORG, nr1_lid: NR1_LID, nr1_col: NR1_COL, dsfe: DSFE };

// Produtos que o contrato pode disparar. NR-1 abre os dois formulários juntos.
export const PRODUTOS = {
  org: { nome: 'Diagnóstico Organizacional', instrumentos: ['org'] },
  nr1: { nome: 'Diagnóstico NR-1', instrumentos: ['nr1_lid', 'nr1_col'] },
  dsfe: { nome: 'Diagnóstico Familiar Sistêmico-Empresarial', instrumentos: ['dsfe'] },
};

export function scaleItems(inst) {
  const out = [];
  for (const s of inst.sections) for (const it of s.items) if (it.type === 'scale') out.push({ ...it, section: s.key });
  return out;
}
