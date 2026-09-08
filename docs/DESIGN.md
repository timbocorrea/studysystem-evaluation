# StudySystem — Contrato de UX/UI e Responsividade

## 1. Escopo da evidência

Este documento registra somente comportamentos visuais e de interação observáveis no código. Breakpoints numéricos, metas de desempenho e resultados de teste visual não são inventados. Onde a execução física não ocorreu, o estado é `NOT_VERIFIED`.

## 2. Navegação

- A entrada autenticada leva ao dashboard em `/`.
- `/dashboard` redireciona para `/`.
- `/courses` apresenta os cursos matriculados.
- `/course/:courseId` apresenta a estrutura do curso.
- `/course/:courseId/lesson/:lessonId` apresenta a aula.
- Rotas administrativas usam guards distintos para acesso de instrutor/admin e Master.
- Rotas desconhecidas retornam ao dashboard.

Evidência: `src/routes/AppRoutes.tsx` e `src/routes/RouteGuards.tsx`.

## 3. Estados de interface

| Estado | Comportamento observado | Estado de validação |
|---|---|---|
| Loading | Skeletons, loaders, `Suspense` e indicadores durante consultas/carregamento de aula | IMPLEMENTED / NOT_VERIFIED |
| Error | Mensagens de erro, toasts, `ErrorBoundary` e `ErrorFallback` por tipo | IMPLEMENTED / NOT_VERIFIED |
| Blocked | Tela de login para visitante e mensagens de acesso negado/restrito para guards | IMPLEMENTED / PARTIAL |
| Result | Modal de resultado do quiz com pontuação e situação | IMPLEMENTED / NOT_VERIFIED |
| Empty | Estados vazios em listas e mensagens quando não há questões/dados | IMPLEMENTED / NOT_VERIFIED |

Evidências: `components/skeletons/`, `components/ModernLoader.tsx`, `components/ErrorBoundary.tsx`, `components/ErrorFallback.tsx`, `src/routes/RouteGuards.tsx`, `components/QuizResultsModal.tsx`.

## 4. Dashboard

`StudentDashboard` recebe cursos, estado de carregamento, título de seção, ações de curso e, quando autorizado, ações de administração. Cards, resumo, atividade, XP e analytics são componentes separados.

Evidências: `components/features/dashboard/StudentDashboard.tsx`, `components/features/dashboard/CourseCard.tsx`, `components/dashboard/DashboardHeader.tsx`, `components/features/dashboard/RecentActivity.tsx`.

## 5. Curso e aula

`CourseOverview` apresenta a estrutura selecionada e permite escolher módulos/aulas. `CourseLayout` organiza a área do curso. `LessonLoader` resolve o conteúdo e `LessonViewer` apresenta vídeo, texto, áudio, materiais, fórum/notas e acesso ao quiz conforme o conteúdo disponível.

Evidências: `components/CourseLayout.tsx`, `components/CourseOverview.tsx`, `components/LessonLoader.tsx`, `components/features/classroom/LessonViewer.tsx`.

## 6. Quiz e resultado

`QuizWidget` e `QuizModal` conduzem a interação. `useLessonQuiz` diferencia prática e avaliação, exibe estados de carregamento/erro e chama o repository apropriado. `QuizResultsModal` representa o resultado final do fluxo.

Evidências: `components/features/classroom/QuizWidget.tsx`, `components/QuizModal.tsx`, `components/QuizResultsModal.tsx`, `hooks/useLessonQuiz.ts`.

## 7. Desktop e mobile

O código contém classes responsivas Tailwind com variantes `sm:`, `md:`, `lg:` e `xl:`, além de componentes de ferramentas móveis e modais adaptados a viewport menor. Isso comprova intenção e implementação de responsividade, mas não comprova uma inspeção física completa.

```text
DESKTOP=IMPLEMENTED_BY_CODE; PHYSICAL_VALIDATION=NOT_VERIFIED
MOBILE=IMPLEMENTED_BY_CODE; PHYSICAL_VALIDATION=NOT_VERIFIED
```

Evidências: `components/Sidebar.tsx`, `components/lesson/MobileToolsFab.tsx`, `components/ui/MobileModal.tsx`, `hooks/usePerformance.ts`, classes responsivas nos componentes de dashboard, aula e administração.

## 8. Regra de aceitação visual

A responsividade só pode ser marcada como PASS após roteiro físico em viewport desktop e mobile, com a jornada da PoC e seus estados principais. Inspeção de classes ou existência de componentes não é suficiente.
