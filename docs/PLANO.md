# StudySystem — Plano Canônico de Gates

## 1. Trilhas do plano

### HISTORICAL_DELIVERY_TRACK

Esta trilha preserva a ordem e as evidências da entrega acadêmica original, incluindo o freeze técnico e o Gate 6.

### CURRENT_MAINTENANCE_SECURITY_TRACK

Esta trilha registra o trabalho técnico posterior ao freeze acadêmico, incluindo a productização documental e o fechamento de notifications. Ela não reabre a entrega histórica nem autoriza automaticamente reparos de migration history.

## 2. HISTORICAL_DELIVERY_TRACK — Ordem autorizada

| Gate ou marco | Objetivo | Estado |
|---|---|---|
| Gate 0 | Baseline, integridade, testes, segurança e auditoria inicial | PASS_WITH_WARNINGS |
| Gate 1 | Formalização acadêmica da PoC | PASS |
| Gate 1.2 | Canonização documental e contrato de execução | PASS |
| Gate 2 | Validação física/funcional da PoC | PASS |
| Gate 3 | Correções mínimas da PoC e AUTHZ-001 | PASS_WITH_WARNING |
| Gate 4A | Auditoria read-only de empacotamento e avaliabilidade | PASS_WITH_WARNINGS |
| Gate 4B | Empacotamento acadêmico e sincronização documental inicial | PASS_WITH_WARNINGS |
| Gate 5E.2A.1A | Segurança de enrollment | PASS |
| Gate 5E.2A.1B | Fechamento de escrita direta e cutover autorizado | PASS |
| Gate 5E.2A.2 | Validação complementar de segurança | PASS_WITH_WARNING |
| Gate 5E.2B | Proteções administrativas e server-owned | PASS |
| Gate 5F | Fechamento do escopo de acesso ao fórum de lição | CLOSED |
| Auditoria pós-5F de histórico/publicação | Classificação de integração privada e limite de publicação | PASS |
| Integração privada na main | Merge controlado do PR #43 | PASS |
| Validação pós-merge | Regressão, deploy e freeze técnico | PASS |
| Sincronização documental final | Atualização dos cinco documentos autorizados | PASS |
| Integração documental final / PR #44 | Integração do closeout documental na main | PASS |
| Gate 6 — vídeo e submissão | Evidência final acadêmica | NEXT |

## 3. Estado técnico congelado

```text
TECHNICAL_FREEZE_SHA=a436c48e5e1b2b8bfdb4b1d214ca8ad22a010582
TECHNICAL_FREEZE_TREE=fde2f520f4e2c5db3c15ba1dde661fc9809a295f
GATE_5F_STATUS=CLOSED
PRIVATE_MAIN_INTEGRATION=COMPLETE
TECHNICAL_DEVELOPMENT_FROZEN=SIM
```

O desenvolvimento técnico está congelado para fins da entrega acadêmica. Não iniciar novas funcionalidades antes do vídeo e da submissão, salvo blocker comprovado.

## 4. Evidências consolidadas dos Gates posteriores

```text
GATE_5E_2A_1A=PASS
GATE_5E_2A_1B=PASS
GATE_5E_2A_2=PASS_WITH_WARNING
GATE_5E_2B=PASS
GATE_5F=CLOSED
POST_5F_HISTORY_PUBLICATION_AUDIT=PASS
PRIVATE_MAIN_INTEGRATION=PASS
POST_MERGE_VALIDATION=PASS
FINAL_DOCUMENTATION_SYNC=PASS
FINAL_DOCUMENTATION_PR_INTEGRATION=PASS
```

O Gate 5F encerrou os escopos de enrollment de estudante, enrollment de staff, ownership de conteúdo e acesso ao fórum de lição. Também foram validados o bloqueio de autoelevação de perfil, o guard MASTER da RPC administrativa e a proteção da gamificação server-owned.

## 5. Limites de publicação

O repositório permanece privado. A publicação pública não está autorizada devido a quatro achados históricos sanitizados de identidade privilegiada. Nenhum valor é reproduzido neste documento.

```text
REPOSITORY_VISIBILITY=PRIVATE
PRIVATE_INTEGRATION_BLOCKER=NAO
PUBLIC_RELEASE_BLOCKER=SIM
PUBLIC_REPOSITORY_RELEASE_READY=NAO
HISTORY_REWRITE_REQUIRED_FOR_PRIVATE_MAIN=NAO
HISTORY_REWRITE_MAY_BE_REQUIRED_FOR_PUBLIC_RELEASE=SIM
```

O fallback legado de progresso continua documentado como ponto cuja equivalência semântica não foi formalmente comprovada. Warnings conhecidos não devem ser transformados em blockers sem nova evidência.

## 6. HISTORICAL_DELIVERY_TRACK — Próximas etapas acadêmicas

```text
HISTORICAL_ACADEMIC_CURRENT_GATE=STUDYSYSTEM_FINAL_DELIVERY_READINESS_GATE
HISTORICAL_ACADEMIC_NEXT_GATE=GATE_6_VIDEO_AND_SUBMISSION
HISTORICAL_ACADEMIC_FOLLOWING_GATE=GATE_6_VIDEO_AND_SUBMISSION
HISTORICAL_ACADEMIC_GATE_6_READY=SIM
```

O Gate 6 permanece como etapa acadêmica histórica separada. Este plano atual não o declara concluído e não o inicia automaticamente.

## 7. CURRENT_MAINTENANCE_SECURITY_TRACK — Estado operacional atual

```text
CANONICAL_STATE_SYNC_BASE_SHA=68f2f001778f445eb555f620e68b4095be81e5b1
CANONICAL_STATE_SYNC_SCOPE=POST_NOTIFICATIONS_SECURITY_CLOSURE
CURRENT_CANONICAL_STATE=POST_NOTIFICATIONS_SECURITY_CLOSURE
CURRENT_TECHNICAL_SECURITY_STATE=STABLE_AFTER_NOTIFICATIONS_CLOSURE
CURRENT_GATE=STUDYSYSTEM-CANONICAL-STATE-SYNC-R1
NEXT_ACTION=STUDYSYSTEM-SUPABASE-MIGRATION-HISTORY-RECONCILIATION-PLAN-R4

NOTIFICATIONS_EXPAND_PR=49
NOTIFICATIONS_CONTRACT_PR=50
NOTIFICATIONS_EXPAND_REMOTE_VERSION=20260830204010
NOTIFICATIONS_CONTRACT_REMOTE_VERSION=20260830210930
NOTIFICATIONS_SECURITY_CYCLE=CLOSED
NOTIFICATIONS_SECURITY_FIX_COMPLETE=SIM
NOTIFICATIONS_DIRECT_INSERT_SECURITY=CLOSED
NOTIFICATIONS_AUTHORIZATION_GAP=CLOSED
NOTIFICATIONS_WRITER_MODEL=SECURE_RPC_ONLY

README_PRODUCTIZATION=PASS
NOTIFICATIONS_RLS_PRECHECK=PASS
NOTIFICATIONS_RLS_PATCH=PASS
NOTIFICATIONS_EXPAND_DEPLOY=PASS
NOTIFICATIONS_CONTRACT=PASS
NOTIFICATIONS_SECURITY_CLOSURE=PASS
PR49=MERGED
PR50=MERGED

FULL_MIGRATION_HISTORY_RECONCILIATION_COMPLETE=NAO
FULL_MIGRATION_HISTORY_RECONCILIATION_REQUIRED=SIM
MIGRATION_HISTORY_GLOBAL_ALIGNMENT=PENDING_RECONCILIATION
GLOBAL_DIVERGENCE_CLASS=MIXED_MIGRATION_HISTORY_DIVERGENCE
MIGRATION_HISTORY_REPAIR_AUTHORIZED=NAO

PUBLIC_RELEASE_BLOCKER=SIM
PUBLIC_REPOSITORY_RELEASE_READY=NAO
PUBLIC_RELEASE_ACTION=SEPARATE_SECURITY_PUBLICATION_GATE_REQUIRED
```

### Marcos técnicos posteriores ao freeze acadêmico

| Marco | Estado |
|---|---|
| Productização documental/README | PASS |
| Auditoria RLS de notifications | PASS |
| Patch seguro de notifications | PASS |
| Estratégia EXPAND/DEPLOY/CONTRACT | PASS |
| EXPAND targeted de notifications | PASS |
| PR #49 — EXPAND | MERGED |
| CONTRACT targeted de notifications | PASS |
| PR #50 — CONTRACT | MERGED |
| Fechamento do authorization gap de notifications | CLOSED |

### Supabase Migration History Reconciliation

```text
STATE=PENDING_AUTHORIZATION
OBJECTIVE=RECONCILE_LOCAL_REMOTE_MIGRATION_PROVENANCE_AND_MATERIALIZED_SCHEMA
MIGRATION_BATCH_APPLICATION=PROHIBITED
HISTORY_REPAIR_WITHOUT_PROOF=PROHIBITED
NOTIFICATIONS_SECURITY_CLOSURE_BLOCKED_RETROACTIVELY=NAO
SEPARATE_CYCLE_REQUIRED=SIM
```

O ciclo de reconciliação deve ser planejado e autorizado separadamente. Não executar migrations antigas em lote, não usar history repair sem prova e não reabrir retroativamente o fechamento de notifications.

## 8. Regras de avanço

- Cada Gate precisa de precheck, escopo explícito, evidência, decisão e freeze.
- Pendências operacionais não devem ser apagadas para produzir uma aparência de PASS.
- Um documento canônico não autoriza mudanças técnicas por si só; a execução depende do Gate vigente.
- A publicação pública depende de decisão específica sobre o histórico sanitizado e não é consequência automática da integração privada.
- O Gate 5F está fechado e não deve ser reaberto sem nova evidência concreta.
- O fallback de progresso não deve ser declarado equivalente sem validação formal.
- Não alterar migrations históricas, visibilidade, branch protection ou configuração remota neste estágio sem Gate próprio.
