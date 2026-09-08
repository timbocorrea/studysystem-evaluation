# Auditoria de Segurança e LGPD - StudySystem

Data: 2026-06-21  
Escopo: Issue #1 do repositório `timbocorrea/studysystem`  
Modo: auditoria defensiva, sem exposição de secrets e sem correções de código

## Sumário executivo

A auditoria confirmou achados críticos e altos que devem ser tratados antes de novas expansões de IA/administração. O ponto mais grave é a exposição de chaves `VITE_*` no bundle `dist`, incluindo chave Gemini/API configurada localmente. Também há risco alto no RAG por ausência visível de RLS na tabela `lesson_embeddings` e função de busca sem filtro explícito por autorização de curso/aula.

Não foram encontrados source maps em `dist`. Não foi confirmado `SUPABASE_SERVICE_ROLE_KEY` no front-end; o uso encontrado está em Edge Function e scripts locais. Ainda assim, a Edge Function `monitor-usage` concentra credenciais privilegiadas e deve ter CORS/controles revisados.

Relatórios locais utilizados como base:
- `logs/security-audit/20260621-021445/00-resumo-auditoria-seguranca-lgpd.txt`
- `logs/security-audit/20260621-021445/01-indicios-secrets-arquivos.txt`
- `logs/security-audit/20260621-021445/02-env-e-variaveis-publicas.txt`
- `logs/security-audit/20260621-021445/03-supabase-rls-edge-functions.txt`
- `logs/security-audit/20260621-021445/04-front-localstorage-logs.txt`
- `logs/security-audit/20260621-021445/05-build-dist-scan.txt`
- `logs/security-audit/20260621-021445/06-checklist-lgpd.txt`

## Achados CRITICOS

### CRITICO 1 - Chaves Gemini/API expostas no bundle front-end

Causa/risco: variáveis `VITE_*` são públicas em builds Vite. O projeto inicializa `AIService` no front-end com `import.meta.env.VITE_GEMINI_API_KEY`, e a varredura local confirmou que valores sensíveis configurados em `.env.local` aparecem literalmente em `dist`.

Arquivo/linha:
- `.env.local:3` - variável `VITE_GEMINI_API_KEY` presente localmente, valor não exibido.
- `.env.local:5` - variável `VITE_API_KEY` presente localmente, valor não exibido.
- `services/Dependencies.ts:49-53`
- `services/AIService.ts:8-12`, `services/AIService.ts:112-115`, `services/AIService.ts:152-155`
- `dist/assets/index-A8waQifo.js:1` - valores detectados, não exibidos.

Evidência redigida: script defensivo comparou valores de `.env.local` contra arquivos gerados e retornou `VITE_GEMINI_API_KEY=PRESENT_IN_DIST` e `VITE_API_KEY=PRESENT_IN_DIST`, sem imprimir os valores. O código passa `import.meta.env.VITE_GEMINI_API_KEY` para `new AIService(...)`.

Impacto: qualquer pessoa com acesso ao bundle público pode extrair a chave, consumir quota, gerar custo, revogar confiança da chave e potencialmente processar dados fora da governança prevista. Pela LGPD, afeta segurança, prevenção e responsabilização.

Correção mínima:
- Rotacionar imediatamente as chaves expostas.
- Remover `VITE_GEMINI_API_KEY` e `VITE_API_KEY` de ambientes de front-end.
- Desativar o caminho de IA direta no front-end ou mover para Edge Function autenticada.
- Reutilizar o fluxo aprovado de chave local do aluno/Edge Function sem embutir segredo no bundle.
- Adicionar validação CI que falhe quando valores sensíveis aparecem em `dist`.

Plano de teste:
- Rodar build limpo.
- Executar busca redigida comparando valores sensíveis locais contra `dist` e exigir `NOT_FOUND_IN_DIST`.
- Rodar `rg -n "VITE_GEMINI_API_KEY|VITE_API_KEY|GEMINI_API_KEY" services components hooks utils dist`.
- Testar Buddy e geração de quiz após migração para backend, sem chave no bundle.

### CRITICO 2 - RAG/lesson_embeddings sem RLS visível e busca sem escopo de autorização

Causa/risco: a migration cria `public.lesson_embeddings` e a função `public.match_lesson_content`, mas não há `ALTER TABLE public.lesson_embeddings ENABLE ROW LEVEL SECURITY` nem policies visíveis nesse arquivo. A Edge Function `ask-ai` chama a RPC sem passar curso/aula autorizada, buscando conteúdo global por similaridade.

Arquivo/linha:
- `archive/supabase-migrations/20260501_ai_context_rag.sql:5-12`
- `archive/supabase-migrations/20260501_ai_context_rag.sql:15-42`
- `supabase/functions/ask-ai/index.ts:325-334`

Evidência redigida: a tabela contém `content TEXT NOT NULL` com chunks de aulas. A função retorna `lesson_id`, `content` e `metadata`. A chamada em `ask-ai` usa `match_lesson_content` com embedding e `match_count`, sem filtro explícito de matrícula/permissão.

Impacto: risco de exposição cruzada de conteúdo de aulas, materiais e contexto educacional entre usuários/cursos, inclusive via respostas do Buddy. Pela LGPD, afeta necessidade, segurança e prevenção, além de confidencialidade de conteúdo.

Correção mínima:
- Habilitar RLS em `public.lesson_embeddings`.
- Criar policies de leitura baseadas em matrícula ativa, instrutor atribuído ou master.
- Ajustar `match_lesson_content` para receber `user_id`/`lesson_id`/`course_id` e filtrar por autorização.
- Revogar execução pública da RPC se não for necessária diretamente ao cliente.
- Na Edge Function, buscar RAG apenas dentro do escopo do usuário/aula/curso.

Plano de teste:
- Usuário sem matrícula não consegue selecionar nem consultar embeddings de curso não autorizado.
- Usuário matriculado recupera apenas conteúdo de seu curso.
- Instrutor recupera apenas aulas atribuídas.
- Buddy continua respondendo com RAG autorizado.

## Achados ALTOS

### ALTO 1 - Campo legado `profiles.gemini_api_key` ainda lido, editado e usado como fallback

Causa/risco: a arquitetura recente definiu a chave do aluno como configuração local do dispositivo. Ainda assim, o painel admin lê/escreve `profiles.gemini_api_key`, e `ask-ai` usa esse campo como fallback quando não recebe chave no body.

Arquivo/linha:
- `components/features/admin/UserManagement.tsx:125-143`
- `components/features/admin/UserManagement.tsx:955-970`
- `repositories/SupabaseAdminRepository.ts:496-508`
- `supabase/functions/ask-ai/index.ts:259-287`

Evidência redigida: o admin seleciona `gemini_api_key`, coloca o valor em estado React e renderiza input `type="text"`. A Edge Function consulta `profiles.gemini_api_key` antes de usar `GEMINI_API_KEY`.

Impacto: segredo de aluno pode permanecer em banco, aparecer em UI administrativa e conflitar com a finalidade aprovada de armazenamento local. Se o banco ou conta admin forem comprometidos, há exposição de chaves de terceiros.

Correção mínima:
- Remover leitura/escrita desse campo no admin e na Edge Function.
- Planejar limpeza/rotação de valores já persistidos.
- Se algum uso institucional for necessário, armazenar segredo em vault/Edge env, nunca em perfil de usuário em claro.

Plano de teste:
- `rg -n "gemini_api_key"` deve retornar apenas migrations/limpeza documentada.
- Admin não exibe campo de API key de usuário.
- Buddy funciona apenas com chave local do aluno ou chave institucional segura.

### ALTO 2 - Logs de front-end podem expor conteúdo, URLs e dados pessoais

Causa/risco: há muitos `console.log`, `console.error` e `console.warn` com trechos de conteúdo, IDs de aula, URLs Dropbox/Supabase, respostas de IA e erros completos.

Arquivo/linha:
- `components/LessonContentEditorPage.tsx:607-618`
- `components/LessonContentEditorPage.tsx:711-778`
- `components/LessonContentEditorPage.tsx:1086-1117`
- `components/LessonContentEditorPage.tsx:1210-1246`
- `components/LessonContentEditorPage.tsx:1409`
- `components/LessonContentEditorPage.tsx:1565-1592`
- `components/LessonContentEditorPage.tsx:1689-1738`
- `components/LessonContentEditorPage.tsx:3126-3209`
- `components/DropboxAudioBrowser.tsx:194-200`
- `components/features/classroom/LessonViewer.tsx:526`
- `services/AIService.ts:124`
- `components/ErrorBoundary.tsx:52-55`

Evidência redigida: exemplos redigidos incluem logs de URL de Dropbox, URL pública de upload, seleção de texto, conteúdo antigo/novo, título de quiz, IDs de aula e resposta bruta de IA ao falhar parse.

Impacto: vazamento em console do navegador, prints de suporte, ferramentas de observabilidade e sessões compartilhadas. Pode expor dados pessoais, conteúdo educacional e links persistentes.

Correção mínima:
- Remover logs sensíveis ou encapsular em logger dev-only com redaction.
- Nunca logar prompt, resposta de IA, URLs completas, tokens, headers ou conteúdo selecionado.
- Sanitizar `ErrorBoundary` e serviços para produção.

Plano de teste:
- `rg -n "console\\.(log|error|warn)"` não deve retornar logs sensíveis em produção.
- Fluxos de edição, Dropbox, Buddy e aula funcionam sem logs sensíveis.

### ALTO 3 - `monitor-usage` usa credenciais privilegiadas e CORS fixo por `FRONTEND_URL`

Causa/risco: a Edge Function carrega `SUPABASE_SERVICE_ROLE_KEY` e token de Management API no runtime. Ela autentica o usuário e checa perfil, mas usa CORS de origem única por env/default e não a allowlist já adotada em `ask-ai`.

Arquivo/linha:
- `supabase/functions/monitor-usage/index.ts:4-10`
- `supabase/functions/monitor-usage/index.ts:20-23`
- `supabase/functions/monitor-usage/index.ts:35-47`
- `supabase/functions/monitor-usage/index.ts:57-63`
- `supabase/functions/monitor-usage/index.ts:85-88`

Evidência redigida: `monitor-usage` lê service role e Management API token de ambiente, cria admin client e consulta Supabase Management API com bearer interno. Não foi impresso nenhum token.

Impacto: se autorização/CORS/roles ficarem inconsistentes, uma função com privilégios elevados vira ponto sensível. Também pode quebrar produção quando `FRONTEND_URL` divergir da URL oficial.

Correção mínima:
- Adotar allowlist dinâmica igual à `ask-ai`.
- Falhar fechado se envs privilegiados ausentes ou usuário não autorizado.
- Validar roles contra o padrão real (`MASTER`/`INSTRUCTOR` versus `admin`/`instructor`).
- Garantir que erros não incluam secrets nem detalhes internos.

Plano de teste:
- Preflight da URL oficial retorna a origem correta.
- Sem Authorization retorna 401.
- Aluno retorna 403.
- Admin autorizado retorna métricas sem tokens no payload.

### ALTO 4 - Dados pessoais e privilégios no Admin/UserManagement dependem de controles mistos

Causa/risco: a tela admin lista nome, email, status, papel e ações sensíveis. Existem proteções por email hardcoded no cliente/domínio/repositório, além de dependência de RLS/RPC para autorização real.

Arquivo/linha:
- `components/features/admin/UserManagement.tsx:531-532`
- `components/features/admin/UserManagement.tsx:576-597`
- `components/features/admin/UserManagement.tsx:743-764`
- `repositories/SupabaseAdminRepository.ts:475-508`
- `repositories/SupabaseAdminRepository.ts:568-625`
- `domain/entities.ts:340-356`

Evidência redigida: a UI usa email específico para desabilitar ações e o domínio força papel `MASTER` por email. O repositório lista colunas pessoais de `profiles`.

Impacto: se policies/RPC estiverem frágeis, cliente manipulado pode tentar ações administrativas. A listagem ampla de PII exige base legal, necessidade e rastreabilidade.

Correção mínima:
- Garantir autorização server-side/RLS para cada ação admin.
- Remover regra de privilégio por email hardcoded do cliente; usar papel/claim controlado no banco.
- Reduzir colunas pessoais retornadas ao mínimo necessário.
- Auditar ações admin com retenção definida.

Plano de teste:
- Conta comum não lista nem altera perfis via cliente/API.
- Instrutor só acessa escopo autorizado.
- Master mantém proteção via regra server-side, não por UI.

## Achados MEDIOS

### MEDIO 1 - Dados sensíveis persistidos em localStorage/sessionStorage sem política de retenção clara

Causa/risco: o app armazena histórico do Buddy, rascunhos de quiz, rascunhos offline de aula, preferências e chave Google AI local em storage do navegador. A chave local é decisão funcional aprovada, mas exige transparência, retenção e controle do titular.

Arquivo/linha:
- `stores/useBuddyStore.ts:197-200`
- `hooks/useQuizAutoSave.ts:10-15`, `hooks/useQuizAutoSave.ts:41-54`
- `components/LessonContentEditorPage.tsx:1280-1317`
- `components/LessonContentEditorPage.tsx:1349`
- `utils/studentGoogleAiApiKey.ts:1-21`
- `utils/cacheManager.ts:48-65`

Evidência redigida: há chaves como `buddy-store-v3`, `study_system_quiz_draft_${userId}_${quizId}`, `offline_draft_${lesson.id}` e `studysystem:student_google_ai_api_key`.

Impacto: em dispositivo compartilhado ou com XSS, conversas, respostas, rascunhos e chave local podem ser acessados. Pela LGPD, precisa de informação ao titular, minimização e retenção.

Correção mínima:
- Documentar no aviso de privacidade o uso de storage local.
- Criar ação clara de "remover dados locais deste dispositivo".
- Definir TTL para rascunhos e histórico.
- Manter preservação da chave no logout apenas com opção visível de remoção.

Plano de teste:
- Logout remove apenas o que deve remover e preserva somente a chave autorizada.
- Botão de limpeza local remove Buddy/drafts/chave quando solicitado.
- Histórico antigo expira conforme política definida.

### MEDIO 2 - Tokens Dropbox em sessionStorage e links compartilhados em logs

Causa/risco: OAuth Dropbox usa PKCE e `sessionStorage`, o que é melhor que `localStorage`, mas ainda expõe token ao contexto JS. Além disso, o navegador registra links compartilhados permanentes e paths.

Arquivo/linha:
- `services/dropbox/DropboxService.ts:26-58`
- `services/dropbox/DropboxService.ts:77-88`
- `services/dropbox/DropboxService.ts:99-172`
- `components/DropboxAudioBrowser.tsx:194-200`
- `components/DropboxFileBrowser.tsx:31-60`

Evidência redigida: `dropbox_access_token`, `dropbox_oauth_state` e `dropbox_code_verifier` são armazenados em `sessionStorage`. Logs exibem criação de link permanente e caminho do arquivo.

Impacto: XSS ou sessão compartilhada pode capturar token/link. Links permanentes podem expor material de aula.

Correção mínima:
- Remover logs de links/paths.
- Garantir limpeza em logout e fechamento de sessão.
- Usar escopos mínimos no Dropbox.
- Considerar proxy backend ou tokens de curta duração se o risco aumentar.

Plano de teste:
- Após logout, `sessionStorage` não contém token Dropbox.
- Nenhum link Dropbox completo aparece no console.
- Integração Dropbox continua funcionando.

### MEDIO 3 - Policies com `WITH CHECK (true)` permitem inserção ampla

Causa/risco: algumas policies permitem insert com `WITH CHECK (true)`, o que pode permitir criação de registros para terceiros se a tabela estiver disponível ao papel autenticado.

Arquivo/linha:
- `archive/supabase-migrations/20260322120000_add_notifications.sql:39-41`
- `supabase/migrations/20260101_user_achievements.sql:26-28`

Evidência redigida: `notifications_insert_system` e `System can insert achievements` usam `WITH CHECK (true)`.

Impacto: spam/notificações falsas, achievements forjados e inconsistência de gamificação. Impacta prevenção e integridade.

Correção mínima:
- Trocar por `WITH CHECK (auth.uid() = user_id)` quando o usuário puder inserir apenas para si.
- Para inserts de sistema, mover para RPC/Edge Function com service role e revogar insert direto de clientes.

Plano de teste:
- Usuário autenticado não consegue inserir notificação/conquista para outro usuário.
- Fluxos legítimos de gamificação/notificação continuam criando registros.

### MEDIO 4 - Scanner estático de segurança não cobre o caso real de vazamento

Causa/risco: o script `scripts/static_security_check.mjs` procura API keys apenas em alguns diretórios e padrões, deixando de flagrar `services/Dependencies.ts`, onde o vazamento crítico ocorre.

Arquivo/linha:
- `scripts/static_security_check.mjs:36-44`
- `services/Dependencies.ts:49-53`

Evidência redigida: a regra foca `components`, `pages`, `hooks` e `vite.config.ts`, mas a inicialização de IA com env pública está em `services`.

Impacto: falso negativo em CI/revisões e risco recorrente de reintrodução de secrets no front-end.

Correção mínima:
- Expandir scanner para `services`, `repositories`, `utils` e `stores`.
- Detectar qualquer `VITE_*` com nomes sensíveis (`KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `SERVICE_ROLE`), exceto allowlist explícita para anon/public keys.
- Adicionar verificação redigida de valores reais contra `dist`.

Plano de teste:
- Inserir secret fake em arquivo de serviço deve fazer o scanner falhar.
- `VITE_SUPABASE_ANON_KEY` e `VITE_DROPBOX_APP_KEY` passam apenas como públicos documentados.

### MEDIO 5 - CSP permite `unsafe-inline` e `unsafe-eval`

Causa/risco: a CSP atual permite scripts inline e eval. Isso reduz a efetividade contra XSS, que é especialmente relevante porque há secrets/dados em browser storage.

Arquivo/linha:
- `vercel.json:33-34`

Evidência redigida: `script-src` contém `'unsafe-inline'` e `'unsafe-eval'`.

Impacto: uma falha XSS teria caminho mais fácil para ler localStorage/sessionStorage, incluindo histórico Buddy, rascunhos, chave local de IA e tokens Dropbox.

Correção mínima:
- Remover `unsafe-eval`.
- Substituir inline por nonce/hash quando viável.
- Ativar relatório CSP antes de bloquear se necessário.

Plano de teste:
- Build e navegação principal funcionam sem violação CSP.
- Tentativas de script inline não autorizado são bloqueadas.
- Relatórios CSP não incluem falsos positivos críticos.

### MEDIO 6 - Retenção e direitos do titular ainda não estão materializados

Causa/risco: há dados pessoais em `profiles`, `audit_logs`, `ai_usage_logs`, histórico local Buddy, quiz drafts, notas, respostas e gamificação. A auditoria local LGPD não encontrou política explícita de retenção/exportação/exclusão para esses conjuntos.

Arquivo/linha:
- `logs/security-audit/20260621-021445/06-checklist-lgpd.txt`
- `services/AuditService.ts:89-155`
- `supabase/migrations/20260224112500_smart_audit_logs.sql:6-26`
- `supabase/migrations/20260311092500_ai_usage_logs.sql:4-25`

Evidência redigida: o checklist local marcou como pendentes finalidade, necessidade, transparência, direitos do titular, retenção e incidente.

Impacto: fragilidade de aderência LGPD mesmo que controles técnicos existam. A ausência de retenção aumenta exposição em caso de incidente.

Correção mínima:
- Definir tabela de retenção por tipo de dado.
- Criar processo de exportação/exclusão/correção.
- Documentar aviso de privacidade.
- Criar rotina de anonimização/purga para logs antigos.

Plano de teste:
- Solicitação simulada de titular consegue exportar dados pessoais.
- Exclusão/anomização respeita dependências legais.
- Logs antigos são purgados conforme prazo.

## Achados BAIXOS e observações positivas

### BAIXO 1 - Source maps não encontrados em `dist`

Causa/risco: source maps em produção poderiam facilitar engenharia reversa. A varredura local não encontrou arquivos `.map`.

Arquivo/linha:
- `dist/**` - nenhum arquivo `.map` encontrado.
- `logs/security-audit/20260621-021445/05-build-dist-scan.txt`

Evidência redigida: `Get-ChildItem dist -Recurse -Filter *.map` não retornou arquivos.

Impacto: positivo. Ainda há bundle legível o suficiente para extrair valores públicos/embutidos, mas não há source maps.

Correção mínima:
- Manter source maps desativados em produção.
- Adicionar check CI para bloquear `.map` em deploy público.

Plano de teste:
- Após build, comando de busca por `.map` deve retornar vazio.

### BAIXO 2 - `VITE_SUPABASE_ANON_KEY` e `VITE_DROPBOX_APP_KEY` aparecem em bundle, mas são chaves públicas por desenho

Causa/risco: anon key Supabase e app key Dropbox são esperadas no browser, mas precisam ser tratadas como identificadores públicos, não como segredos.

Arquivo/linha:
- `.env.local:2` - `VITE_SUPABASE_ANON_KEY`, valor não exibido.
- `.env.local:4` - `VITE_DROPBOX_APP_KEY`, valor não exibido.
- `vite.config.ts:117-123`
- `services/dropbox/DropboxService.ts:23`

Evidência redigida: os valores foram encontrados em `dist`, sem exibição. Isso é aceitável apenas se forem chaves públicas e se RLS/CSP/OAuth scopes estiverem corretos.

Impacto: baixo isoladamente; alto se confundido com service role, secret ou token.

Correção mínima:
- Documentar explicitamente quais `VITE_*` são públicos permitidos.
- Bloquear `VITE_*` sensíveis por naming convention e CI.

Plano de teste:
- Build contém apenas chaves públicas permitidas.
- RLS impede acesso indevido mesmo com anon key pública.

## Validações especificas solicitadas

- Secrets hardcoded: confirmado risco crítico para Gemini/API via `VITE_*` em bundle. Valores não foram expostos neste relatório.
- Service role no front-end: não confirmado. `SUPABASE_SERVICE_ROLE_KEY` apareceu em `monitor-usage` e scripts locais, não em componentes/hooks front-end.
- `VITE_*` sensíveis: confirmado `VITE_GEMINI_API_KEY` e `VITE_API_KEY` em `.env.local` e `dist`.
- RLS e policies Supabase: há hardening em várias migrations, mas `lesson_embeddings` não mostra RLS/policies e existem `WITH CHECK (true)` em inserts.
- Edge Functions `ask-ai` e `monitor-usage`: `ask-ai` está melhor com auth/CORS allowlist/sanitização, mas ainda lê `profiles.gemini_api_key`; `monitor-usage` precisa de allowlist e revisão de roles/envs privilegiados.
- localStorage/sessionStorage: há dados de IA, drafts, quiz e Dropbox; precisa retenção/transparência/limpeza seletiva.
- Logs com dados pessoais: confirmado em diversos componentes e serviços.
- Tokens Dropbox: token em `sessionStorage`; sem refresh token encontrado; logs de links/paths precisam remoção.
- Dados pessoais em Admin/UserManagement: confirmado nome/email/status/role e campo legado de API key.
- Source maps e bundle `dist`: source maps ausentes; bundle contém valores `VITE_*`.
- LGPD: pendências em finalidade, necessidade, segurança, prevenção, responsabilização, direitos do titular, retenção e resposta a incidente.

## Plano de remediação recomendado

1. Rotacionar chaves expostas e remover `VITE_GEMINI_API_KEY`/`VITE_API_KEY` do front-end.
2. Corrigir RAG: RLS em `lesson_embeddings`, RPC autorizada e busca restrita ao escopo do usuário.
3. Remover `profiles.gemini_api_key` dos fluxos admin/Edge Function e limpar valores legados.
4. Sanitizar/remover logs sensíveis em produção.
5. Revisar `monitor-usage`: CORS allowlist, roles corretos e fail-closed.
6. Ajustar policies `WITH CHECK (true)` para inserts restritos ou RPC server-side.
7. Formalizar LGPD: aviso de privacidade, retenção, exportação/exclusão, resposta a incidente.
8. Fortalecer CI: scanner de secrets em source e `dist`, bloqueio de source maps e CSP report.

## Comandos defensivos executados

Os comandos foram executados sem imprimir secrets. Quando valores foram comparados contra `dist`, a saída exibiu apenas `PRESENT`/`NOT_FOUND`.

```bash
git status --short --branch
rg -n -i "service_role|SUPABASE_SERVICE|client_secret|api_secret|private_key|VITE_.*(SERVICE|SECRET|TOKEN|KEY|ROLE)|DROPBOX.*SECRET|GOOGLE.*SECRET|GEMINI.*KEY|OPENAI.*KEY" ...
rg -n "localStorage|sessionStorage|console.log|console.error|console.warn" ...
rg -n "ENABLE ROW LEVEL SECURITY|CREATE POLICY|WITH CHECK \\(true\\)|lesson_embeddings|match_lesson_content" supabase/migrations supabase/functions
Get-ChildItem dist -Recurse -Filter *.map
```

## Conclusao

O projeto possui avanços relevantes recentes na integração do Buddy AI e no tratamento local da chave do aluno, mas a auditoria defensiva identificou dois bloqueadores críticos: chaves sensíveis embutidas no bundle e RAG sem isolamento comprovado por RLS/escopo. Recomenda-se tratar esses pontos antes de novas funcionalidades e registrar rotação de credenciais como ação de incidente preventivo.
