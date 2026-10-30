# Oriente One · v1.1.0

Base da Plataforma Oriente. Etapa 1: **Contratos, Faturamento, Relatórios e Assessments** (Diagnóstico Organizacional, Diagnóstico NR-1 com Formulários A e B; DSFE registrado e bloqueado até o questionário ser carregado).

**Novo na v1.1.0:** motor de geração do Diagnóstico Organizacional EXPLORE dentro da plataforma (respostas → relatório → PPTX de 11 slides) e contrato amarrado ao serviço contratado.

Stack igual às outras ferramentas: **Cloudflare Pages + Pages Functions + D1 + Resend**, código no **GitHub**. Sem build: o Cloudflare publica a pasta `public/` e as funções de `functions/`.

---

## 0. Atualizar da v1.0.0 para a v1.1.0
1. Substitua os arquivos em `C:\ORIENTE-ONE` pelos do ZIP novo (mantenha a pasta `.git`).
2. No **Console do D1**, cole e execute o `schema.sql` inteiro de novo. Ele só cria o que falta (a tabela `diagnosticos`) e não apaga nada.
3. Em **Settings → Variables and Secrets**, adicione `GEMINI_API_KEY` (veja 1.3).
4. `git add .` → `git commit -m "Oriente One v1.1.0"` → `git push`.
5. Contratos criados antes sem serviço: abra cada um, **Editar**, e escolha o serviço contratado.

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
1. **Workers & Pages → Create → aba Pages → Import an existing Git repository** → `oriente-one`. Não use o fluxo de Worker: se aparecer um campo "Deploy command", você está no lugar errado.
2. Build: *Framework preset* **None**, *Build command* vazio, *Build output directory* `public`.
3. Depois do primeiro deploy, em **Settings → Bindings**: confira que o D1 `DB` → `oriente-one` está ligado (vem do `wrangler.toml`; se não aparecer, adicione manualmente com o nome `DB`).
4. **Settings → Variables and Secrets** (Production):
   | Nome | Tipo | Valor |
   |---|---|---|
   | `RESEND_API_KEY` | Secret | chave da Resend |
   | `RESEND_FROM` | Text | `Oriente One <one@orientesolucoes.com>` |
   | `APP_URL` | Text | `https://one.orientesolucoes.com` |
   | `GEMINI_API_KEY` | Secret | chave gratuita em aistudio.google.com → Get API key (a mesma conta do EBIE serve) |
   | `GEMINI_MODEL` | Text | opcional; padrão `gemini-2.5-flash` |
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

**Contrato × serviço** → todo contrato registra **um serviço cadastrado e ativo**. Só o diagnóstico vinculado a esse serviço aparece no contrato (botão "Enviar Diagnóstico …"); serviços sem diagnóstico não liberam nenhum. A plataforma recusa enviar outro diagnóstico, e o serviço fica travado depois do primeiro envio. O vínculo serviço → diagnóstico é definido em **Configurações → Serviços**.

**Assessments** → a partir de um contrato ativo, "Enviar diagnóstico". O sponsor recebe um e-mail com a página de QR Codes (cartazes para imprimir, PNG para WhatsApp, links e contador de respostas). NR-1 cria os dois formulários juntos.
Resultado na plataforma, com exportação CSV das respostas.

### Regras de cálculo (editáveis em `src/scoring.js`)
- **Organizacional:** média 1 a 5 por pilar (Liderança & Decisão, Pessoas & Comportamento, Operação & Execução, Direção & Cultura, Percepção & Maturidade). Itens 32 e 33 com pontuação invertida. Faixas: ≥ 4,0 Muito boa · ≥ 3,0 Boa · abaixo Em desenvolvimento.
- **NR-1:** índice 0 a 100 = (média − 1) ÷ 4 × 100. Consolidado = A × 40% + B × 60%. Faixas ≥ 70 ADEQUADO · 50 a 69,9 ATENÇÃO · < 50 CRÍTICO. Divergência crítica A × B ≥ 15 pontos. "Não se aplica" (trabalho emocional e terceiros) fica fora da média.

### Perfis de usuário
admin (tudo) · financeiro (contratos e cobranças) · consultor (clientes e assessments).

---

## 5. Motor do Diagnóstico Organizacional EXPLORE
Em **Assessments → projeto → aba Diagnóstico EXPLORE**:

1. **Gerar com IA** (precisa de `GEMINI_API_KEY`) ou **Gerar via Claude** (sem chave: a plataforma monta o prompt, você cola no Claude e devolve o JSON).
2. Revise na tela; **Editar texto** abre todos os campos com contador de caracteres no limite que cabe no slide, e a versão do documento (PPT2026.x).
3. **Exportar PPTX** gera no navegador o deck de 11 slides no padrão bordeaux: `EXPLORE - PPT{versão} - Diagnostico Organizacional - {Cliente}.pptx`.

Como funciona: o motor usa o **Prompt Mestre EXPLORE** (`src/motor-org.js`). Os números são calculados pela plataforma e não passam pela IA; a IA escreve apenas a análise. Nomes e e-mails dos respondentes não são enviados à IA (aparecem só na capa do PPTX).

Pilares do Prompt Mestre a partir das 29 questões de escala:
| Pilar | Questões |
|---|---|
| Estratégia | Q6, Q11, Q26, Q28, Q31, Q34 |
| Pessoas | Q13 a Q18 |
| Operações | Q20, Q21, Q22, Q24, Q25 |
| Financeiro (indicativo) | Q23 + percepção de crescimento (Q5) e tendência (Q35) |
| Governança | Q7, Q8, Q9, Q10, Q12, Q19, Q27, Q29, Q30, Q32, Q33 |

O assessment não tem bloco financeiro dedicado; por isso o pilar Financeiro sai marcado como indicativo no relatório e no PPTX. Se chegarem respostas depois da geração, a tela avisa para regenerar.
Privacidade: na camada gratuita do Gemini, o Google pode usar os dados enviados para melhorar os produtos. Os dados vão sem identificação de respondentes; para clientes sensíveis, use a via Claude.

---

## 6. Carregar o DSFE
Em `src/instruments.js`, preencha `DSFE.intro`, `DSFE.profile` e `DSFE.sections` no mesmo formato dos outros instrumentos e troque `emConstrucao: true` para `false`. O envio é liberado automaticamente.

---

## 7. Rodar localmente (opcional)
```
npm install
npx wrangler d1 execute oriente-one --local --file=schema.sql
npx wrangler pages dev
```
Abra http://localhost:8788. Para testar e-mail localmente, crie `.dev.vars` com `RESEND_API_KEY=...` (o arquivo não vai para o GitHub).

## Estrutura
```
public/        interface (painel, assessment.html, sponsor.html, deck.js, vendor/qrcode.js, vendor/pptxgen.bundle.js)
functions/     rotas: /api/*, /a/:token (formulário), /s/:token (sponsor)
src/           api.js, instruments.js, scoring.js, motor-org.js, pix.js, asaas.js, mail.js
schema.sql     banco D1
```
