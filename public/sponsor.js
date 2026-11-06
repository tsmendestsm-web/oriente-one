// Oriente One v1.3.0 | Página do sponsor: QR Codes para divulgação
import { esc, api, qrSvg, copiar, dataBR } from './ui.js';

const token = location.pathname.split('/').filter(Boolean).pop();
const root = document.getElementById('root');

function baixarPng(svgEl, nome) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = c.height = 1000;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1000, 1000); g.drawImage(img, 0, 0, 1000, 1000);
    const a = document.createElement('a'); a.download = nome + '.png'; a.href = c.toDataURL('image/png'); a.click();
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
}

(async () => {
  try {
    const d = await api(`/public/s/${token}`);
    document.title = `${d.produto} · ${d.empresa}`;
    root.innerHTML = `<div class="pub-head"><div class="in"><div class="brand">ORIENTE <span>ONE</span></div>
      <h1>${esc(d.produto)}</h1><p>${esc(d.empresa)}${d.unidade ? ' · ' + esc(d.unidade) : ''} · sponsor: ${esc(d.sponsor)}</p></div></div>
      <div class="pub-main">
        <div class="card no-print"><h2>Como divulgar</h2>
          <p>Compartilhe o QR Code ou o link com cada público. Você pode imprimir os cartazes (um por página), baixar o QR Code em imagem para enviar por WhatsApp ou e-mail, ou copiar o link.</p>
          ${d.prazo ? `<p><b>Prazo para respostas:</b> ${dataBR(d.prazo)}</p>` : ''}
          ${d.status !== 'aberto' ? '<p class="note">A coleta deste diagnóstico está encerrada.</p>' : ''}
          <button class="btn primary" onclick="print()">Imprimir cartazes</button></div>
        <div class="grid ${d.campanhas.length > 1 ? 'g2' : ''}">
          ${d.campanhas.map((c, i) => `<div class="card poster">
            <div class="small muted">${esc(d.empresa)}</div>
            <h2>${esc(c.nome)}</h2>
            <p class="muted" style="margin:0 0 16px">${esc(c.publico)}${c.anonimo && !/anônim/i.test(c.publico) ? ' · 100% anônimo' : ''}</p>
            <div class="qr" id="qr${i}">${qrSvg(c.url, 8)}</div>
            <ol class="steps"><li>Aponte a câmera do celular para o QR Code.</li><li>Toque no link que aparecer.</li><li>Responda com sinceridade. Leva poucos minutos.</li></ol>
            <div class="no-print" style="margin-top:18px">
              <div class="linkbox" style="max-width:420px;margin:0 auto"><input readonly value="${esc(c.url)}"><button class="btn sm" data-copy="${esc(c.url)}">Copiar link</button></div>
              <button class="btn sm" style="margin-top:8px" data-png="${i}">Baixar QR Code (PNG)</button>
              <p class="small muted" style="margin-top:12px"><b>${c.respostas}</b> resposta(s) recebida(s)${c.meta ? ` de ${c.meta} esperadas` : ''}</p>
            </div></div>`).join('')}
        </div></div>`;
    root.querySelectorAll('[data-copy]').forEach((b) => (b.onclick = () => copiar(b.dataset.copy)));
    root.querySelectorAll('[data-png]').forEach((b) => (b.onclick = () => baixarPng(document.querySelector(`#qr${b.dataset.png} svg`), `qrcode-${d.campanhas[b.dataset.png].nome}`.replace(/[^\w-]+/g, '_'))));
  } catch (e) {
    root.innerHTML = `<div class="pub-main"><div class="card center"><h2>Link inválido</h2><p class="muted">${esc(e.message)}</p></div></div>`;
  }
})();
