# StudySystem — Status Operacional Canônico

## 1. Snapshot histórico da entrega acadêmica

```text
SNAPSHOT_CLASS=HISTORICAL_ACADEMIC_DELIVERY_SNAPSHOT
REPOSITORY=timbocorrea/studysystem
REPOSITORY_VISIBILITY=PRIVATE
MAIN_BRANCH=main
TECHNICAL_FREEZE_SHA=a436c48e5e1b2b8bfdb4b1d214ca8ad22a010582
TECHNICAL_FREEZE_KIND=HISTORICAL_ACADEMIC_TECHNICAL_FREEZE
TECHNICAL_FREEZE_TREE=fde2f520f4e2c5db3c15ba1dde661fc9809a295f
MERGED_PR=43
GATE_5F_STATUS=CLOSED
FUNCTIONAL_POC=COMPLETE
PRIVATE_MAIN_INTEGRATION=COMPLETE
TECHNICAL_FREEZE_READY=SIM
FINAL_DOCUMENTATION_SYNC=COMPLETE
FINAL_DOCUMENTATION_PR=44
FINAL_DOCUMENTATION_PR_MERGED=SIM
FINAL_DELIVERY_MAIN_SHA=293ce209d63b7fd8224e2591be4b70f3860ac2e8
TECHNICAL_DEVELOPMENT_FROZEN=SIM
```

O SHA de freeze acima é uma referência histórica da entrega acadêmica. Ele não representa a `main` operacional atual nem deve ser usado como sua autoridade permanente.

## 2. Estado operacional canônico atual

```text
CANONICAL_STATE_SYNC_BASE_SHA=68f2f001778f445eb555f620e68b4095be81e5b1
CANONICAL_STATE_SYNC_SCOPE=POST_NOTIFICATIONS_SECURITY_CLOSURE
CURRENT_CANONICAL_STATE=POST_NOTIFICATIONS_SECURITY_CLOSURE
CURRENT_TECHNICAL_SECURITY_STATE=STABLE_AFTER_NOTIFICATIONS_CLOSURE

README_PRODUCTIZATION=PASS
NOTIFICATIONS_RLS_PRECHECK=PASS
NOTIFICATIONS_RLS_PATCH=PASS
NOTIFICATIONS_EXPAND_DEPLOY=PASS
NOTIFICATIONS_CONTRACT=PASS
NOTIFICATIONS_SECURITY_CLOSURE=PASS
PR49=MERGED
PR50=MERGED

NOTIFICATIONS_EXPAND_PR=49
NOTIFICATIONS_CONTRACT_PR=50
NOTIFICATIONS_SECURITY_CYCLE=CLOSED
NOTIFICATIONS_EXPAND_APPLIED=SIM
NOTIFICATIONS_EXPAND_REMOTE_VERSION=20260830204010
NOTIFICATIONS_CONTRACT_APPLIED=SIM
NOTIFICATIONS_CONTRACT_REMOTE_VERSION=20260830210930
NOTIFICATIONS_INSERT_POLICY_COUNT=0
NOTIFICATIONS_PUBLIC_DIRECT_INSERT=BLOCKED
NOTIFICATIONS_ANON_DIRECT_INSERT=BLOCKED
NOTIFICATIONS_AUTHENTICATED_DIRECT_INSERT=BLOCKED
NOTIFICATIONS_RLS_ENABLED=SIM
NOTIFICATIONS_SECURE_RPC_COUNT=3
NOTIFICATIONS_SECURE_RPCS=notify_forum_reply;send_instructor_notifications;send_master_notification
NOTIFICATIONS_RPC_SECURITY_METADATA=PASS
NOTIFICATIONS_SELECT_SELF=PRESERVED
NOTIFICATIONS_UPDATE_SELF=PRESERVED
NOTIFICATIONS_DELETE_SELF=PRESERVED
NOTIFICATIONS_DIRECT_INSERT_SECURITY=CLOSED
NOTIFICATIONS_AUTHORIZATION_GAP=CLOSED
NOTIFICATIONS_USER_ID_SPOOFING=BLOCKED
NOTIFICATIONS_SENDER_ID_SPOOFING=BLOCKED
NOTIFICATIONS_WRITER_MODEL=SECURE_RPC_ONLY

REMOTE_LAST_KNOWN_MIGRATION_VERSION=20260830210930
REMOTE_LAST_KNOWN_MIGRATION_NAME=close_notifications_direct_insert_contract
MIGRATION_HISTORY_GLOBAL_ALIGNMENT=PENDING_RECONCILIATION
GLOBAL_DIVERGENCE_CLASS=MIXED_MIGRATION_HISTORY_DIVERGENCE
FULL_MIGRATION_HISTORY_RECONCILIATION_COMPLETE=NAO
FULL_MIGRATION_HISTORY_RECONCILIATION_REQUIRED=SIM
MIGRATION_HISTORY_REPAIR_AUTHORIZED=NAO

UNIT_TESTS=135 PASS
TYPECHECK=PASS
BUILD=PASS
SECURITY_SCAN=PASS
PLAYWRIGHT=PASS
GITHUB_ACTIONS_CI=PASS
MAIN_VERCEL_STATUS=PASS
SECURITY_ADVISOR_NEW_CRITICAL_COUNT=0
SECURITY_ADVISOR_NEW_NOTIFICATION_FINDINGS=0
```

O fechamento de notifications utilizou aplicações targeted individuais, com provenance local/remota alinhada. Essa conclusão não representa reconciliação global do histórico de migrations.

## 3. Evidências técnicas

```text
UNIT_TESTS=135/135 PASS
TYPECHECK=PASS
BUILD=PASS
PLAYWRIGHT=PASS
SUPABASE_REMOTE_ALIGNMENT=PASS
REMOTE_LAST_KNOWN_MIGRATION_VERSION=20260830210930
REMOTE_LAST_KNOWN_MIGRATION_NAME=close_notifications_direct_insert_contract
NOTIFICATIONS_EXPAND_REMOTE_VERSION=20260830204010
NOTIFICATIONS_CONTRACT_REMOTE_VERSION=20260830210930
NOTIFICATIONS_SECURITY_CLOSURE=PASS
FORUM_FUNCTION_EXISTS=SIM
FORUM_POLICIES_COUNT=4
FORUM_PROBE_RESIDUE=0
SECURITY_ADVISOR_CRITICAL=0
SECURITY_ADVISOR_NEW_CRITICAL_COUNT=0
SECURITY_ADVISOR_NEW_NOTIFICATION_FINDINGS=0
CURRENT_TREE_CONFIRMED_SECRET_COUNT=0
CLIENT_SERVICE_ROLE_EXPOSURE=NAO
AI_CREDENTIAL_PERSISTENCE_REINTRODUCED=NAO
GITHUB_ACTIONS_CI=PASS
MAIN_VERCEL_STATUS=PASS
MAIN_CI_STATUS=PASS
```

A evidência histórica anterior de 130 testes e 14 aprovações/3 skips do Playwright permanece apenas como registro de gates anteriores; o estado mais recente é o snapshot acima, com 135 testes e Playwright PASS.

## 4. Gates e histórico de execução

Os marcos abaixo preservam o histórico da entrega acadêmica e dos Gates técnicos posteriores, sem substituir o estado operacional canônico atual da seção 2.

| Gate ou marco | Estado |
|---|---|
| Gate 0 | PASS_WITH_WARNINGS |
| Gate 1 | PASS |
| Gate 1.2 | PASS |
| Gate 2 — PoC funcional | PASS |
| Gate 3 — AUTHZ-001 | PASS_WITH_WARNING |
| Gate 4A | PASS_WITH_WARNINGS |
| Gate 4B | PASS_WITH_WARNINGS |
| Gate 5E.2A.1A | PASS |
| Gate 5E.2A.1B | PASS |
| Gate 5E.2A.2 | PASS_WITH_WARNING |
| Gate 5E.2B | PASS |
| Gate 5F | CLOSED |
| Auditoria pós-5F de histórico/publicação | PASS |
| Integração privada na main | PASS |
| Validação pós-merge | PASS |
| Sincronização documental final | PASS |
| Gate 6 — vídeo e submissão | NEXT |
| Productização documental/README | PASS |
| Auditoria RLS de notifications | PASS |
| Patch seguro de notifications | PASS |
| Estratégia EXPAND/DEPLOY/CONTRACT | PASS |
| EXPAND targeted de notifications | PASS |
| PR #49 — EXPAND | MERGED |
| CONTRACT targeted de notifications | PASS |
| PR #50 — CONTRACT | MERGED |
| Fechamento do authorization gap de notifications | CLOSED |

## 5. Matriz operacional

| Item | Estado | Leitura canônica |
|---|---|---|
| PoC | GREEN | Jornada principal, tentativa, progresso e recuperação validados |
| Frontend | GREEN | Dashboard, curso, aula, quiz e resultado demonstrados |
| Backend | GREEN | Chamadas autenticadas do fluxo principal confirmadas |
| Banco | GREEN | Tentativa e progresso confirmados por leitura posterior |
| Persistência | GREEN | Read-after-write autenticado concluído para tentativa e progresso |
| Integração | GREEN | Caminho frontend/backend/banco demonstrado |
| Testes unitários | GREEN | 135/135 passaram |
| Typecheck | GREEN | `npm run typecheck` passou |
| Build | GREEN | `npm run build` passou |
| E2E | GREEN | Playwright PASS no ciclo mais recente |
| Segurança técnica privada | GREEN | Gate 5F e fechamento de notifications concluídos |
| Deploy privado/demo | GREEN | Deploy pós-merge da main no Vercel em estado PASS |
| Documentação | GREEN | Estado canônico operacional sincronizado após PR #50 |
| Publicação pública | RED/BLOCKED | Repositório privado e publicação bloqueada por achados históricos sanitizados |
| Vídeo | RED/PENDING | Produção do vídeo e checklist acadêmico ainda pendentes |

## 6. Segurança e publicação

Os seguintes temas estão fechados para a integração privada:

```text
STUDENT_ENROLLMENT_SECURITY=CLOSED
DIRECT_STUDENT_ENROLLMENT_WRITE=BLOCKED
STAFF_ENROLLMENT_SCOPE=CLOSED
CONTENT_OWNERSHIP_SCOPE=CLOSED
LESSON_FORUM_ACCESS=CLOSED
PROFILE_SELF_ROLE_ESCALATION=BLOCKED
CROSS_USER_PROFILE_WRITE=BLOCKED
ADMIN_RESET_RPC_MASTER_GUARD=VALIDATED
ARBITRARY_GAMIFICATION_WRITE=BLOCKED
AI_CREDENTIAL_PERSISTENCE=CLOSED
```

O hardening de notifications está encerrado na integração privada:

```text
NOTIFICATIONS_DIRECT_INSERT_SECURITY=CLOSED
NOTIFICATIONS_AUTHORIZATION_GAP=CLOSED
NOTIFICATIONS_USER_ID_SPOOFING=BLOCKED
NOTIFICATIONS_SENDER_ID_SPOOFING=BLOCKED
NOTIFICATIONS_WRITER_MODEL=SECURE_RPC_ONLY
NOTIFICATIONS_SECURITY_FIX_COMPLETE=SIM
AUTHORIZATION_GAP_CLOSED=SIM
```

Existem quatro achados históricos sanitizados de identidade privilegiada. Nenhum valor ou identidade é reproduzido aqui. Eles não bloqueiam a integração privada, mas mantêm a publicação pública bloqueada.

```text
PRIVATE_INTEGRATION_BLOCKER=NAO
PUBLIC_RELEASE_BLOCKER=SIM
VALID_SECRET_EXPOSURE_CONFIRMED=NAO
REPOSITORY_MUST_REMAIN_PRIVATE=SIM
PUBLIC_REPOSITORY_RELEASE_READY=NAO
HISTORY_REWRITE_REQUIRED_FOR_PRIVATE_MAIN=NAO
HISTORY_REWRITE_MAY_BE_REQUIRED_FOR_PUBLIC_RELEASE=SIM
```

O fallback legado do progresso permanece documentado como desvio cuja equivalência semântica não foi formalmente comprovada. Warnings conhecidos do Security Advisor não são blockers por si só.

## 7. Autoridade e próximas trilhas

Este arquivo é a autoridade sobre o estado operacional atual. Arquitetura, comportamento funcional e UX/UI permanecem sob seus documentos canônicos próprios.

```text
HISTORICAL_ACADEMIC_GATE_6_READY=SIM
HISTORICAL_ACADEMIC_NEXT_ACTION=GATE_6_VIDEO_AND_SUBMISSION
CURRENT_TECHNICAL_SECURITY_STATE=STABLE_AFTER_NOTIFICATIONS_CLOSURE
NEXT_SECURITY_MAINTENANCE_ACTION=SUPABASE_MIGRATION_HISTORY_RECONCILIATION_PLAN
PUBLIC_RELEASE_ACTION=SEPARATE_SECURITY_PUBLICATION_GATE_REQUIRED
SECURITY_GATE_REQUIRED_BEFORE_PUBLICATION=YES
MIGRATION_HISTORY_REPAIR_AUTHORIZED=NAO
NEXT_ACTION=STUDYSYSTEM-SUPABASE-MIGRATION-HISTORY-RECONCILIATION-PLAN-R4
```

A entrega acadêmica final continua sendo uma trilha histórica separada e não deve ser declarada concluída antes do vídeo e do checklist de submissão. A publicação pública continua bloqueada pelos quatro achados históricos sanitizados; não iniciar history repair automaticamente.
