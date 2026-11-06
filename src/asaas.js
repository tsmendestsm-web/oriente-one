// Oriente One v1.3.0 | Adaptador de boleto registrado via Asaas (opcional).
// Ativado quando os secrets ASAAS_API_KEY (e opcionalmente ASAAS_ENV=sandbox) estão configurados.
const base = (env) => (env.ASAAS_ENV === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3');

async function call(env, method, path, body) {
  const r = await fetch(base(env) + path, {
    method,
    headers: { 'Content-Type': 'application/json', access_token: env.ASAAS_API_KEY, 'User-Agent': 'OrienteOne' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.errors?.map((e) => e.description).join('; ') || `Asaas HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data;
}

export const asaasAtivo = (env) => !!env.ASAAS_API_KEY;

export async function garantirCliente(env, cliente) {
  if (cliente.asaas_customer_id) return cliente.asaas_customer_id;
  const doc = String(cliente.cnpj || '').replace(/\D/g, '');
  if (doc) {
    const found = await call(env, 'GET', `/customers?cpfCnpj=${doc}`);
    if (found?.data?.length) return found.data[0].id;
  }
  const c = await call(env, 'POST', '/customers', {
    name: cliente.razao_social,
    cpfCnpj: doc || undefined,
    email: cliente.email_financeiro || undefined,
    mobilePhone: String(cliente.telefone || '').replace(/\D/g, '') || undefined,
    postalCode: String(cliente.cep || '').replace(/\D/g, '') || undefined,
    externalReference: `cliente-${cliente.id}`,
    notificationDisabled: true,
  });
  return c.id;
}

export async function emitirBoleto(env, { customerId, fatura, descricao }) {
  const p = await call(env, 'POST', '/payments', {
    customer: customerId,
    billingType: 'BOLETO',
    value: Number(fatura.valor),
    dueDate: fatura.vencimento,
    description: descricao,
    externalReference: `fatura-${fatura.id}`,
  });
  let linha = null;
  try {
    const f = await call(env, 'GET', `/payments/${p.id}/identificationField`);
    linha = f.identificationField || null;
  } catch { /* linha digitável pode demorar alguns segundos no sandbox */ }
  return { id: p.id, url: p.bankSlipUrl || p.invoiceUrl, linha };
}

export async function cancelarBoleto(env, paymentId) {
  return call(env, 'DELETE', `/payments/${paymentId}`);
}
