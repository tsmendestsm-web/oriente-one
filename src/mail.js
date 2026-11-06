// Oriente One v1.3.0 | Envio de e-mails via Resend
const NAVY = '#4A1F36';
const BORDO = '#612B4A';
const LILAS = '#DFC8D4';

export function layout(titulo, corpoHtml) {
  return `<!doctype html><html><body style="margin:0;background:#F5F0F3;font-family:Calibri,Carlito,Arial,Helvetica,sans-serif;color:#1A1A1A">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0F3;padding:24px 0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:10px;overflow:hidden">
<tr><td style="background:${NAVY};padding:20px 28px;color:#fff;font-size:13px;letter-spacing:4px;font-weight:bold;font-family:Cambria,Georgia,serif">ORIENTE <span style="color:${LILAS}">ONE</span></td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:20px;margin:0 0 16px;color:${BORDO};font-family:Cambria,Georgia,serif">${titulo}</h1>
${corpoHtml}
</td></tr>
<tr><td style="padding:16px 28px;background:#EDE6EA;color:#888888;font-size:12px">Oriente Soluções · Plataforma Oriente One</td></tr>
</table></td></tr></table></body></html>`;
}

export const botao = (href, texto) =>
  `<p style="margin:24px 0"><a href="${href}" style="background:${BORDO};color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold;display:inline-block">${texto}</a></p>`;

export async function enviarEmail(env, { to, subject, html, replyTo }) {
  if (!env.RESEND_API_KEY) return { ok: false, skipped: true, error: 'RESEND_API_KEY não configurada' };
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.RESEND_FROM || 'Oriente One <one@orientesolucoes.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo || undefined,
    }),
  });
  const data = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: data.id } : { ok: false, error: data.message || `Resend HTTP ${r.status}` };
}
