# Oriente One · v1.0.0

Base da Plataforma Oriente. Etapa 1: **Contratos, Faturamento, Relatórios e Assessments** (Diagnóstico Organizacional, Diagnóstico NR-1 com Formulários A e B; DSFE registrado e bloqueado até o questionário ser carregado).

Stack igual às outras ferramentas: **Cloudflare Pages + Pages Functions + D1 + Resend**, código no **GitHub**. Sem build: o Cloudflare publica a pasta `public/` e as funções de `functions/`.

---

## 1. Primeiro deploy (uma vez só)

### 1.1 Banco D1 (antes do primeiro push)
No painel Cloudflare: **Storage & Databases → D1 → Create** com o nome `oriente-one`.
Depois, em **Console** do banco, cole e execute todo o conteúdo de `schema.sql`.
Copie o **Database ID** e substitua `COLE_AQUI_O_ID_DO_D1` no `wrangler.toml`. Sem esse ID o Cloudflare recusa o deploy.

### 1.2 GitHub
1. Crie o repositório `oriente-one` em github.com/tsmendestsm-web (privado).
2. Extraia o ZIP em `C:\ORIENTE-ONE` e, nessa pasta:
   ```
   git init
   git add .
   git commit -m "Oriente One v1.0.0"
   git branch -M main
   git remote add origin https://github.com/tsmendestsm-web/oriente-one.git
   git push -u origin main
   ```

### 1.3 Cloudflare Pages
1. **Workers & Pages → Create → Pages → Connect to Git** → repositório `oriente-one`.
2. Build: *Framework preset* **None**, *Build command* vazio, *Build output directory* `public`.
3. Depois do primeiro deploy, em **Settings → Bindings**: confira que o D1 `DB` → `oriente-one` está ligado (vem do `wrangler.toml`; se não aparecer, adicione manualmente com o nome `DB`).
4. **Settings → Variables and Secrets** (Production):
   | Nome | Tipo | Valor |
   |---|---|---|
   | `RESEND_API_KEY` | Secret | chave da Resend |
   | `RESEND_FROM` | Text | `Oriente One <one@orientesolucoes.com>` |
   | `APP_URL` | Text | `https://one.orientesolucoes.com` |
5. **Custom domains** → `one.orientesolucoes.com`.
6. Faça um novo deploy (Deployments → Retry) para as variáveis valerem.

### 1.4 Resend
O domínio `orientesolucoes.com` já está verificado na Resend (EBIE). Se usar outro remetente, verifique o domínio antes.

### 1.5 Primeiro acesso
Abra `https://one.orientesolucoes.com`. Na primeira vez aparece a tela de configuração: crie a empresa emissora (Oriente Soluções) e o seu usuário admin. Depois, em **Configurações**, cadastre a **chave PIX**, nome e cidade do recebedor.

---

## 2. Atualizações (rotina)
```
cd C:\ORIENTE-ONE
git add .
git commit -m "mensagem sem acentos"
git push
```
O Cloudflare publica sozinho em ~1 minuto. Mudanças em `schema.sql` precisam ser executadas no Console do D1.

---

## 3. Cobrança: PIX e boleto

**Sem custo (padrão):** cada fatura emitida gera um **PIX copia e cola com QR Code**, com valor e número da fatura no identificador. A baixa é feita manualmente em *Faturamento → fatura → Dar baixa*. Se você emitir o boleto no internet banking, cole a linha digitável/link em *Editar / boleto manual* e ele sai no e-mail de cobrança.

**Boleto registrado automático (opcional, Asaas):** boleto bancário registrado não pode ser gerado pela própria plataforma: precisa de banco ou instituição de pagamento. A integração com o Asaas já está pronta e liga quando você cadastrar os secrets:
| Nome | Valor |
|---|---|
| `ASAAS_API_KEY` | chave da API (Asaas → Integrações) |
| `ASAAS_ENV` | `sandbox` para testar; apague para produção |
| `ASAAS_WEBHOOK_TOKEN` | um texto aleatório criado por você |

No Asaas, crie o webhook de **cobranças** apontando para `https://one.orientesolucoes.com/api/webhooks/asaas` com o mesmo token. A baixa passa a ser automática quando o cliente paga.
⚠️ O Asaas cobra tarifa por boleto pago. Isso fere a regra de stack 100% gratuita, por isso fica desligado até você decidir.

---

## 4. Como funciona

**Contrato** → modalidade *mensal* (gera fatura por competência no botão "Gerar faturamento"), *parcelado* ou *único* (faturas agendadas na criação; última parcela absorve os centavos).
**Fatura** → emitir (PIX/boleto) → enviar por e-mail (Resend) → baixa ou baixa automática (Asaas) → estorno se necessário. Cancelamento só para faturas em aberto.
**Relatórios** (filtro de clientes ativos, por mês, exportação CSV para Excel):
- *Clientes*: recorrência, faturado, recebido, a vencer, vencido, último pagamento.
- *Faturamento*: matriz cliente × competência.
- *Recebimento*: matriz cliente × mês do pagamento + previsto, liquidado, pago em dia, em atraso e % de inadimplência por mês de vencimento.
- *Inadimplência*: por cliente e por fatura, com aging 1-30 / 31-60 / 61-90 / 90+.

**Assessments** → a partir de um contrato ativo, "Enviar diagnóstico". O sponsor recebe um e-mail com a página de QR Codes (cartazes para imprimir, PNG para WhatsApp, links e contador de respostas). NR-1 cria os dois formulários juntos.
Resultado na plataforma, com exportação CSV das respostas.

### Regras de cálculo (editáveis em `src/scoring.js`)
- **Organizacional:** média 1 a 5 por pilar (Liderança & Decisão, Pessoas & Comportamento, Operação & Execução, Direção & Cultura, Percepção & Maturidade). Itens 32 e 33 com pontuação invertida. Faixas: ≥ 4,0 Muito boa · ≥ 3,0 Boa · abaixo Em desenvolvimento.
- **NR-1:** índice 0 a 100 = (média − 1) ÷ 4 × 100. Consolidado = A × 40% + B × 60%. Faixas ≥ 70 ADEQUADO · 50 a 69,9 ATENÇÃO · < 50 CRÍTICO. Divergência crítica A × B ≥ 15 pontos. "Não se aplica" (trabalho emocional e terceiros) fica fora da média.

### Perfis de usuário
admin (tudo) · financeiro (contratos e cobranças) · consultor (clientes e assessments).

---

## 5. Carregar o DSFE
Em `src/instruments.js`, preencha `DSFE.intro`, `DSFE.profile` e `DSFE.sections` no mesmo formato dos outros instrumentos e troque `emConstrucao: true` para `false`. O envio é liberado automaticamente.

---

## 6. Rodar localmente (opcional)
```
npm install
npx wrangler d1 execute oriente-one --local --file=schema.sql
npx wrangler pages dev
```
Abra http://localhost:8788. Para testar e-mail localmente, crie `.dev.vars` com `RESEND_API_KEY=...` (o arquivo não vai para o GitHub).

## Estrutura
```
public/        interface (painel, assessment.html, sponsor.html, vendor/qrcode.js)
functions/     rotas: /api/*, /a/:token (formulário), /s/:token (sponsor)
src/           api.js, instruments.js, scoring.js, pix.js, asaas.js, mail.js
schema.sql     banco D1
```
