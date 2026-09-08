# StudySystem — Contrato de Entrada para Agentes

## Identidade

- REPOSITORY_CANONICAL=timbocorrea/studysystem
- O worktree é específico do ambiente; o executor deve resolvê-lo com `git rev-parse --show-toplevel`.
- O remoto `origin` deve ser validado antes da execução.
- Nenhum agente deve presumir um diretório local universal.
- Aplicação: StudySystem, uma plataforma web de estudos com cursos, aulas, questionários, progresso, gamificação e integrações opcionais.
- Stack observada: React 19, TypeScript, Vite, React Router, Supabase, PostgreSQL, Edge Functions Deno, Repository Pattern e serviços de domínio.

## Regra de entrada

Antes de alterar qualquer arquivo, o executor deve ler este documento, `docs/architecture/STUDYSYSTEM_CANONICAL_CHANGE_CONTRACT.md`, a autoridade canônica do domínio da tarefa, `docs/STATUS.md` e, quando houver execução/Gate, `docs/PLANO.md`. Em seguida deve conferir branch, HEAD, worktree e escopo autorizado.

**EXECUTOR MUST NOT ASSUME LEGACY DOCS ARE CANONICAL.**

Quando houver divergência, identificar o domínio, consultar a autoridade daquele domínio e confrontar a decisão com o código e as migrations atuais. Não inventar comportamento ausente.

Durante a criação inicial do canon, o código e as migrations auditados foram usados como evidência da realidade existente. Após a adoção do canon, se código, migration ou documentação divergirem do documento canônico do domínio, o executor deve parar e classificar a divergência. Somente um Gate autorizado pode decidir entre `CANON_CHANGE`, `IMPLEMENTATION_FIX` e `INCIDENTAL_DIVERGENCE`. Nenhum agente pode transformar uma alteração de código em novo contrato por fato consumado.

## Canon documental

| Domínio | Autoridade | Escopo |
|---|---|---|
| Governança global de mudanças | `docs/architecture/STUDYSYSTEM_CANONICAL_CHANGE_CONTRACT.md` | Classificação de mudança, limites de alteração, escalation, precheck e STOP |
| Produto e escopo | `docs/product/STUDYSYSTEM_PRD.md` | Objetivo, usuários, capacidades e limites do produto |
| Arquitetura, dados e segurança | `docs/architecture/STUDYSYSTEM_EXECUTION_CONTRACT.md` | Guardrails técnicos, Supabase, RLS, secrets e migrations |
| Comportamento funcional | `docs/FSD.md` | Fluxos, atores, pré-condições e contratos observados |
| UX/UI e responsividade | `docs/DESIGN.md` | Estados e comportamentos visuais confirmáveis |
| PoC e aceitação | `docs/POC_ACCEPTANCE.md` | Gate P0 da PoC e critérios de validação |
| Ordem de execução | `docs/PLANO.md` | Gates, estado e ações autorizadas |
| Estado operacional | `docs/STATUS.md` | Baseline, evidências, riscos e pendências |
| Incidentes | `docs/ERROS.md` | Diagnóstico e resolução de incidentes confirmados |

Os documentos em `docs/segunda-entrega/` continuam sendo os documentos acadêmicos da entrega. `docs/POC_ACCEPTANCE.md` os referencia e não os substitui.

## Referências preservadas

| Fonte | Classificação | Regra |
|---|---|---|
| `.planning/` | `LEGACY_PLANNING_REFERENCE` | Planejamento histórico; pode estar defasado |
| `.agent/` | `AGENT_SUPPORT_INFRASTRUCTURE` | Infraestrutura de agentes; não define o produto |
| `README.md` | `PUBLIC_FACING_CURRENT_DOCUMENT` | Documento de entrada e visão geral; não prevalece sobre a autoridade canônica específica de cada domínio |
| `docs/audits/` | `HISTORICAL_AUDIT_REFERENCE` | Auditorias e remediações históricas |
| `RELATORIO_REFATORACAO.md` | `HISTORICAL_TECHNICAL_REFERENCE` | Evolução/refatoração histórica |
| `ESTRATEGIA_NPM_AUDIT.md` | `SECURITY_REFERENCE` | Referência de segurança; números antigos não substituem o status atual |
| `docs/segunda-entrega/` | `CURRENT_ACADEMIC_DELIVERY_DOCUMENTS` | Formalização acadêmica da 2ª entrega |

## Arquitetura resumida

O frontend React usa rotas, contexts, hooks, TanStack Query e Zustand. Services orquestram regras e repositories isolam o acesso ao Supabase. O backend da aplicação é Supabase Auth, PostgreSQL, Storage e Edge Functions Deno; não há um backend Node monolítico identificado.

## Guardrails obrigatórios

- Nenhuma edição pode iniciar antes de `CONTRACT_READ=SIM`, `CHANGE_CLASSIFICATION` definido e `CHANGE_ALLOWED=SIM`.
- `UI_SAFE` não autoriza automaticamente alteração de hooks, services, repositories, Supabase ou contratos funcionais.
- Se houver conflito entre o Change Contract e uma autoridade de domínio sobre o conteúdo do domínio, a autoridade do domínio continua definindo o comportamento; o Change Contract define apenas se e como a mudança pode ser executada.
- Preservar React, TypeScript, Vite, Supabase e Repository Pattern.
- Não contornar repositories sem justificativa documentada e autorização.
- Não enfraquecer autenticação, autorização ou RLS.
- Nunca colocar service role, secrets ou tokens privados no cliente ou no repositório.
- Migrations são append-only por padrão; não reescrever migrations históricas.
- Não alterar Supabase remoto, RLS, migrations, CI, dependências ou deploy sem Gate específico.
- Não modificar README ou referências legadas durante um Gate que não autorize isso.
- Preservar dados; não executar comandos destrutivos sem autorização explícita.
- Manter compatibilidade web/mobile e registrar evidência de validação.

## Branch, worktree e mudanças

- Trabalhar no worktree resolvido pelo precheck e na branch autorizada do Gate.
- Criar branch local quando o briefing exigir; não fazer push sem autorização explícita.
- Fazer mudanças pequenas, reversíveis e limitadas ao escopo.
- Antes e depois da edição, executar precheck e validação de escopo.
- Não compartilhar secrets em comandos, logs ou relatórios.

## Evidência e STOP

Toda conclusão deve informar arquivos, comandos e estados observados. Código existente não equivale a validação física ou remota.

Parar imediatamente quando houver alteração fora do escopo, baseline divergente, conflito arquitetural ou de segurança não resolvido, referência de caminho inválida ou necessidade de modificar código para fazer a documentação parecer consistente. Registrar `STOP_REASON` e não declarar o canon pronto.

## Estado e sequência autorizada

```text
CURRENT_OPERATIONAL_STATE → docs/STATUS.md
AUTHORIZED_GATE_SEQUENCE → docs/PLANO.md
```

Nenhum agente pode redefinir silenciosamente contratos canônicos ou iniciar o próximo Gate sem autorização.
