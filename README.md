# Simulador de Empréstimo Consignado

MVP de um simulador de consignado que consulta vários bancos fictícios ao mesmo tempo, consolida as respostas e mostra o resultado de cada instituição. Bancos, birô de crédito e dados são todos fictícios.

## Como executar

Requisitos: Node.js 20 ou superior e npm.

**Backend** (porta 3000):

```bash
cd backend
npm install
npm run dev
```

**Frontend** (porta 5173), em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173. Se a API estiver em outro endereço, defina a variável `VITE_API_URL` antes de subir o frontend.

**Testes** (52 testes automatizados):

```bash
cd backend
npm test
npm run typecheck
```

### Roteiro de teste rápido

Na tela, use CNPJ `11.222.333/0001-81`, salário `3500`, valor `R$ 10.000` e prazo de `24` meses (valores padrão dos controles), com o consentimento marcado. O birô fictício define o perfil pelo **último dígito do CPF**:

| CPF | Perfil | Resultado esperado |
|---|---|---|
| `529.982.247-25` | bom (score 625) | os três bancos aprovam |
| `987.654.321-00` | negativado | Banco Imperial reprova; Sterling & Co. aprova com taxa maior (2,70% a.m.) |
| `147.258.369-82` | score baixo (400) | Banco Imperial reprova por score |

Os CPFs e CNPJs são números de teste, gerados por algoritmo. Os bancos também simulam latência e falhas aleatórias, então ao repetir a simulação é normal um banco aparecer como "Indisponível".

## API

`GET /health` responde `{ "status": "ok" }`.

`POST /simulations`

```json
{
  "nome": "Maria Silva",
  "email": "maria@email.com",
  "cpf": "529.982.247-25",
  "salario": 3500,
  "cnpjEmpregador": "11.222.333/0001-81",
  "valorSolicitado": 10000,
  "prazoMeses": 24,
  "consentimento": true
}
```

Resposta `201` (resumida):

```json
{
  "id": "c3b5c036-486d-40bf-b2d6-387e6a173b98",
  "criadoEm": "2026-10-25T12:00:00.000Z",
  "solicitante": { "nome": "Maria Silva", "email": "maria@email.com", "cpf": "***.982.247-**" },
  "valorSolicitado": 10000,
  "prazoMeses": 24,
  "resultados": [
    { "banco": "Aurora Bank", "status": "APROVADO", "taxaMensal": 0.0179, "valorParcela": 516.22, "valorTotal": 12389.28 },
    { "banco": "Banco Imperial", "status": "REPROVADO", "motivo": "Restrição em órgão de proteção ao crédito" }
  ],
  "melhorOferta": { "banco": "Aurora Bank", "status": "APROVADO", "...": "mesmo formato de um item de resultados" },
  "resumo": { "aprovados": 1, "reprovados": 1, "indisponiveis": 0 }
}
```

Erros:

- `400`: dados inválidos, com a mensagem de cada campo: `{ "erro": "Dados inválidos", "campos": { "cpf": "CPF inválido" } }`.
- `500`: erro interno, com mensagem genérica (o detalhe fica só no log).

## Visão geral

```
Cliente → Frontend (React) → POST /simulations → Backend (Fastify)
                                                   │
              validação (Zod) ──────────────────────┤
              consulta ao birô (1x) ────────────────┤
              bancos em paralelo (allSettled) ──────┤
              consolidação e ordenação ─────────────┘
```

### Estrutura do backend

```
backend/src
├── domain/       tipos do negócio (sem dependência de framework)
├── validators/   CPF, CNPJ e schema da simulação (Zod)
├── providers/    interface BankProvider + um adaptador por banco
│   └── external/ APIs fictícias dos bancos e do birô (a "caixa-preta" de terceiros)
├── services/     orquestração da simulação e adaptador do birô
├── routes/       rota HTTP
└── shared/       erros, timeout, máscara de CPF, cálculo financeiro
backend/tests     testes automatizados (Vitest)
```

### Estrutura do frontend

```
frontend/src
├── api.ts, types.ts, format.ts   chamada à API, tipos, máscaras e formatação
├── App.tsx                       tela principal
└── components/
    ├── SimulationForm.tsx        formulário em 3 etapas
    ├── Results.tsx               melhor oferta e resposta de cada banco
    └── LoadingOverlay.tsx        tela de carregamento
```

### Regras dos bancos (fictícias)

| Banco | Taxa | Regras |
|---|---|---|
| Aurora Bank | 1,79% a.m. | parcela até 35% do salário; ignora negativação |
| Banco Imperial | 23,88% a.a. | salário mínimo de R$ 2.000; parcela até 30% do salário; reprova negativado ou score abaixo de 500 |
| Sterling & Co. | 2,10% a.m. | limite de R$ 50.000; parcela até 40% do salário; negativado ou sem consulta ao birô paga +0,6 p.p. ao mês |

A parcela é calculada pela tabela Price. Cada banco responde em um formato diferente (JSON em inglês, códigos numéricos, textos como `"R$ 534,80"`), e os adaptadores traduzem tudo para um modelo único.

### Birô de crédito fictício

Devolve `{ negativado, score }` a partir do último dígito do CPF, para o resultado ser reproduzível nos testes: final 0 ou 1 é negativado, final 2 ou 3 tem score abaixo de 500, e final de 4 a 9 tem score bom.

## Decisões técnicas

- **Padrão adaptador nas integrações.** O serviço só conhece a interface `BankProvider`. Cada banco tem a sua API fictícia (formato próprio) e um adaptador que valida e traduz a resposta. Incluir um banco novo é criar o adaptador e registrá-lo em `providers/index.ts`. O birô segue o mesmo padrão (`CreditBureau`).
- **Consulta em paralelo com `Promise.allSettled`.** A falha de um banco nunca derruba a simulação: ele aparece como `INDISPONIVEL` e os demais seguem normalmente.
- **Três estados, não dois.** `REPROVADO` é decisão de crédito; `INDISPONIVEL` é falha técnica (timeout, rede, resposta fora do contrato). Misturar os dois levaria o cliente a achar que foi recusado quando o banco apenas não respondeu.
- **Timeout e retry seletivo.** Cada chamada tem timeout de 3 s e até 1 nova tentativa, só para falha de rede. Timeout (para não dobrar a espera do cliente) e resposta fora do contrato (que não melhora tentando de novo) não são repetidos.
- **Resposta fora do contrato vira erro explícito** (`BankIntegrationError`), e não um resultado errado passando como válido.
- **Validação na borda.** O Zod valida a entrada (CPF e CNPJ com dígito verificador, limites de valor e prazo, consentimento) e normaliza os dados antes de qualquer regra de negócio. Os erros voltam por campo, e o frontend não duplica essas regras.
- **Erros sem vazamento.** O cliente recebe mensagens genéricas; o detalhe técnico fica só no log.
- **Dados pessoais protegidos.** O CPF é mascarado na resposta e nos logs, e o campo de consentimento é removido antes de chegar aos bancos.
- **Testabilidade.** `app.ts` e `server.ts` são separados, e as APIs dos bancos e do birô são injetadas nos adaptadores, então os testes rodam sem rede, sem atraso e sem falhas aleatórias.
- **Ordenação da resposta.** Aprovados primeiro (do menor para o maior total a pagar), depois reprovados, depois indisponíveis. A melhor oferta é a de menor valor total.

## Limitações

- Bancos, birô e regras de crédito são **inventados**; não há integração real.
- CPF e CNPJ têm só o **formato validado** (dígito verificador). Não há consulta à Receita Federal, e o CNPJ do empregador não influencia nenhuma decisão.
- O consentimento é uma caixa de seleção validada no backend, mas **não é registrado** (sem trilha de auditoria).
- Sem banco de dados: as simulações não são salvas nem consultáveis depois.
- Sem autenticação, limite de requisições (rate limit) ou HTTPS; o CORS está aberto para desenvolvimento.
- Valores monetários usam `number` com arredondamento em duas casas; um sistema real usaria decimais exatos.
- A porta do backend (3000) é fixa no código.
- O birô é consultado antes dos bancos, então soma sua latência ao tempo de espera (limitada pelo timeout).
- O frontend não tem testes automatizados, e o controle de valor vai até R$ 100 mil, embora a API aceite até R$ 200 mil.

## Espaço para propor

### Implementadas

**1. Falha parcial de bancos não pode derrubar a simulação**
- **Problema:** a empresa depende de serviços de terceiros que ela não controla. Com consulta sequencial ou sem tratamento de erro, um banco lento ou fora do ar travaria ou quebraria a simulação inteira para o cliente.
- **Proposta:** consulta em paralelo, timeout por banco, retry apenas para falhas de rede e status próprio `INDISPONIVEL`, com aviso na tela para tentar de novo.
- **Por quê:** o cliente sempre recebe a resposta dos bancos que funcionam, em tempo limitado, e entende que "indisponível" não significa recusa.

**2. Birô de crédito fictício com política de crédito por banco**
- **Problema:** o consignado tem garantia de desconto em folha, então estar negativado nem sempre impede a contratação, e cada banco trata esse risco de um jeito. Ignorar o histórico do cliente deixaria a simulação irreal e sem explicação para as recusas.
- **Proposta:** uma consulta única a um birô fictício (negativação e score), entregue a todos os bancos. Cada um aplica a sua política: o Aurora Bank ignora, o Banco Imperial reprova e a Sterling & Co. aprova com taxa maior. Se o birô cair, a simulação continua sem o perfil; o Banco Imperial, que exige a consulta, fica indisponível, e a Sterling & Co. cobra a taxa de risco por precaução.
- **Por quê:** o cliente vê o motivo de cada recusa e compara condições diferentes de forma realista, e a falha de uma dependência extra não derruba o serviço.

**3. Privacidade e consentimento (LGPD)**
- **Problema:** a simulação manipula CPF e consulta histórico de crédito, que são dados pessoais sensíveis.
- **Proposta:** consentimento explícito antes da consulta, validado no backend; CPF mascarado na resposta e nos logs; mensagens de erro genéricas para o cliente.
- **Por quê:** reduz a exposição de dados em caso de vazamento de logs e deixa claro para o cliente o que está sendo consultado.

**4. Comparação facilitada e formulário em etapas**
- **Problema:** um formulário longo e uma lista de resultados sem hierarquia obrigam o cliente a comparar sozinho.
- **Proposta:** formulário em 3 etapas com máscaras, validação por campo (o formulário volta à etapa com erro), tela de carregamento, cartão de melhor oferta e indicação da economia em relação à oferta aprovada mais cara.
- **Por quê:** menos abandono no preenchimento e decisão mais rápida na leitura do resultado.

### Planejadas (em ordem de prioridade)

**1. Circuit breaker por banco**
- **Problema:** se um banco ficar fora do ar por muito tempo, cada simulação ainda espera o timeout completo por ele.
- **Proposta:** abrir o circuito após falhas consecutivas, marcar o banco como indisponível imediatamente e testar a recuperação aos poucos.
- **Por quê:** reduz o tempo de espera do cliente e evita sobrecarregar um banco já instável.

**2. Processamento assíncrono com acompanhamento de status**
- **Problema:** hoje o cliente fica esperando a resposta mais lenta (até o timeout) com a conexão aberta.
- **Proposta:** a API responde com um identificador, as consultas rodam em fila e a tela mostra cada banco assim que responde.
- **Por quê:** o cliente vê os primeiros resultados mais cedo e o serviço aguenta mais simulações simultâneas.

**3. Idempotência e cache curto**
- **Problema:** duplo clique ou nova tentativa dispara consultas repetidas aos bancos, que podem cobrar por chamada ou impor limites.
- **Proposta:** chave de idempotência por simulação e cache de poucos minutos para o mesmo CPF e os mesmos parâmetros.
- **Por quê:** menos custo e carga nos terceiros, e respostas consistentes.

**4. Segurança de acesso e auditoria**
- **Problema:** a API é aberta e o consentimento não fica registrado.
- **Proposta:** autenticação, rate limit, HTTPS, criptografia de dados pessoais em repouso e registro de consentimento com data e finalidade.
- **Por quê:** protege contra abuso e dá comprovação legal da autorização do cliente.

**5. Observabilidade**
- **Problema:** hoje não dá para saber qual banco está lento ou falhando.
- **Proposta:** métricas de latência, taxa de erro e de aprovação por banco, com alertas.
- **Por quê:** a operação detecta degradações antes de o cliente reclamar e negocia com os bancos com dados na mão.

**6. Qualidade e infraestrutura**
- **Proposta:** pipeline de CI (testes e typecheck a cada push), Docker Compose para subir tudo com um comando e testes automatizados do frontend.
- **Por quê:** impede regressões e facilita a execução por qualquer pessoa da equipe.

## Uso de IA

Utilizei IA (Claude) como apoio ao longo do desenvolvimento, em especial na lógica do birô de crédito fictício e em ajustes no código. Além disso, utilizei para possíveis erros gramáticos no README e ajuste na estrutura do texto. Executei os testes automatizados, validei a aplicação rodando localmente e consigo explicar as decisões e o funcionamento de cada parte do projeto.