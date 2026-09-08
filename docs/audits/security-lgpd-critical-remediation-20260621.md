# Remediação CRÍTICA de Segurança e LGPD - StudySystem

Data: 2026-06-21  
Branch: `fix/security-lgpd-critical-remediation`  
Base: `docs/audits/security-lgpd-audit-20260621.md`

## Objetivo

Remediar os achados críticos da auditoria:

1. Remover chaves sensíveis `VITE_GEMINI_API_KEY` e `VITE_API_KEY` do bundle front-end.
2. Impedir busca global de RAG em `lesson_embeddings` sem isolamento por autorização.

Nenhum valor de secret, token, API key ou Authorization header foi registrado neste relatório.

## Escopo P0 - chaves sensíveis fora do front-end

### Causa

O front-end inicializava `AIService` com `import.meta.env.VITE_GEMINI_API_KEY`. Além disso, `services/supabaseClient.ts` lia o objeto dinâmico `import.meta.env`, o que fazia o Vite embutir valores `VITE_*` sensíveis no bundle mesmo depois de remover o uso direto no `AIService`.

### Correção aplicada

- `services/AIService.ts`
  - Removeu `@google/genai` do front-end.
  - Removeu geração direta de embedding/conteúdo Gemini no navegador.
  - Geração de quiz e recomendação passam pela Edge Function autenticada `ask-ai` usando a chave local do dispositivo quando configurada.
  - Sincronização RAG direta no browser foi bloqueada explicitamente.

- `services/Dependencies.ts`
  - Removeu injeção de `import.meta.env.VITE_GEMINI_API_KEY` no `AIService`.

- `services/supabaseClient.ts`
  - Removeu leitura dinâmica do objeto completo `import.meta.env`.
  - Passou a ler explicitamente apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, que são públicas por desenho.

- `vite.config.ts`
  - Removeu chunk manual `genai-vendor`, evitando manter a biblioteca Gemini no grafo do front-end.

- `scripts/static_security_check.mjs`
  - Expandiu varredura para `src`, `components`, `contexts`, `domain`, `hooks`, `repositories`, `services`, `stores`, `utils` e `vite.config.ts`.
  - Bloqueia `VITE_*` sensíveis, com allowlist explícita para:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
    - `VITE_DROPBOX_APP_KEY`

- `scripts/check_dist_for_sensitive_env.mjs`
  - Novo check pós-build.
  - Compara valores sensíveis do ambiente contra `dist` sem imprimir valores.

- `package.json`
  - Adicionou `security:scan`.
  - Adicionou `postbuild` para bloquear build quando valor sensível aparecer no `dist`.

- `components/QuizResultsModal.tsx`
  - Corrigiu um ponto existente de `dangerouslySetInnerHTML` para passar por `sanitizeHtml`.

## Escopo P1 - RAG/lesson_embeddings

### Causa

`public.lesson_embeddings` armazenava chunks de conteúdo de aula e a RPC `public.match_lesson_content` podia buscar por similaridade sem policy/RLS visível e sem filtro de autorização suficientemente explícito.

### Correção aplicada

- `supabase/migrations/20260621000100_security_lgpd_critical_remediation.sql`
  - Cria `public.can_access_lesson_embedding(p_lesson_id uuid)`.
  - Habilita e força RLS em `public.lesson_embeddings`.
  - Cria policy `lesson_embeddings_select_authorized`.
  - Substitui `public.match_lesson_content` por versão que:
    - exige `auth.uid()`;
    - filtra por `p_lesson_id` quando informado;
    - filtra por `p_course_id` quando informado;
    - sempre chama `public.can_access_lesson_embedding(le.lesson_id)`;
    - limita `match_count` entre 1 e 10;
    - revoga execução de `PUBLIC` e `anon`;
    - concede execução apenas a `authenticated`.

- `supabase/functions/ask-ai/index.ts`
  - Aceita `ragScope.courseId` e `ragScope.lessonId`.
  - Sanitiza IDs com regex UUID.
  - Chama `match_lesson_content` com `p_lesson_id` e `p_course_id`.
  - Não usa `userId` vindo do body; a autorização continua vinculada ao JWT do usuário autenticado.

- `hooks/useBuddyClient.ts`, `components/GeminiBuddy.tsx`, `components/BuddyFullPage.tsx`
  - Passam `courseId`/`lessonId` como escopo RAG quando disponíveis.

- `components/BuddyContextModal.tsx`, `components/features/classroom/LessonViewer.tsx`, `components/NotesPanelPrototype.tsx`
  - Passam escopo de aula/curso para o modal contextual quando disponível.

## Evidência de validação

### Comandos executados

```bash
npm.cmd run security:scan
npm.cmd run typecheck
npm.cmd run build
```

### Resultado

- `npm.cmd run security:scan`: OK.
- `npm.cmd run typecheck`: OK.
- `npm.cmd run build`: OK.
- `postbuild`: OK.

### Evidência redigida do dist

Comparação defensiva dos valores locais contra `dist`, sem imprimir os valores:

```text
VITE_GEMINI_API_KEY=NOT_FOUND_IN_DIST
VITE_API_KEY=NOT_FOUND_IN_DIST
```

Busca por nomes sensíveis no `dist`:

```text
rg -n "VITE_GEMINI_API_KEY|VITE_API_KEY" dist
```

Resultado: sem ocorrências.

Busca por chunk Gemini no `dist`:

```text
Get-ChildItem dist -Recurse -Filter '*genai*'
```

Resultado: sem arquivos.

Busca por source maps no `dist`:

```text
Get-ChildItem dist -Recurse -Filter *.map
```

Resultado: sem arquivos.

## Testes RLS/RAG planejados para staging

Os testes abaixo dependem da aplicação da migration em um banco Supabase de staging/produção. Eles não foram executados localmente neste ciclo porque a regra do trabalho proíbe deploy automático e não autoriza alterar banco fora do PR.

1. Aluno sem matrícula
   - Criar/usar aluno autenticado sem matrícula no curso da aula.
   - Chamar `match_lesson_content` com `p_course_id`/`p_lesson_id` de curso não matriculado.
   - Esperado: zero linhas.

2. Aluno matriculado
   - Criar/usar aluno autenticado com `course_enrollments.is_active = true`.
   - Chamar `match_lesson_content` para o curso/aula matriculado.
   - Esperado: retorna somente chunks desse curso/aula autorizado.

3. Instrutor dono/atribuído
   - Criar/usar instrutor dono do curso ou atribuído via `instructor_lesson_assignments`.
   - Chamar `match_lesson_content` para aula atribuída.
   - Esperado: retorna chunks autorizados.
   - Chamar para aula não atribuída.
   - Esperado: zero linhas.

4. Master
   - Criar/usar usuário com regra server-side de master.
   - Chamar `match_lesson_content` para curso/aula.
   - Esperado: retorna chunks autorizados pela regra master.

5. Buddy
   - Configurar chave local no Perfil.
   - Abrir Buddy em aula.
   - Perguntar sobre conteúdo da aula.
   - Esperado: Buddy responde sem chave institucional no bundle e sem erro RLS/CORS.

## Arquivos alterados

- `components/BuddyContextModal.tsx`
- `components/BuddyFullPage.tsx`
- `components/GeminiBuddy.tsx`
- `components/NotesPanelPrototype.tsx`
- `components/QuizResultsModal.tsx`
- `components/features/classroom/LessonViewer.tsx`
- `docs/audits/security-lgpd-audit-20260621.md`
- `docs/audits/security-lgpd-critical-remediation-20260621.md`
- `hooks/useBuddyClient.ts`
- `package.json`
- `scripts/check_dist_for_sensitive_env.mjs`
- `scripts/static_security_check.mjs`
- `services/AIService.ts`
- `services/Dependencies.ts`
- `services/supabaseClient.ts`
- `supabase/functions/ask-ai/index.ts`
- `supabase/migrations/20260621000100_security_lgpd_critical_remediation.sql`
- `vite.config.ts`

## Rotação manual necessária

As chaves que já foram expostas em bundle devem ser consideradas comprometidas.

Procedimento recomendado, sem registrar valores no repositório:

1. Revogar/rotacionar a chave Google AI antiga no Google AI Studio.
2. Remover `VITE_GEMINI_API_KEY` e `VITE_API_KEY` das variáveis da Vercel.
3. Se for necessária chave institucional, manter apenas como variável server-side de Edge Function, por exemplo `GEMINI_API_KEY`, nunca `VITE_*`.
4. Conferir que o próximo build mostra:
   - `VITE_GEMINI_API_KEY=NOT_FOUND_IN_DIST`
   - `VITE_API_KEY=NOT_FOUND_IN_DIST`

## Observações

- O fluxo Buddy com chave local do aluno continua sendo o caminho principal.
- A sincronização RAG no navegador foi bloqueada por segurança. Caso a funcionalidade precise continuar, a próxima etapa deve criar rotina server-side autenticada para gerar embeddings e escrever em `lesson_embeddings`.
- Não foi feito deploy automático.

## Atualizacao final pos-teste no SQL Editor

Migration aplicada manualmente no SQL Editor:

```text
supabase/migrations/20260621000100_security_lgpd_critical_remediation.sql
```

Resultado da execucao defensiva:

```text
Success. No rows returned
```

O erro anterior nao reapareceu:

```text
ERROR: 42P01: relation "public.lesson_embeddings" does not exist
```

Consulta de objetos executada apos a migration:

```text
public.lesson_embeddings = NULL
public.lessons = lessons
public.modules = modules
public.courses = courses
public.course_enrollments = course_enrollments
public.instructor_lesson_assignments = instructor_lesson_assignments
```

Consulta em `pg_policies` para `lesson_embeddings`:

```text
Success. No rows returned
```

Conclusao:

- A migration defensiva foi validada com sucesso em banco sem RAG base.
- O hardening RAG foi corretamente ignorado porque `public.lesson_embeddings` ainda nao existe.
- Quando qualquer pre-requisito esta ausente, a migration emite `NOTICE` e retorna sem criar `can_access_lesson_embedding`, sem executar `REVOKE`/`GRANT`, sem alterar RLS, sem criar policy e sem recriar `match_lesson_content`.
- RAG nao esta ativo nesse banco enquanto a migration base `archive/supabase-migrations/20260501_ai_context_rag.sql` nao for aplicada.
- Os testes reais de autorizacao RAG permanecem pendentes.
- Nao fazer merge.
- Nao fazer deploy.
- Manter o PR #2 em draft.
