// Oriente One v1.1.0 | Deck EXPLORE · Diagnóstico Organizacional (11 slides, padrão bordeaux)
// Porta do modelo aprovado (skill explore-diagnostico-pptx). Funciona no navegador e no Node.

const BORDO = '612B4A', BORDO_D = '4A1F36', CINZA1 = 'F5F0F3', CINZA2 = 'E8E1E5', BRANCO = 'FFFFFF';
const TEXTO = '1A1A1A', BEGE = '888888', STAT_LBL = 'DFC8D4';
const AZUL_BOA = '2E7D32', VERM_DEV = 'C62828', AZUL_MED = '1565C0', CINZA_BD = '607D8B';
const W = 10, H = 5.625, M = 0.4;
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const f1 = (v) => (v == null ? '–' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ','));
const corAval = (a) => (a === 'Muito boa' ? AZUL_BOA : a === 'Boa' ? AZUL_MED : a === 'Em desenvolvimento' ? VERM_DEV : CINZA_BD);
const curto = (s, n) => { s = String(s || ''); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };

// "texto **negrito** texto" → runs do pptxgenjs
function runs(txt, base, destaque) {
  return String(txt || '').split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) => p.startsWith('**')
    ? { text: p.slice(2, -2), options: { ...base, ...destaque } }
    : { text: p, options: { ...base } });
}

export function nomeArquivo({ versao, empresa }) {
  return `EXPLORE - PPT${versao} - Diagnostico Organizacional - ${empresa}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\\/:*?"<>|]+/g, '-') + '.pptx';
}

export function montarDeck(PptxGenJS, { conteudo: d, base: b, versao, data = new Date() }) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';
  pres.author = 'EXPLORE · Desenvolvimento de Gente e Gestão';
  pres.company = 'EXPLORE';
  pres.subject = `Diagnóstico Organizacional · ${b.empresa}`;
  pres.title = `EXPLORE · PPT${versao} · Diagnóstico Organizacional · ${b.empresa}`;
  const SH = pres.ShapeType;
  const empresa = b.empresa;
  const dataTxt = `${MESES[data.getMonth()]} ${data.getFullYear()}`;
  const nomes = b.respondentes || [];
  const respTxt = nomes.length && nomes.length <= 4 ? nomes.join(' / ') : `${b.n} respondente${b.n === 1 ? '' : 's'}`;
  const pil = (k) => b.pilares.find((p) => p.key === k) || {};

  const hdrStrip = (s) => {
    s.addShape(SH.rect, { x: 0, y: 0, w: W, h: 0.32, fill: { color: BORDO_D } });
    s.addText([
      { text: 'E X P L O R E', options: { bold: true, color: BRANCO, fontSize: 8, fontFace: 'Cambria' } },
      { text: '  ·  Desenvolvimento de Gente e Gestão', options: { color: STAT_LBL, fontSize: 8, fontFace: 'Calibri' } },
    ], { x: M, y: 0.02, w: 5.5, h: 0.28, valign: 'middle', isTextBox: true, margin: 0 });
    s.addText('Confidencial · Uso Interno', { x: W - 3.0, y: 0.02, w: 2.6, h: 0.28, fontSize: 8, fontFace: 'Calibri', color: STAT_LBL, align: 'right', valign: 'middle', isTextBox: true, margin: 0 });
  };
  const ftrStrip = (s) => {
    s.addShape(SH.rect, { x: 0, y: H - 0.26, w: W, h: 0.26, fill: { color: CINZA2 } });
    s.addText(`E X P L O R E  ·  Diagnóstico Organizacional  ·  ${empresa}  ·  PPT${versao}`, { x: 0, y: H - 0.26, w: W, h: 0.26, fontSize: 7, fontFace: 'Calibri', color: BEGE, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
  };
  const slideHeader = (s, num, title) => {
    hdrStrip(s); ftrStrip(s);
    s.addShape(SH.rect, { x: M, y: 0.42, w: 0.38, h: 0.38, fill: { color: BORDO } });
    s.addText(num, { x: M, y: 0.42, w: 0.38, h: 0.38, fontSize: 13, fontFace: 'Calibri', bold: true, color: BRANCO, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
    s.addText(title, { x: M + 0.46, y: 0.42, w: W - M - 0.86, h: 0.38, fontSize: 16, fontFace: 'Cambria', bold: true, color: BORDO, valign: 'middle', isTextBox: true, margin: 0 });
    s.addShape(SH.line, { x: M, y: 0.88, w: W - 2 * M, h: 0, line: { color: BORDO, width: 1.5 } });
  };
  const hline = (s, x, y, w) => { if (w <= 0) return; s.addShape(SH.line, { x, y, w, h: 0, line: { color: CINZA2, width: 0.75 } }); };
  const meta = (k, v, fs = 9) => [
    { text: k, options: { bold: true, color: STAT_LBL, fontSize: fs, fontFace: 'Calibri' } },
    { text: v, options: { color: BRANCO, fontSize: fs, fontFace: 'Calibri' } },
  ];

  // 1 · CAPA
  {
    const s = pres.addSlide(); const splitY = 3.55;
    s.addText('E X P L O R E', { x: M, y: 0.38, w: 5, h: 0.44, fontSize: 22, fontFace: 'Cambria', bold: true, color: BORDO, isTextBox: true, margin: 0 });
    s.addShape(SH.line, { x: M, y: 0.86, w: 5.8, h: 0, line: { color: BORDO, width: 1.2 } });
    s.addText('Desenvolvimento de Gente e Gestão', { x: M, y: 0.9, w: 6, h: 0.3, fontSize: 11, fontFace: 'Calibri', color: BEGE, isTextBox: true, margin: 0 });
    s.addText(`DOC${versao}  ·  Diagnóstico Organizacional`, { x: M, y: 1.26, w: 6, h: 0.26, fontSize: 10, fontFace: 'Calibri', color: BEGE, isTextBox: true, margin: 0 });
    s.addText('Diagnóstico', { x: M, y: 1.52, w: 7, h: 0.8, fontSize: 50, fontFace: 'Cambria', bold: true, color: TEXTO, isTextBox: true, margin: 0 });
    s.addText('Organizacional', { x: M, y: 2.24, w: 7.5, h: 0.8, fontSize: 50, fontFace: 'Cambria', bold: true, color: TEXTO, isTextBox: true, margin: 0 });
    s.addText(curto(empresa + (b.unidade ? ` · ${b.unidade}` : ''), 60), { x: M, y: 3.08, w: 9, h: 0.4, fontSize: 20, fontFace: 'Cambria', bold: true, color: BORDO, isTextBox: true, margin: 0 });
    s.addShape(SH.rect, { x: 0, y: splitY, w: W, h: H - splitY, fill: { color: BORDO } });
    s.addShape(SH.line, { x: M, y: splitY + 0.38, w: W - 2 * M, h: 0, line: { color: BORDO_D, width: 0.75 } });
    s.addText(meta('Respondentes: ', curto(respTxt, 110)), { x: M, y: splitY + 0.08, w: W - 2 * M, h: 0.26, isTextBox: true, margin: 0 });
    s.addText([
      ...meta('Setor: ', curto(b.perfil.setor || 'não informado', 40)),
      ...meta('     Porte: ', `${b.perfil.porte || 'não informado'} colaboradores`.replace('não informado colaboradores', 'não informado')),
      ...meta('     Maturidade: ', b.perfil.maturidade ? `${b.perfil.maturidade} de mercado` : 'não informada'),
    ], { x: M, y: splitY + 0.36, w: W - 2 * M, h: 0.26, isTextBox: true, margin: 0 });
    s.addText(meta('Data: ', dataTxt), { x: M, y: splitY + 0.62, w: W - 2 * M, h: 0.22, isTextBox: true, margin: 0 });
    s.addText(`Versão ${versao}  ·  Confidencial · Uso Interno`, { x: M, y: splitY + 0.86, w: W - 2 * M, h: 0.22, fontSize: 8, fontFace: 'Calibri', color: STAT_LBL, isTextBox: true, margin: 0 });
  }

  // 2 · AGENDA
  {
    const s = pres.addSlide(); hdrStrip(s); ftrStrip(s);
    s.addText('Agenda', { x: M, y: 0.42, w: 4, h: 0.46, fontSize: 28, fontFace: 'Cambria', bold: true, color: BORDO, isTextBox: true, margin: 0 });
    s.addShape(SH.line, { x: M, y: 0.94, w: W - 2 * M, h: 0, line: { color: BORDO, width: 1.5 } });
    const items = ['Leitura Geral · Scores por Pilar', 'Forças e Diferenciais', 'Gargalos Críticos', 'Análise Detalhada por Pilar', 'Recomendações Estratégicas', 'Roadmap 30/60/90 Dias', 'OKRs Recomendados', 'Conclusão Executiva'];
    const colW = (W - 2 * M - 0.3) / 2, rowH = 0.56, gap = 0.1, startY = 1.04;
    items.forEach((title, i) => {
      const x = M + (i < 4 ? 0 : 1) * (colW + 0.3), y = startY + (i % 4) * (rowH + gap);
      s.addShape(SH.rect, { x, y, w: 0.36, h: rowH, fill: { color: BORDO } });
      s.addText(String(i + 1).padStart(2, '0'), { x, y, w: 0.36, h: rowH, fontSize: 12, fontFace: 'Calibri', bold: true, color: BRANCO, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
      s.addText(title, { x: x + 0.44, y: y + 0.01, w: colW - 0.44, h: rowH - 0.02, fontSize: 12, fontFace: 'Calibri', color: TEXTO, valign: 'middle', isTextBox: true, margin: 0 });
      hline(s, x, y + rowH, colW);
    });
  }

  // 3 · LEITURA GERAL
  {
    const s = pres.addSlide(); slideHeader(s, '01', 'Leitura Geral · Scores por Pilar');
    const scores = [{ val: f1(b.scoreGlobal), lbl: 'Score Global' }, ...['estrategia', 'pessoas', 'operacoes', 'financeiro', 'governanca'].map((k) => ({ val: f1(pil(k).score), lbl: pil(k).nome + (pil(k).indicativo ? '*' : '') }))];
    const cardW = (W - 2 * M) / 6, cardH = 1.12, cardY = 1.0;
    scores.forEach((sc, i) => {
      const x = M + i * cardW;
      s.addShape(SH.rect, { x, y: cardY, w: cardW - 0.04, h: cardH, fill: { color: BORDO } });
      if (i < 5) s.addShape(SH.line, { x: x + cardW - 0.04, y: cardY, w: 0, h: cardH, line: { color: BORDO_D, width: 1 } });
      s.addText(sc.val, { x: x + 0.02, y: cardY + 0.12, w: cardW - 0.08, h: 0.56, fontSize: 32, fontFace: 'Cambria', bold: true, color: BRANCO, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
      s.addShape(SH.line, { x: x + 0.06, y: cardY + 0.72, w: cardW - 0.16, h: 0, line: { color: BORDO_D, width: 0.75 } });
      s.addText(sc.lbl, { x: x + 0.02, y: cardY + 0.76, w: cardW - 0.08, h: 0.28, fontSize: 8, fontFace: 'Calibri', color: STAT_LBL, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
    });
    const perfY = 2.28;
    s.addText('Perfil da Empresa', { x: M, y: perfY, w: 6, h: 0.32, fontSize: 14, fontFace: 'Cambria', bold: true, color: BORDO, isTextBox: true, margin: 0 });
    hline(s, M, perfY + 0.34, W - 2 * M);
    const campos = [
      ['Empresa:', curto(empresa, 38), 'Maturidade:', b.perfil.maturidade ? `${b.perfil.maturidade} de mercado` : 'não informada'],
      ['Setor:', curto(b.perfil.setor || 'não informado', 38), 'Respondentes:', curto(respTxt, 44)],
      ['Porte:', b.perfil.porte ? `${b.perfil.porte} colaboradores` : 'não informado', 'Data:', dataTxt],
    ];
    campos.forEach((row, i) => {
      const y = perfY + 0.44 + i * 0.4;
      s.addText([{ text: row[0], options: { bold: true, color: BORDO, fontSize: 10, fontFace: 'Calibri' } }, { text: '  ' + row[1], options: { color: TEXTO, fontSize: 10, fontFace: 'Calibri' } }], { x: M, y, w: 4.2, h: 0.34, isTextBox: true, margin: 0 });
      s.addText([{ text: row[2], options: { bold: true, color: BORDO, fontSize: 10, fontFace: 'Calibri' } }, { text: '  ' + row[3], options: { color: TEXTO, fontSize: 10, fontFace: 'Calibri' } }], { x: M + 4.4, y, w: W - M - 4.4 - M, h: 0.34, isTextBox: true, margin: 0 });
    });
    const qY = H - 0.26 - 0.68;
    hline(s, M, qY, W - 2 * M);
    s.addText(`"${d.frase_capa}"`, { x: M + 0.5, y: qY + 0.04, w: W - M - 1.0, h: 0.58, fontSize: 11, fontFace: 'Cambria', italic: true, color: BORDO, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
    hline(s, M, qY + 0.62, W - 2 * M);
  }

  // 4 · FORÇAS
  {
    const s = pres.addSlide(); slideHeader(s, '02', 'Forças e Diferenciais');
    const colW = (W - 2 * M - 0.28) / 2, rowH = 1.52, gap = 0.14, startY = 1.04;
    d.forcas.forEach((f, i) => {
      const x = M + (i % 2) * (colW + 0.28), y = startY + Math.floor(i / 2) * (rowH + gap);
      s.addShape(SH.rect, { x, y, w: colW, h: rowH, fill: { color: CINZA1 } });
      s.addShape(SH.rect, { x, y, w: 0.06, h: rowH, fill: { color: BORDO } });
      s.addShape(SH.rect, { x: x + 0.1, y: y + 0.12, w: 0.36, h: 0.3, fill: { color: BORDO } });
      s.addText(`F${i + 1}`, { x: x + 0.1, y: y + 0.12, w: 0.36, h: 0.3, fontSize: 10, fontFace: 'Calibri', bold: true, color: BRANCO, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
      s.addText(f.titulo, { x: x + 0.52, y: y + 0.1, w: colW - 0.62, h: 0.36, fontSize: 12, fontFace: 'Cambria', bold: true, color: BORDO, valign: 'middle', isTextBox: true, margin: 0 });
      s.addText(f.texto, { x: x + 0.12, y: y + 0.52, w: colW - 0.22, h: rowH - 0.62, fontSize: 10, fontFace: 'Calibri', color: TEXTO, valign: 'top', isTextBox: true, margin: 0 });
    });
  }

  // 5 · GARGALOS
  {
    const s = pres.addSlide(); slideHeader(s, '03', 'Gargalos Críticos');
    const startY = 1.04, rowH = 1.3, gap = 0.14;
    d.gargalos.forEach((g, i) => {
      const y = startY + i * (rowH + gap);
      s.addShape(SH.rect, { x: M, y, w: W - 2 * M, h: rowH, fill: { color: CINZA1 } });
      s.addShape(SH.rect, { x: M, y, w: 0.06, h: rowH, fill: { color: VERM_DEV } });
      s.addShape(SH.rect, { x: M + 0.12, y: y + 0.12, w: 0.36, h: 0.3, fill: { color: VERM_DEV } });
      s.addText(`G${i + 1}`, { x: M + 0.12, y: y + 0.12, w: 0.36, h: 0.3, fontSize: 10, fontFace: 'Calibri', bold: true, color: BRANCO, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
      s.addText(g.titulo, { x: M + 0.56, y: y + 0.1, w: W - 2 * M - 0.66, h: 0.36, fontSize: 12, fontFace: 'Cambria', bold: true, color: BORDO, valign: 'middle', isTextBox: true, margin: 0 });
      s.addText(g.texto, { x: M + 0.14, y: y + 0.5, w: W - 2 * M - 0.22, h: 0.44, fontSize: 10, fontFace: 'Calibri', color: TEXTO, valign: 'top', isTextBox: true, margin: 0 });
      s.addText(g.evidencia, { x: M + 0.14, y: y + 0.94, w: W - 2 * M - 0.22, h: 0.3, fontSize: 9, fontFace: 'Calibri', italic: true, color: BEGE, valign: 'top', isTextBox: true, margin: 0 });
    });
  }

  // 6 · ANÁLISE POR PILAR
  {
    const s = pres.addSlide(); slideHeader(s, '04', 'Análise Detalhada por Pilar');
    const cols = [{ label: 'Pilar', w: 1.9 }, { label: 'Score', w: 0.8 }, { label: 'Avaliação', w: 1.6 }, { label: 'Destaques', w: W - 2 * M - 1.9 - 0.8 - 1.6 }];
    const tableY = 1.06, rowH = 0.54;
    let curX = M;
    cols.forEach((c) => {
      s.addShape(SH.rect, { x: curX, y: tableY, w: c.w, h: rowH - 0.02, fill: { color: BORDO } });
      s.addText(c.label, { x: curX + 0.06, y: tableY, w: c.w - 0.08, h: rowH - 0.02, fontSize: 11, fontFace: 'Calibri', bold: true, color: BRANCO, valign: 'middle', isTextBox: true, margin: 0 });
      curX += c.w;
    });
    ['estrategia', 'pessoas', 'operacoes', 'financeiro', 'governanca'].forEach((k, i) => {
      const p = pil(k); const txt = d.pilares[i] || {};
      const y = tableY + rowH + i * rowH; const bg = i % 2 === 1 ? CINZA1 : BRANCO;
      curX = M;
      s.addShape(SH.rect, { x: curX, y, w: cols[0].w, h: rowH - 0.02, fill: { color: bg } });
      s.addText(p.nome + (p.indicativo ? '*' : ''), { x: curX + 0.06, y, w: cols[0].w - 0.1, h: rowH - 0.02, fontSize: 11, fontFace: 'Calibri', bold: true, color: BORDO, valign: 'middle', isTextBox: true, margin: 0 });
      curX += cols[0].w;
      s.addShape(SH.rect, { x: curX, y, w: cols[1].w, h: rowH - 0.02, fill: { color: bg } });
      s.addText(`${f1(p.score)} / 5`, { x: curX + 0.04, y, w: cols[1].w - 0.06, h: rowH - 0.02, fontSize: 11, fontFace: 'Calibri', color: TEXTO, valign: 'middle', isTextBox: true, margin: 0 });
      curX += cols[1].w;
      s.addShape(SH.rect, { x: curX, y, w: cols[2].w, h: rowH - 0.02, fill: { color: bg } });
      s.addShape(SH.rect, { x: curX + 0.06, y: y + 0.1, w: 1.4, h: rowH - 0.24, fill: { color: corAval(p.avaliacao) } });
      s.addText(p.avaliacao || '–', { x: curX + 0.06, y: y + 0.1, w: 1.4, h: rowH - 0.24, fontSize: 9, fontFace: 'Calibri', bold: true, color: BRANCO, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
      curX += cols[2].w;
      s.addShape(SH.rect, { x: curX, y, w: cols[3].w, h: rowH - 0.02, fill: { color: bg } });
      s.addText(txt.destaque || '', { x: curX + 0.06, y, w: cols[3].w - 0.1, h: rowH - 0.02, fontSize: 10, fontFace: 'Calibri', color: TEXTO, valign: 'middle', isTextBox: true, margin: 0 });
    });
    if (b.pilares.some((p) => p.indicativo)) {
      s.addText('* Financeiro indicativo: o assessment não tem bloco financeiro dedicado. Combina indicadores de performance (Q23) com a percepção de crescimento (Q5) e de tendência (Q35).', { x: M, y: tableY + rowH * 6 + 0.08, w: W - 2 * M, h: 0.3, fontSize: 8, fontFace: 'Calibri', italic: true, color: BEGE, isTextBox: true, margin: 0 });
    }
  }

  // 7 · RECOMENDAÇÕES
  {
    const s = pres.addSlide(); slideHeader(s, '05', 'Recomendações Estratégicas');
    const startY = 1.06, rowH = 0.64, gap = 0.1;
    d.recomendacoes.forEach((r, i) => {
      const y = startY + i * (rowH + gap);
      s.addShape(SH.rect, { x: M, y: y + 0.06, w: 0.36, h: 0.36, fill: { color: BORDO } });
      s.addText(`R${i + 1}`, { x: M, y: y + 0.06, w: 0.36, h: 0.36, fontSize: 10, fontFace: 'Calibri', bold: true, color: BRANCO, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
      s.addText(r.titulo, { x: M + 0.44, y: y + 0.04, w: W - 2 * M - 0.44, h: 0.34, fontSize: 12, fontFace: 'Cambria', bold: true, color: BORDO, valign: 'middle', isTextBox: true, margin: 0 });
      s.addText(r.texto, { x: M + 0.44, y: y + 0.36, w: W - 2 * M - 0.44, h: 0.3, fontSize: 9.5, fontFace: 'Calibri', color: TEXTO, valign: 'top', isTextBox: true, margin: 0 });
      hline(s, M, y + rowH + gap * 0.5, W - 2 * M);
    });
  }

  // 8 · ROADMAP
  {
    const s = pres.addSlide(); slideHeader(s, '06', 'Roadmap 30/60/90 Dias');
    const cols = [
      { title: '30 dias · Crítico', color: BORDO, items: d.roadmap.d30 },
      { title: '60 dias · Urgente', color: CINZA_BD, items: d.roadmap.d60 },
      { title: '90 dias · Importante', color: BORDO_D, items: d.roadmap.d90 },
    ];
    const colW = (W - 2 * M - 0.2) / 3, startY = 1.06, hdrH = 0.34, itemH = 0.98, itemGap = 0.1;
    let p = 0;
    cols.forEach((col, ci) => {
      const x = M + ci * (colW + 0.1);
      s.addShape(SH.rect, { x, y: startY, w: colW, h: hdrH, fill: { color: col.color } });
      s.addText(col.title, { x: x + 0.08, y: startY, w: colW - 0.12, h: hdrH, fontSize: 9.5, fontFace: 'Calibri', bold: true, color: BRANCO, valign: 'middle', isTextBox: true, margin: 0 });
      col.items.forEach((it, ii) => {
        p++;
        const y = startY + hdrH + 0.1 + ii * (itemH + itemGap);
        s.addShape(SH.rect, { x, y, w: colW, h: itemH, fill: { color: CINZA1 } });
        s.addShape(SH.rect, { x, y, w: 0.05, h: itemH, fill: { color: col.color } });
        s.addShape(SH.rect, { x: x + 0.1, y: y + 0.1, w: 0.32, h: 0.26, fill: { color: col.color } });
        s.addText(`P${p}`, { x: x + 0.1, y: y + 0.1, w: 0.32, h: 0.26, fontSize: 9, fontFace: 'Calibri', bold: true, color: BRANCO, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
        s.addText(it.acao, { x: x + 0.48, y: y + 0.08, w: colW - 0.56, h: 0.46, fontSize: 9.5, fontFace: 'Calibri', color: TEXTO, valign: 'top', isTextBox: true, margin: 0 });
        hline(s, x + 0.08, y + 0.62, colW - 0.14);
        s.addText(`Resp: ${it.responsavel}`, { x: x + 0.1, y: y + 0.66, w: colW * 0.55, h: 0.24, fontSize: 8.5, fontFace: 'Calibri', color: BEGE, isTextBox: true, margin: 0 });
        s.addText(it.prazo, { x: x + colW * 0.55 + 0.04, y: y + 0.66, w: colW * 0.4, h: 0.24, fontSize: 8.5, fontFace: 'Calibri', bold: true, color: col.color, align: 'right', isTextBox: true, margin: 0 });
      });
    });
  }

  // 9 · OKRs
  {
    const s = pres.addSlide(); slideHeader(s, '07', 'OKRs Recomendados');
    const colW = (W - 2 * M - 0.2) / 3, startY = 1.06, hdrH = 0.62;
    d.okrs.forEach((okr, ci) => {
      const x = M + ci * (colW + 0.1);
      s.addShape(SH.rect, { x, y: startY, w: colW, h: hdrH, fill: { color: BORDO } });
      s.addText(`O${ci + 1}`, { x: x + 0.04, y: startY, w: 0.44, h: hdrH, fontSize: 20, fontFace: 'Cambria', bold: true, color: STAT_LBL, valign: 'middle', align: 'center', isTextBox: true, margin: 0 });
      s.addShape(SH.rect, { x: x + 0.5, y: startY + 0.08, w: 0.03, h: hdrH - 0.16, fill: { color: STAT_LBL } });
      s.addText(okr.objetivo, { x: x + 0.6, y: startY + 0.04, w: colW - 0.68, h: hdrH - 0.08, fontSize: 10.5, fontFace: 'Cambria', bold: true, color: BRANCO, valign: 'middle', isTextBox: true, margin: 0 });
      okr.krs.forEach((kr, ki) => {
        const y = startY + hdrH + 0.08 + ki * 1.0;
        s.addShape(SH.rect, { x: x + 0.06, y: y + 0.06, w: 0.44, h: 0.24, fill: { color: BORDO } });
        s.addText(`KR${ci + 1}.${ki + 1}`, { x: x + 0.06, y: y + 0.06, w: 0.44, h: 0.24, fontSize: 8.5, fontFace: 'Calibri', bold: true, color: BRANCO, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
        s.addText(kr, { x: x + 0.06, y: y + 0.36, w: colW - 0.14, h: 0.54, fontSize: 9.5, fontFace: 'Calibri', color: TEXTO, valign: 'top', isTextBox: true, margin: 0 });
        if (ki < 2) hline(s, x + 0.06, y + 0.96, colW - 0.12);
      });
    });
  }

  // 10 · CONCLUSÃO
  {
    const s = pres.addSlide(); slideHeader(s, '08', 'Conclusão Executiva');
    s.addText(d.conclusao.headline, { x: M, y: 1.06, w: W - 2 * M, h: 0.6, fontSize: 14, fontFace: 'Cambria', bold: true, color: BORDO, valign: 'top', isTextBox: true, margin: 0 });
    s.addText(runs(d.conclusao.corpo, { color: TEXTO, fontSize: 11, fontFace: 'Calibri' }, { bold: true, color: BORDO }), { x: M, y: 1.74, w: W - 2 * M, h: 0.72, valign: 'top', isTextBox: true, margin: 0 });
    hline(s, M, 2.58, W - 2 * M);
    s.addText(`"${d.conclusao.frase}"`, { x: M + 0.6, y: 2.66, w: W - M - 1.2, h: 0.54, fontSize: 11, fontFace: 'Cambria', italic: true, color: BORDO, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
    hline(s, M, 3.24, W - 2 * M);
    s.addText('Próximos Passos', { x: M, y: 3.36, w: 4, h: 0.3, fontSize: 13, fontFace: 'Cambria', bold: true, color: BORDO, isTextBox: true, margin: 0 });
    hline(s, M, 3.68, 4);
    d.conclusao.proximos_passos.forEach((p, i) => {
      const y = 3.76 + i * 0.34;
      s.addShape(SH.rect, { x: M, y: y + 0.04, w: 0.26, h: 0.24, fill: { color: BORDO } });
      s.addText(String(i + 1), { x: M, y: y + 0.04, w: 0.26, h: 0.24, fontSize: 9, fontFace: 'Calibri', bold: true, color: BRANCO, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
      s.addText(p, { x: M + 0.34, y, w: W - 2 * M - 0.34, h: 0.32, fontSize: 10, fontFace: 'Calibri', color: TEXTO, valign: 'middle', isTextBox: true, margin: 0 });
    });
  }

  // 11 · ENCERRAMENTO
  {
    const s = pres.addSlide();
    s.addShape(SH.rect, { x: 0, y: 0, w: W, h: H, fill: { color: BORDO } });
    s.addText('E X P L O R E', { x: M, y: 0.8, w: 7, h: 1.1, fontSize: 56, fontFace: 'Cambria', bold: true, color: BRANCO, isTextBox: true, margin: 0 });
    s.addText('Desenvolvimento de Gente e Gestão', { x: M, y: 1.96, w: 6, h: 0.36, fontSize: 14, fontFace: 'Calibri', color: STAT_LBL, isTextBox: true, margin: 0 });
    s.addShape(SH.line, { x: M, y: 2.44, w: W - 2 * M, h: 0, line: { color: BORDO_D, width: 1.2 } });
    s.addText(meta('DOC: ', `PPT${versao}  ·  Diagnóstico Organizacional  ·  ${empresa}`, 10), { x: M, y: 2.56, w: W - 2 * M, h: 0.28, isTextBox: true, margin: 0 });
    s.addText(meta('Data: ', dataTxt, 10), { x: M, y: 2.86, w: W - 2 * M, h: 0.28, isTextBox: true, margin: 0 });
    s.addText(`Versão ${versao}  ·  Confidencial · Uso Interno`, { x: M, y: H - 0.54, w: W - 2 * M, h: 0.28, fontSize: 9, fontFace: 'Calibri', color: STAT_LBL, isTextBox: true, margin: 0 });
  }

  return pres;
}
