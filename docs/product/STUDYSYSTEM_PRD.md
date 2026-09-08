# StudySystem — Product Requirements Document

## 1. Propósito

O StudySystem é uma plataforma web de estudos que organiza cursos, módulos, aulas e questionários para apoiar uma jornada de aprendizagem acompanhada por progresso. O produto também contém capacidades de gamificação, administração de conteúdo, fórum/notas, materiais e integrações opcionais de IA e Dropbox.

Este documento é a autoridade de produto e escopo. A existência de uma capacidade no produto não significa que ela faça parte da PoC da 2ª entrega ou que esteja validada remotamente.

## 2. Problema e proposta

O projeto busca reunir conteúdo educacional, acompanhamento de conclusão e avaliação em uma experiência única. A proposta mínima observável é permitir que um aluno autenticado encontre um curso, abra uma aula, responda um questionário e mantenha tentativa e progresso persistidos.

## 3. Usuários

| Usuário | Necessidade observada | Evidência |
|---|---|---|
| Aluno | Acessar cursos, aulas, quizzes, resultados, progresso e perfil | `src/routes/AppRoutes.tsx`, `contexts/AuthContext.tsx`, `contexts/CourseContext.tsx` |
| Instrutor/Admin | Administrar conteúdo e interações autorizadas | `src/routes/RouteGuards.tsx`, `components/features/admin/`, `services/AdminService.ts` |
| Master | Acessar operações restritas de administração | `src/routes/RouteGuards.tsx`, migrations de autorização |

## 4. Objetivos atuais

- Oferecer uma jornada de estudo coerente para aluno autenticado.
- Relacionar cursos, módulos, aulas, quizzes e progresso.
- Persistir tentativas avaliativas e progresso de aula com autorização.
- Manter uma arquitetura separada em domínio, services, repositories e infraestrutura Supabase.
- Permitir evolução opcional de gamificação, Buddy/IA, administração e materiais sem tornar esses recursos pré-condições da PoC.

## 5. Capacidades principais observadas

- Autenticação, restauração de sessão, perfil e logout.
- Dashboard e listagem de cursos.
- Estrutura de curso, módulos, aulas e conteúdo detalhado.
- Questionário avaliativo e modo prática.
- Resultado, tentativa e progresso.
- Gamificação de conclusão, XP e conquistas.
- Administração de usuários, cursos, questionários, arquivos e saúde do sistema.
- Buddy/IA por Edge Function autenticada, usando chave local do aluno quando configurada.
- Fórum, notas, materiais e Dropbox como capacidades complementares.

## 6. Escopo da PoC da 2ª entrega

O escopo acadêmico da PoC é definido em [`docs/segunda-entrega/POC.md`](../segunda-entrega/POC.md) e seus requisitos em [`docs/segunda-entrega/REQUISITOS_E_ACEITACAO.md`](../segunda-entrega/REQUISITOS_E_ACEITACAO.md).

O caminho crítico é:

```text
Aluno autenticado → Dashboard → Curso → Aula → Questionário → Resultado → Persistência → Progresso
```

## 7. Fora do escopo obrigatório da PoC

Buddy/IA, geração automática de quiz por IA, TTS, offline completo, Dropbox, administração avançada, expansão geral do produto e gamificação adicional não são pré-condições da PoC. Podem existir no produto, mas permanecem secundários para esta entrega.

Deploy público é apoio ou evidência complementar conforme a estratégia final; não é tratado como requisito acadêmico obrigatório nesta definição.

## 8. Critérios gerais de sucesso

O produto deve demonstrar, em validação autorizada e não apenas por inspeção de código, que:

- o aluno autenticado acessa apenas o que seu escopo permite;
- a jornada principal pode ser percorrida;
- tentativa e progresso são persistidos e recuperáveis;
- estados de carregamento, erro, bloqueio e resultado são compreensíveis;
- a experiência é verificada em desktop e mobile antes de declarar a PoC validada.

## 9. Evidência e limites

O código confirma a existência do fluxo e das camadas. Os resultados operacionais variáveis devem ser consultados em [`docs/STATUS.md`](../STATUS.md), e os critérios de aceitação da PoC em [`docs/POC_ACCEPTANCE.md`](../POC_ACCEPTANCE.md). Este PRD não é autoridade sobre resultados transitórios de build, testes, segurança ou validação remota.
