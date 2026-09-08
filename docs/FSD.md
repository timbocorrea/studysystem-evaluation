# StudySystem — Functional Specification Document

## 1. Regra de leitura

Este documento define comportamento funcional observado no código. Os requisitos acadêmicos detalhados permanecem em [`docs/segunda-entrega/REQUISITOS_E_ACEITACAO.md`](segunda-entrega/REQUISITOS_E_ACEITACAO.md). Os estados abaixo distinguem implementação de validação.

```text
IMPLEMENTED = caminho existente no código
VALIDATED = evidência executada/confirmada no ambiente correspondente
PARTIAL = parte confirmada, com limite explícito
NOT_VERIFIED = sem validação suficiente para declarar funcionamento
```

## 2. Pré-condição e atores

O fluxo principal começa com um aluno autenticado. `AuthContext`, `AuthService` e `SupabaseAuthRepository` restauram sessão e perfil; a autorização adicional ocorre por guards, papel do usuário, RLS e RPCs. Instrutores/Admins e Master possuem fluxos secundários protegidos.

## 3. Fluxo principal da PoC

| Etapa | Contrato observado | Estado atual | Evidência |
|---|---|---|---|
| Sessão | Restaurar sessão e perfil antes do dashboard | IMPLEMENTED / NOT_VERIFIED | `contexts/AuthContext.tsx`, `services/AuthService.ts`, `repositories/SupabaseAuthRepository.ts` |
| Dashboard | Exibir cursos para o usuário e encaminhar seleção | IMPLEMENTED / NOT_VERIFIED | `/`, `/dashboard`, `StudentDashboard`, `contexts/CourseContext.tsx` |
| Curso | Abrir estrutura, módulos e aulas dentro de `/course/:courseId` | IMPLEMENTED / NOT_VERIFIED | `CourseOverview.tsx`, `CourseLayout.tsx`, `SupabaseCourseRepository.ts` |
| Aula | Carregar conteúdo sob demanda em `/course/:courseId/lesson/:lessonId` | IMPLEMENTED / NOT_VERIFIED | `LessonLoader.tsx`, `LessonViewer.tsx` |
| Questionário | Carregar quiz seguro para aluno e abrir avaliação/prática | IMPLEMENTED / PARTIAL | `hooks/useLessonQuiz.ts`, `QuizWidget.tsx`, `SupabaseQuizRepository.ts` |
| Resultado | Exibir pontuação e situação da tentativa | IMPLEMENTED / NOT_VERIFIED | `QuizResultsModal.tsx` |
| Tentativa | Avaliação chama `submit_quiz_attempt` e grava `quiz_attempts` | IMPLEMENTED / PARTIAL | `SupabaseQuizRepository.ts`, migration `archive/supabase-migrations/20260703020000_harden_submit_quiz_attempt.sql` |
| Progresso | Atualizar progresso e requisitos de aula | IMPLEMENTED / NOT_VERIFIED | `CourseContext.tsx`, `CourseService.ts`, `SupabaseUserProgressRepository.ts` |
| Recuperação | Reconsultar curso/progresso ao retornar | IMPLEMENTED / NOT_VERIFIED | `SupabaseCourseRepository.ts`, `lesson_progress` |

## 4. Contratos de dados

- Cursos, módulos e aulas são lidos pelo `SupabaseCourseRepository`.
- O aluno consulta quiz por `get_lesson_quiz_for_student`, que não devolve a chave de respostas no caminho normal do aluno.
- A submissão avaliativa usa `submit_quiz_attempt`; o resultado local é convertido em `QuizAttemptResult`.
- Modo prática pode usar questões do banco e `check_pool_quiz_answers_for_student`; não concede XP.
- Progresso principal usa `update_lesson_progress_secure`, com fallback de upsert quando a RPC falha.
- A aplicação consulta `lesson_progress` para refletir conclusão e progresso posteriormente.

### KNOWN_DEVIATION_PROGRESS_001

```text
RPC_PRIMARY_PATH=update_lesson_progress_secure
DIRECT_UPSERT_FALLBACK=IMPLEMENTED
SEMANTIC_EQUIVALENCE=NOT_VERIFIED
REMOTE_BEHAVIOR=NOT_VERIFIED
```

O repository tenta primeiro a RPC segura e, quando ela retorna erro, executa upsert direto em `lesson_progress`. A RPC possui semântica adicional, incluindo identidade autenticada, preservação de conclusão e efeitos associados; portanto, a equivalência semântica do fallback não está confirmada. Este registro é uma divergência conhecida, não um bug confirmado.

## 5. Autorização funcional

- Visitantes são encaminhados para autenticação antes das áreas privadas.
- `AdminRoute` exige `hasAdminPanelAccess`.
- `MasterRoute` exige perfil Master conforme o guard observado.
- O banco complementa o cliente com `auth.uid()`, RLS, enrollment, atribuição e funções de autorização.
- Um bloqueio visual não substitui a autorização server-side.

## 6. Fluxos secundários

Existem rotas e capacidades secundárias para perfil, conquistas, Buddy, auditoria, administração, interação de instrutor, arquivos, fórum, notas, materiais, Dropbox e saúde do sistema. Elas são `SECONDARY` para a PoC e não devem ser convertidas silenciosamente em critérios P0.

## 7. Estados funcionais

Loading aparece em queries, skeletons e carregamento sob demanda. Erros usam mensagens, toasts e `ErrorBoundary`/`ErrorFallback`. Bloqueios aparecem nos guards e na tela de login. Resultados aparecem em modal próprio. A presença desses caminhos é `IMPLEMENTED`; a validação física completa permanece `NOT_VERIFIED` no status operacional.

## 8. Limite da especificação

Não há declaração de que o fluxo esteja validado em ambiente remoto completo. `docs/POC_ACCEPTANCE.md` é a autoridade para decidir PASS/FAIL/NOT_VERIFIED da PoC.
