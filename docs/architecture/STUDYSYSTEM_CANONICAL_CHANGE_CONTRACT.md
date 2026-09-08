# StudySystem — Canonical Change Contract

```text
CONTRACT_NAME=STUDYSYSTEM_CANONICAL_CHANGE_CONTRACT
CONTRACT_STATUS=CANONICAL
CONTRACT_SCOPE=CHANGE_GOVERNANCE
CONTRACT_VERSION=1.0
```

## 1. Papel e precedência

Este contrato governa como mudanças são avaliadas, classificadas e autorizadas. Ele não substitui os contratos canônicos de domínio e não contém toda a arquitetura nem toda a especificação funcional.

A precedência operacional é:

1. `AGENTS.md` — contrato de entrada e orientação para agentes;
2. este contrato — governança global da mudança;
3. autoridade canônica do domínio afetado;
4. `docs/STATUS.md` — realidade operacional corrente;
5. `docs/PLANO.md` — Gate e ação atualmente autorizados.

O estado operacional mutável deve ser consultado em `docs/STATUS.md`. A ordem autorizada de Gates deve ser consultada em `docs/PLANO.md`. Este contrato não hardcodifica SHA corrente da `main`.

## 2. Mapa de autoridades

| Domínio | Autoridade canônica |
|---|---|
| Governança de mudanças | `docs/architecture/STUDYSYSTEM_CANONICAL_CHANGE_CONTRACT.md` |
| Produto e escopo | `docs/product/STUDYSYSTEM_PRD.md` |
| Arquitetura, dados e segurança | `docs/architecture/STUDYSYSTEM_EXECUTION_CONTRACT.md` |
| Comportamento funcional | `docs/FSD.md` |
| UX/UI | `docs/DESIGN.md` |
| PoC e aceitação | `docs/POC_ACCEPTANCE.md` |
| Estado operacional | `docs/STATUS.md` |
| Ordem/Gates | `docs/PLANO.md` |
| Incidentes | `docs/ERROS.md` |

## 3. Precheck obrigatório

Antes de qualquer alteração, o executor deve ler `AGENTS.md`, este contrato, a autoridade do domínio afetado, `docs/STATUS.md` e `docs/PLANO.md` quando houver execução/Gate. Deve conferir branch, baseline, worktree, escopo e limites de segurança.

O registro mínimo é:

```text
CANONICAL_CHANGE_PRECHECK

CONTRACT_READ=SIM|NAO
CHANGE_REQUEST=
CHANGE_CLASSIFICATION=UI_SAFE|DOCUMENTATION_ONLY|CONTROLLED|PROTECTED
AFFECTED_DOMAINS=
CANONICAL_AUTHORITIES_READ=
PROTECTED_BOUNDARY_TOUCHED=SIM|NAO
FUNCTIONAL_CONTRACT_CHANGED=SIM|NAO
AUTH_CONTRACT_CHANGED=SIM|NAO
DATABASE_CONTRACT_CHANGED=SIM|NAO
PERSISTENCE_CONTRACT_CHANGED=SIM|NAO
ROUTE_CONTRACT_CHANGED=SIM|NAO
DEPENDENCY_CONTRACT_CHANGED=SIM|NAO
CHANGE_ALLOWED=SIM|NAO
REQUIRED_GATE=
STOP_REASON=
```

Se `CONTRACT_READ=NAO`, então `CHANGE_ALLOWED=NAO`. Nenhuma edição pode começar sem `CONTRACT_READ=SIM`, classificação definida e `CHANGE_ALLOWED=SIM`.

## 4. Classes de mudança

### UI_SAFE

`UI_SAFE` é uma mudança puramente de apresentação que não altera comportamento ou contrato. Pode incluir tipografia, cores, tokens, temas, ícones, espaçamento, bordas, sombras, layout, grid, composição responsiva, sidebar/header visual, componentes puramente visuais, animações não funcionais, skeletons e estados vazios somente de apresentação.

Deixa de ser `UI_SAFE` se alterar navegação semântica, permissões, carregamento de dados, hooks de negócio, services, repositories, persistência, Supabase, quiz, progresso, autenticação ou autorização.

### DOCUMENTATION_ONLY

Documentação pode ser alterada sem tocar implementação desde que não redefina comportamento por fato consumado, não contradiga código ou estado validado, não transforme desejo futuro em contrato existente, não altere silenciosamente autoridade canônica e não exponha secrets ou identidade privilegiada.

Alterar a própria governança canônica exige um Gate explícito de governança.

### CONTROLLED

Inclui contexts, hooks, stores, services, repositories, tipos/interfaces de domínio, rotas, composição de dependências, configuração Vite, `package.json`, lockfiles, CI, workflows, dependências, integrações externas e mudanças comportamentais em componentes UI.

Exige Gate específico, impacto explicitado, arquivos autorizados, testes proporcionais ao risco, evidência, rollback/reversibilidade e aprovação antes da integração.

### PROTECTED

Inclui schema Supabase, migrations, migrations históricas, RLS, grants, `SECURITY DEFINER`, RPCs críticas, Auth, roles, fronteira `service_role`, secrets, credenciais client/server, enrollment, ownership de conteúdo, fórum, perfil, persistência de quiz, persistência e recuperação de progresso, caminhos server-owned, dados privilegiados, histórico Git, force push, visibilidade do repositório, branch protection e publicação pública.

`PROTECTED` não significa que nunca possa evoluir. Significa que não pode ser alterado sem Gate explicitamente autorizado para aquela fronteira.

## 5. Contrato funcional mínimo preservado

O caminho funcional protegido é:

```text
Aluno autenticado
→ Dashboard
→ Curso
→ Aula
→ Questionário
→ Resultado
→ Persistência da tentativa
→ Persistência do progresso
→ Recuperação posterior do progresso
```

Uma mudança `UI_SAFE` não pode alterar a semântica desse fluxo.

## 6. MUST_PRESERVE

Devem ser preservados, salvo Gate específico que autorize alteração:

- `AUTH_FLOW`;
- `STUDENT_SCOPE`;
- `COURSE_ACCESS`;
- `LESSON_ACCESS`;
- `QUIZ_ACCESS`;
- `QUIZ_SUBMISSION`;
- `QUIZ_RESULT`;
- `QUIZ_ATTEMPT_PERSISTENCE`;
- `LESSON_PROGRESS_PERSISTENCE`;
- `PROGRESS_RECOVERY`;
- `RLS_BOUNDARIES`;
- `SERVER_SIDE_AUTHORIZATION`;
- `GATE_5F_SECURITY_STATE`;
- `REPOSITORY_PATTERN_BOUNDARY`;
- `PRIVATE_SECRET_BOUNDARY`.

## 7. MUST_NOT

- Não bypassar RLS.
- Não expor `service_role` ao cliente.
- Não versionar secret.
- Não substituir RPC segura por escrita direta sem Gate.
- Não criar acesso Supabase paralelo para uma nova UI.
- Não duplicar regra de negócio dentro de Frontend V2.
- Não criar fork de repository apenas para mudar aparência.
- Não reintroduzir contratos legados abandonados.
- Não reintroduzir `user_course_assignments`.
- Não reescrever migration histórica.
- Não transformar alteração de implementação em novo canon automaticamente.
- Não alterar a visibilidade do repository sem autorização.
- Não fazer history rewrite ou force push sem autorização explícita.

## 8. Frontend V2 Policy

```text
FRONTEND_V1_ROLE=FUNCTIONAL_REFERENCE
FRONTEND_V2_ROLE=PRESENTATION_EVOLUTION
```

Frontend V2 pode substituir componentes visuais e layout, criar design system e tokens, alterar tipografia, cores, apresentação da navegação, composição responsiva, organização visual e componentes puramente de apresentação.

Frontend V2 deve preservar autenticação, rotas semanticamente, contratos de dados, hooks/services/repositories existentes quando representarem o comportamento canônico, quiz, resultado, persistência, progresso, recuperação, autorização, RLS e chamadas seguras existentes.

Frontend V2 não pode criar backend paralelo, cliente Supabase alternativo, regras de negócio duplicadas, persistência paralela, bypass de repositories, segurança client-side no lugar de server-side, alteração de schema por motivo de layout ou alteração funcional sob classificação `UI_SAFE`.

Se for necessário extrair lógica de um componente que mistura apresentação e negócio, a mudança é `CONTROLLED` e requer Gate próprio.

## 9. Change impact matrix

| Área | UI_SAFE | CONTROLLED | PROTECTED |
|---|---:|---:|---:|
| Tipografia/cores/tokens | SIM | — | — |
| Layout puramente visual | SIM | — | — |
| Componente com regra de negócio | NÃO | SIM | — |
| Hooks/contexts/stores | NÃO | SIM | — |
| Services | NÃO | SIM | — |
| Repositories | NÃO | SIM | dependendo do contrato afetado |
| Rotas semânticas | NÃO | SIM | — |
| Dependências | NÃO | SIM | — |
| CI/workflows | NÃO | SIM | — |
| Auth/RLS/RPC/grants | NÃO | NÃO | SIM |
| Migrations/schema | NÃO | NÃO | SIM |
| Secrets/service_role | NÃO | NÃO | SIM |
| Git history/visibility | NÃO | NÃO | SIM |

## 10. Escalonamento e decisão de canon

Se durante uma mudança `UI_SAFE` surgir necessidade de tocar `CONTROLLED`, o executor deve parar e retornar:

```text
RESULT=BLOCKED
STOP_REASON=CHANGE_CLASSIFICATION_ESCALATION_REQUIRED
REQUIRED_CLASSIFICATION=CONTROLLED
```

Se surgir uma fronteira `PROTECTED`, deve retornar:

```text
RESULT=BLOCKED
STOP_REASON=PROTECTED_BOUNDARY_REQUIRES_EXPLICIT_GATE
```

O canon não muda automaticamente porque o código mudou. Quando implementação e canon divergirem, a divergência deve ser classificada como `CANON_CHANGE`, `IMPLEMENTATION_FIX` ou `INCIDENTAL_DIVERGENCE`. Somente Gate explicitamente autorizado pode decidir.

`CHANGE_ALLOWED=SIM` somente quando o contrato foi lido, o domínio foi identificado, as autoridades corretas foram lidas, a classificação foi definida, os arquivos estão no escopo, nenhuma fronteira superior foi tocada sem Gate, o impacto foi analisado e a validação proporcional foi definida.

## 11. Evidência e STOP

Toda conclusão de alteração deve registrar branch, baseline, arquivos modificados, classificação, autoridades lidas, testes executados, testes não executados e motivo, contratos preservados, contratos alterados, blockers, resultado e próximo Gate autorizado.

É obrigatório parar diante de baseline divergente, arquivo fora do escopo, necessidade de acessar segredo, enfraquecimento de RLS, migration histórica, mudança comportamental descoberta durante `UI_SAFE`, contrato protegido sem autorização, conflito canônico não resolvido, tentativa de atualizar canon para justificar código ou operação destrutiva não autorizada.

## 12. Governança do próprio contrato

Este contrato somente pode ser alterado quando:

```text
CHANGE_CLASSIFICATION=PROTECTED
AFFECTED_DOMAINS=CHANGE_GOVERNANCE
REQUIRED_GATE=<Gate explícito de governança>
```

O Gate deve ser específico e explicitamente autorizado para governança. Nenhum agente pode editá-lo incidentalmente durante uma feature comum.
