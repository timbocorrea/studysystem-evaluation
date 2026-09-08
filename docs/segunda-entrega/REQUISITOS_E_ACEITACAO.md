# Requisitos e Critérios de Aceitação — 2ª Entrega

## 1. Requisitos funcionais

Os requisitos abaixo estão limitados ao caminho crítico da PoC.

| ID | Requisito | Prioridade |
|---|---|---|
| RF-01 | O aluno autenticado deve conseguir acessar o dashboard. | P0 |
| RF-02 | O sistema deve permitir visualizar cursos disponíveis ao aluno. | P0 |
| RF-03 | O aluno deve conseguir abrir um curso selecionado. | P0 |
| RF-04 | O aluno deve conseguir abrir uma aula pertencente ao curso. | P0 |
| RF-05 | O sistema deve disponibilizar o questionário relacionado à aula. | P0 |
| RF-06 | O aluno deve conseguir responder e submeter o questionário. | P0 |
| RF-07 | O sistema deve exibir o resultado da submissão. | P0 |
| RF-08 | A tentativa do questionário deve ser persistida no backend/banco. | P0 |
| RF-09 | O progresso da aula deve ser atualizado após o consumo da aula e/ou conclusão aplicável. | P0 |
| RF-10 | O sistema deve recuperar o progresso quando o aluno retornar ao curso ou à aula. | P0 |

## 2. Requisitos não funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RNF-01 | A jornada principal deve ser utilizável em interface web responsiva, incluindo viewport mobile. | P0 |
| RNF-02 | O acesso à jornada deve respeitar autenticação, autorização e escopo do aluno. | P0 |
| RNF-03 | Tentativas e progresso devem ser persistidos com integridade entre aplicação e banco. | P0 |
| RNF-04 | A interface deve apresentar estados compreensíveis de carregamento, bloqueio, resultado e erro. | P0 |
| RNF-05 | O desempenho deve ser razoável para uma demonstração web, sem exigir uma métrica numérica não definida no projeto. | P1 |
| RNF-06 | Credenciais privadas não devem ser embutidas no código client-side ou em artefatos públicos. | P1 |
| RNF-07 | A documentação da entrega deve permitir compreender a jornada, as tecnologias e os limites da PoC. | P1 |

## 3. Prioridades

- **P0 — obrigatório para a PoC:** jornada principal, questionário, resultado, persistência, progresso, autenticação como pré-condição, autorização e responsividade necessária.
- **P1 — necessário para formalização e avaliação final:** README correto, documentação, segurança para publicação, repositório acessível e vídeo. Deploy pode apoiar a demonstração ou servir como evidência complementar; não é tratado aqui como requisito acadêmico obrigatório.
- **P2 — complementar e fora do caminho crítico:** Buddy/IA, geração automática de quiz, TTS, offline completo, Dropbox, administração avançada, gamificação complementar e visão SaaS/multi-tenant.

## 4. Critérios de aceitação

| ID | Descrição | Evidência esperada | Status atual |
|---|---|---|---|
| AC-01 | Um aluno autenticado acessa o dashboard. | Tela/rota de dashboard exibida para sessão válida. | PASS |
| AC-02 | O aluno consegue selecionar um curso. | Curso selecionado e navegação para `/course/:courseId`. | PASS |
| AC-03 | O aluno consegue abrir uma aula do curso. | Navegação para `/course/:courseId/lesson/:lessonId`. | PASS |
| AC-04 | O questionário relacionado pode ser acessado. | Widget/modal de quiz carregado para a aula. | PASS |
| AC-05 | As respostas podem ser submetidas. | Chamada de submissão realizada com as respostas do aluno. | PASS |
| AC-06 | O resultado é apresentado. | `QuizResultsModal` apresenta pontuação e situação da tentativa. | PASS |
| AC-07 | A tentativa fica persistida no backend/banco. | Registro em `quiz_attempts` por fluxo autorizado/RPC. | PASS |
| AC-08 | O progresso da aula é atualizado. | Atualização por `CourseService` e `update_lesson_progress_secure`. | PASS |
| AC-09 | Ao recarregar ou reentrar, o progresso continua disponível. | Progresso recuperado e refletido no curso/aula. | PASS |
| AC-10 | O fluxo é utilizável em desktop e mobile. | Evidência funcional em desktop e viewport mobile aproximado de 390 x 844. | PASS |

Os status `PASS` refletem a validação funcional consolidada da PoC: jornada com aluno autenticado, persistência da tentativa, progresso, recuperação posterior e uso em desktop/mobile foram confirmados. Requisitos P2 continuam complementares e não foram convertidos em P0.

## 5. Matriz de rastreabilidade da jornada

A matriz abaixo explicita a sequência acadêmica **problema → persona → jornada → requisito → aceitação → evidência**. A origem “Persona Ricardo” remete à primeira entrega; os demais elementos correspondem à jornada escolhida e às evidências reais do projeto.

| Origem | Necessidade | Requisito | Critério | Evidência |
|---|---|---|---|---|
| Persona Ricardo | Entrar no ambiente de estudos e localizar rapidamente o ponto de partida | RF-01 | AC-01 | `src/routes/AppRoutes.tsx`, `StudentDashboard.tsx` |
| Persona Ricardo | Encontrar o conteúdo de estudo organizado | RF-02, RF-03 | AC-02 | `StudentDashboard.tsx`, `CourseOverview.tsx`, `SupabaseCourseRepository.ts` |
| Persona Ricardo | Acessar a aula escolhida sem sair da jornada | RF-04 | AC-03 | `LessonLoader.tsx`, `LessonViewer.tsx` |
| Jornada da PoC | Verificar o aprendizado na própria aula | RF-05 | AC-04 | `QuizWidget.tsx`, `useLessonQuiz.ts`, `get_lesson_quiz_for_student` |
| Jornada da PoC | Registrar as respostas do aluno | RF-06 | AC-05 | `useLessonQuiz.ts`, `SupabaseQuizRepository.ts`, `submit_quiz_attempt` |
| Jornada da PoC | Receber retorno sobre a tentativa | RF-07 | AC-06 | `QuizResultsModal.tsx` |
| Continuidade do estudo | Preservar a tentativa realizada | RF-08 | AC-07 | `SupabaseQuizRepository.ts`, `quiz_attempts`, read-after-write autenticado |
| Persona Ricardo / continuidade | Manter o ponto de avanço da aula | RF-09 | AC-08 | `CourseService.ts`, `SupabaseUserProgressRepository.ts`, `lesson_progress` |
| Persona Ricardo / continuidade | Retomar posteriormente sem perder o estado salvo | RF-10 | AC-09 | recuperação posterior de `lesson_progress` validada |
| Jornada completa | Utilizar o fluxo em mais de um formato de tela | RF-01 a RF-10 + RNF-01 | AC-10 | validação desktop e viewport mobile aproximado de 390 x 844 |

## 6. Rastreabilidade dos requisitos não funcionais

| RNF | Evidência real | Estado |
|---|---|---|
| RNF-01 — responsividade | Jornada validada em desktop e viewport mobile aproximado de 390 x 844; contratos visuais em `docs/DESIGN.md`. | PASS |
| RNF-02 — autenticação/autorização | Sessão autenticada, guards, RLS/RPCs e escopo server-side descritos em `docs/FSD.md` e `docs/architecture/STUDYSYSTEM_EXECUTION_CONTRACT.md`. | PASS no escopo da PoC |
| RNF-03 — integridade de persistência | Read-after-write autenticado de `quiz_attempts` e `lesson_progress`, com recuperação posterior. | PASS |
| RNF-04 — estados compreensíveis | Loading, erro, bloqueio e resultado estão implementados conforme `docs/FSD.md` e `docs/DESIGN.md`. | IMPLEMENTED / evidência proporcional à PoC |
| RNF-05 — desempenho razoável | A jornada foi demonstrada funcionalmente sem definição acadêmica de SLA numérico. | PASS no critério definido |
| RNF-06 — credenciais privadas | `npm run security:scan` aprovado na validação técnica consolidada; README reforça a fronteira de secrets. | PASS |
| RNF-07 — documentação | `POC.md`, este documento, `ARQUITETURA_E_TECNOLOGIAS.md`, `STATUS_ENTREGA.md` e `README.md`. | PASS após Fases A, B e C |

## 7. Evidências de implementação

- Rotas e navegação: `src/routes/AppRoutes.tsx`.
- Dashboard: `components/features/dashboard/StudentDashboard.tsx`.
- Curso: `components/CourseOverview.tsx`.
- Aula: `components/LessonLoader.tsx` e `components/features/classroom/LessonViewer.tsx`.
- Questionário: `hooks/useLessonQuiz.ts`, `components/features/classroom/QuizWidget.tsx` e `components/QuizModal.tsx`.
- Resultado: `components/QuizResultsModal.tsx`.
- Orquestração: `services/CourseService.ts` e `contexts/CourseContext.tsx`.
- Persistência de questionário: `repositories/SupabaseQuizRepository.ts`.
- Persistência de progresso: `repositories/SupabaseUserProgressRepository.ts`.
- Aceitação consolidada: `docs/POC_ACCEPTANCE.md`.

Não foram criados requisitos adicionais apenas para aumentar volume. A matriz registra o vínculo entre a proposta acadêmica e o que já existe e foi validado na PoC.
