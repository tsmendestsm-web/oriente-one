// Oriente One v1.3.0 | PIX BR Code (copia e cola) com valor e identificador. Padrão EMV/BACEN, sem custo.
const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;

const strip = (s, max) =>
  String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, '')
    .toUpperCase().trim().slice(0, max);

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function pixCopiaCola({ chave, nome, cidade, valor, txid, descricao }) {
  if (!chave) return null;
  const mai = tlv('00', 'br.gov.bcb.pix') + tlv('01', chave.trim()) + (descricao ? tlv('02', strip(descricao, 40)) : '');
  const tx = (String(txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25)) || '***';
  let p =
    tlv('00', '01') +
    tlv('26', mai) +
    tlv('52', '0000') +
    tlv('53', '986') +
    (valor ? tlv('54', Number(valor).toFixed(2)) : '') +
    tlv('58', 'BR') +
    tlv('59', strip(nome, 25) || 'RECEBEDOR') +
    tlv('60', strip(cidade, 15) || 'BRASIL') +
    tlv('62', tlv('05', tx)) +
    '6304';
  return p + crc16(p);
}
