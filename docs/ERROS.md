# StudySystem — Erros e Incidentes Confirmados

Este registro contém incidentes confirmados e riscos/desvios explicitamente documentados a partir de evidência dos Gates. Não é uma lista genérica de riscos. Incidentes históricos permanecem registrados mesmo quando foram resolvidos ou substituídos por evidência posterior.

## ERR-001 — Snapshot false-dirty após testes

- **Sintoma:** Gate 0 identificou worktree aparentemente sujo.
- **Causa:** `INDEX_STAT_CACHE_ANOMALY`; blobs do índice, worktree e HEAD permaneceram iguais.
- **Resolução:** refresh autorizado do índice com `git update-index --refresh`.
- **Estado:** RESOLVIDO; conteúdo não foi alterado.

## ERR-002 — Playwright local bloqueado

- **Sintoma histórico:** E2E não iniciava os testes da aplicação.
- **Causa histórica:** executável Chromium não instalado no ambiente local.
- **Classificação:** bloqueio de ambiente, não defeito confirmado da aplicação.
- **Estado:** RESOLVIDO/SUPERSEDED; a validação final executou a suíte Playwright com sucesso: 14 PASS, 3 skips condicionais e 0 FAIL.

## ERR-003 — Vulnerabilidades npm

- **Sintoma histórico:** `npm audit` registrou advisories na árvore anterior.
- **Resolução:** as faixas mínimas seguras foram registradas no `package.json` e lockfile durante o Gate técnico próprio.
- **Estado atual:** remediação concluída; a instalação reprodutível da validação encontrou 0 vulnerabilidades. Nenhuma atualização de dependência ocorreu neste ciclo documental.

## ERR-004 — README desatualizado

- **Sintoma:** README apresentava estado operacional anterior e limitações já encerradas.
- **Causa:** documentação não acompanhou o fechamento do Gate 5F, a integração privada e o freeze técnico.
- **Resolução:** atualização executada nesta sincronização documental.
- **Estado:** RESOLVIDO.

## ERR-005 — Validação Supabase remota parcial

- **Sintoma histórico:** consultas iniciais não confirmaram integralmente curso, aula e progresso.
- **Causa operacional:** timeout/ausência de evidência completa no ambiente remoto usado no Gate inicial.
- **Evidência posterior:** alinhamento remoto final confirmado; migration `20260829125951_close_lesson_forum_access_scope` é a última registrada e os checks do fórum foram validados.
- **Estado:** SUPERSEDED para o escopo do Gate 5F; não executar escrita para fabricar evidência.

## ERR-006 — CI incompleto

- **Sintoma:** workflow histórico não executava toda a suíte unitária e chamava “lint” para um build de produção.
- **Evidência:** `.github/workflows/ci.yml` e `package.json`.
- **Estado:** observação histórica não corrigida neste ciclo; a main não disparou workflow CI específico após o merge (`MAIN_CI_STATUS=NOT_TRIGGERED`). Não é blocker enquanto a regressão local e o CI do PR permanecerem aprovados.
- **Ação:** qualquer ajuste de workflow exige Gate próprio.

## RISK/DEVIATION — KNOWN_DEVIATION_PROGRESS_001

- **Tipo:** desvio de persistência conhecido, não erro confirmado.
- **Caminho primário:** `update_lesson_progress_secure`.
- **Fallback observado:** upsert direto em `lesson_progress` quando a RPC retorna erro.
- **Equivalência semântica:** `NOT_VERIFIED`.
- **Comportamento remoto:** `NOT_VERIFIED`.
- **Estado:** permanece documentado; não declarar resolvido sem validação formal da equivalência.

## RISK/SECURITY — KNOWN_SECURITY_DEVIATION_AUTH_001

```text
CURRENT_TREE_PRIVILEGED_IDENTITY_FINDING=SIM
HISTORICAL_PRIVILEGED_IDENTITY_FINDING=SIM
VALID_SECRET_EXPOSURE_CONFIRMED=NAO
PRIVATE_INTEGRATION_BLOCKER=NAO
PUBLIC_RELEASE_BLOCKER=SIM
DO_NOT_REPLICATE_OR_EXPAND=YES
REMEDIATION_BEFORE_PUBLICATION=REQUIRED
HISTORY_REWRITE_REQUIRED_FOR_PRIVATE_MAIN=NAO
HISTORY_REWRITE_MAY_BE_REQUIRED_FOR_PUBLIC_RELEASE=SIM
```

Foi confirmada a existência de quatro achados históricos de identidade privilegiada em migrations versionadas. Valores, e-mails, UUIDs e identidades não são reproduzidos neste registro. O achado não bloqueia a integração privada, mas exige decisão de publicação antes de qualquer abertura pública; migrations históricas não serão reescritas neste Gate.

## ERR-007 — Publicação pública bloqueada após o fechamento do Gate 5F

- **Evidência:** Gate 5F fechado; enrollment de estudante, enrollment de staff, ownership de conteúdo, escopo do fórum, proteção de perfil, guard MASTER da RPC administrativa e gamificação server-owned validados.
- **Estado atual:** integração privada na main concluída e repositório mantido privado.
- **Blocker remanescente:** quatro achados históricos sanitizados de identidade privilegiada e a decisão de publicação/histórico.
- **Classificação:** não bloqueia execução privada, demo privada, integração na main ou sincronização documental.
- **Próximo estágio:** integração controlada desta branch documental e, depois, Gate 6 de vídeo e submissão.
