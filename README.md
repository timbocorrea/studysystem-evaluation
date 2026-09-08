# StudySystem

## Snapshot público para avaliação acadêmica

Este repositório é um snapshot público sanitizado do StudySystem, preparado para a avaliação acadêmica. Ele não contém secrets, credenciais privadas ou o histórico Git do repositório canônico. O arquivo `.env.example` usa somente placeholders; configure os valores do seu ambiente em `.env.local`, que não deve ser versionado. Não publique credenciais, tokens ou outros dados privados.

## Projeto Integrador — 2ª Entrega

**Integrante:** ALEXANDRE CORREA DOS SANTOS

O StudySystem é apresentado nesta segunda entrega por meio de uma Prova de Conceito funcional. A primeira etapa descreveu uma visão ampla do produto; nesta etapa, a proposta foi revisitada e reduzida deliberadamente a uma jornada crítica que pudesse ser demonstrada de ponta a ponta, integrando interface, lógica e persistência.

### Revisita da primeira etapa

A visão inicial reunia diferentes possibilidades para estudantes, professores/gestores e administração, além de cursos, aulas, questionários, progresso, gamificação, IA, TTS, mobilidade/PWA, recursos offline e uma possível evolução SaaS/multi-tenant.

Para a segunda entrega, a prioridade deixou de ser quantidade de funcionalidades e passou a ser **coerência e comprovação de funcionamento**. A escolha foi demonstrar uma jornada completa em vez de várias capacidades incompletas.

```text
VISÃO DO PRODUTO
→ PRIORIZAÇÃO
→ POC FUNCIONAL
```

### Persona e problema priorizados

A persona que sustenta a PoC é **Ricardo**, proveniente da primeira entrega. A jornada priorizada responde à necessidade de manter continuidade nos estudos em uma rotina com períodos curtos e mobilidade, reduzindo a dependência de materiais fragmentados e permitindo retomar posteriormente o ponto de estudo registrado.

A PoC não cria novos atributos pessoais para a persona; utiliza apenas Ricardo como referência acadêmica da jornada estudantil selecionada.

### PoC escolhida

```text
Aluno autenticado
→ Dashboard
→ Curso
→ Aula
→ Questionário
→ Resultado
→ Progresso salvo
→ Retorno posterior
```

A demonstração comprova que o aluno acessa um curso e uma aula, responde um questionário, recebe o resultado e mantém tentativa/progresso persistidos para recuperação posterior.

O escopo detalhado está em [`docs/segunda-entrega/POC.md`](docs/segunda-entrega/POC.md), e a rastreabilidade entre necessidade, requisitos, critérios de aceitação e evidências está em [`docs/segunda-entrega/REQUISITOS_E_ACEITACAO.md`](docs/segunda-entrega/REQUISITOS_E_ACEITACAO.md).

### Evolução dos papéis do produto

A primeira proposta utilizava conceitos mais amplos de papéis. A implementação atual consolidou os papéis efetivamente usados pelo sistema. O quadro abaixo mostra aproximações de responsabilidade, e não equivalências de identidade ou de permissão:

| Conceito da proposta inicial | Papel atual relacionado | Leitura para a 2ª entrega |
|---|---|---|
| Aluno/Colaborador | `STUDENT` | `STUDENT` representa a jornada de aprendizagem usada na PoC; “Colaborador” era uma linguagem mais ampla da visão inicial. |
| Gestor/Professor | `INSTRUCTOR` | `INSTRUCTOR` concentra interações autorizadas de conteúdo/curso; não se afirma equivalência total com todos os conceitos originais de gestão. |
| User Master/Dono | `MASTER` | `MASTER` representa operações administrativas ampliadas no modelo atual. |
| SuperAdmin SaaS | sem equivalência atual declarada | visão futura/multi-tenant, fora do escopo obrigatório da PoC. |

### Avaliação rápida da PoC

Para localizar rapidamente o que será demonstrado pelo avaliador:

1. Confirmar uma sessão de aluno autorizada, sem publicar credenciais.
2. Abrir o Dashboard.
3. Selecionar um curso.
4. Abrir uma aula do curso.
5. Acessar e responder o questionário.
6. Enviar as respostas e visualizar o resultado.
7. Confirmar que a tentativa/progresso foram persistidos.
8. Retornar ao curso/aula e observar a recuperação do progresso.

A validação consolidada da PoC inclui desktop e viewport mobile aproximado de 390 x 844. O estado técnico atual documentado para a entrega é de 32 suítes / 167 testes unitários aprovados, typecheck, build e security scan aprovados, além de alinhamento operacional de 42 migrations ativas com 42 remotas. A Fase B foi concluída com ensaio pré-vídeo aprovado, com duração aproximada de 54 segundos e dentro do limite de 60 segundos.

### Evidências visuais

`SCREENSHOT_EVIDENCE_STATUS=PENDING`

Não foram adicionadas imagens artificiais para representar evidência. Screenshots seguros poderão ser incorporados em etapa posterior se forem necessários para o pacote final de submissão.

## Vídeo da PoC

**PENDENTE — será inserido na Fase D.**

Nenhuma URL de vídeo é declarada antes da produção e validação do material final.

### GitHub para avaliação

```text
GITHUB_EVALUATION_ACCESS=PASS
PUBLIC_EVALUATION_REPOSITORY=https://github.com/timbocorrea/studysystem-evaluation
PUBLIC_REPOSITORY_VISIBILITY=PUBLIC
EVALUATION_REPOSITORY=PUBLIC_SANITIZED_SNAPSHOT
CANONICAL_REPOSITORY=PRIVATE
CANONICAL_REPOSITORY_VISIBILITY=PRIVATE
```

Este repositório é o snapshot público sanitizado destinado à avaliação acadêmica da 2ª entrega. Código e documentação estão disponíveis para avaliação; o repositório canônico e seu histórico permanecem privados e não fazem parte deste snapshot.

---

## Sobre o produto

Plataforma web de estudos para organizar cursos, aulas, questionários, materiais e acompanhamento de aprendizagem em um único ambiente.

O StudySystem atende escolas, instituições de ensino, cursos profissionalizantes, preparação para provas, treinamentos corporativos e operações de educação a distância. A interface é responsiva e pode ser instalada como PWA em navegadores compatíveis.

## O que a plataforma oferece

- Cadastro, login por e-mail e senha e login com Google.
- Dashboard com cursos, progresso, XP semanal e acesso rápido ao conteúdo.
- Cursos organizados em módulos e aulas.
- Conteúdo de aula com texto, imagens, vídeo, áudio, arquivos e materiais externos.
- Questionários práticos e avaliativos, banco de questões, tentativas, respostas e resultados.
- Progresso por aula e por curso, com persistência e recuperação após novo login.
- XP, níveis, conquistas e histórico de recompensas.
- Fórum associado à aula para interação e acompanhamento.
- Ferramentas de conteúdo, usuários, acessos, arquivos, questionários e configurações para perfis autorizados.
- Integração opcional com Dropbox para localizar e utilizar materiais.
- Buddy AI e recursos de recomendações e geração de questionários quando a integração de IA estiver configurada.
- Interface responsiva, navegação móvel e suporte a instalação como PWA.

## Jornada do estudante

    Aluno autenticado → Dashboard → Curso → Aula → Questionário → Resultado → Progresso salvo → Retorno posterior

O estudante entra na conta, acessa os cursos disponíveis, percorre módulos e aulas, consulta materiais, responde questionários e acompanha o próprio progresso. O estado salvo é recuperado pelo backend quando a conta volta a ser utilizada.

## Perfis de acesso

O acesso é controlado por autenticação, perfil e políticas do backend.

- STUDENT: consome cursos, aulas, materiais, questionários, fórum, progresso e recursos de gamificação disponíveis para sua conta.
- INSTRUCTOR: administra conteúdo e interações dentro dos cursos, aulas ou atribuições autorizadas pela instituição.
- MASTER: possui as funções administrativas ampliadas para usuários, acessos, auditoria e configurações do sistema.

Novos cadastros começam como estudantes. A concessão de permissões administrativas deve ser feita pelo operador responsável, conforme a política da instituição, com acesso administrativo ao ambiente. A aplicação não oferece promoção pública de perfil nem atalhos para contornar as políticas de segurança.

## Arquitetura

O frontend segue uma arquitetura em camadas e usa Repository Pattern para manter o acesso aos dados isolado dos componentes de interface:

    Componentes React e rotas
              ↓
    Hooks, Contexts e stores
              ↓
    Services e casos de uso
              ↓
    Repositories e interfaces de domínio
              ↓
    Supabase Client, Auth, RPCs e Storage
              ↓
    PostgreSQL, RLS e Edge Functions

As dependências são compostas em services/Dependencies.ts e o cliente Supabase é criado em services/supabaseClient.ts. Não há um backend Node monolítico separado: o backend da aplicação é formado pelos serviços Supabase configurados para o projeto.

## Tecnologias

- React 19 e TypeScript.
- Vite e React Router.
- Tailwind CSS.
- TanStack Query para dados remotos e cache.
- React Context e Zustand para sessão e estado global complementar.
- Supabase Auth, PostgreSQL, Row Level Security, Storage e Edge Functions em Deno.
- Vitest para testes automatizados.
- Playwright para testes de navegador.
- Recharts, Lucide e outras bibliotecas de interface já declaradas no projeto.

## Pré-requisitos

- Git com acesso ao snapshot público fornecido para avaliação.
- Node.js 20 ou versão compatível com o pipeline do projeto.
- npm.
- Um projeto Supabase configurado para a aplicação.
- Chromium instalado caso os testes de navegador sejam executados localmente.
- Uma conta Dropbox configurada somente se a integração de materiais for necessária.

Docker e Supabase local não são necessários para a instalação web padrão conectada a um projeto Supabase em nuvem.

## Instalação local

    git clone <URL_DO_ESPELHO_DE_AVALIACAO>
    cd studysystem
    npm ci

No PowerShell:

    Copy-Item .env.example .env.local

No Bash:

    cp .env.example .env.local

Revise o arquivo local, mantenha-o fora do controle de versão e conserve nele somente as variáveis públicas do frontend. O `.env.example` é um ponto de partida e atualmente contém as variáveis Supabase; se o Dropbox for usado, adicione manualmente `VITE_DROPBOX_APP_KEY` ao `.env.local`, sem modificar o `.env.example`.

Há dois modelos distintos de credencial de IA:

- Credenciais institucionais ou da plataforma pertencem aos secrets protegidos das Edge Functions, não usam prefixo `VITE_`, não devem ser versionadas e não podem ser expostas ao frontend.
- A chave pessoal do estudante pode ser configurada no Perfil; atualmente é uma chave Google AI, armazenada localmente no navegador e enviada à Edge Function autenticada somente quando o recurso correspondente é utilizado. Ela não deve ser registrada em logs nem versionada.

Referências sem o prefixo `VITE_` pertencem ao runtime protegido das Edge Functions e não devem ser preenchidas no navegador.

## Variáveis do frontend

    VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
    VITE_SUPABASE_ANON_KEY=SEU_ANON_KEY
    VITE_DROPBOX_APP_KEY=SEU_DROPBOX_APP_KEY

VITE_DROPBOX_APP_KEY é opcional e só é necessário para habilitar o fluxo Dropbox. Os dois valores Supabase são necessários para a aplicação iniciar corretamente.

Não coloque chaves administrativas, tokens privados, senhas ou credenciais de Edge Functions em variáveis VITE_*. Tudo que começa com VITE_ pode ser enviado ao navegador. A chave administrativa do Supabase nunca deve aparecer no frontend, em .env.local, no README ou em arquivos versionados.

## Configuração do Supabase

O frontend espera um projeto Supabase com o schema e os objetos compatíveis com a versão do código. O ambiente utiliza tabelas para perfis, cursos, módulos, aulas, matrículas, progresso, recursos, questionários, tentativas, respostas, fórum, conquistas, XP, notificações e auditoria, além de RPCs, políticas RLS, Storage e Edge Functions.

Os buckets usados pelo fluxo de conteúdo incluem lesson-resources e avatars; a configuração do ambiente também pode manter buckets complementares para imagens e áudio. Os nomes, políticas e limites devem ser conferidos antes de uma instalação institucional.

O histórico em supabase/migrations/ representa a evolução do ambiente existente e não deve ser tratado automaticamente como um instalador completo de uma instância Supabase vazia. Atualmente, a configuração de uma nova instância requer o provisionamento de um schema compatível e a conferência das políticas, RPCs, buckets e funções esperados pela aplicação. Não há neste README um comando que prometa bootstrap automático de uma instância vazia.

Para uma nova instalação:

1. Crie ou selecione o projeto Supabase da instituição.
2. Provisione o schema compatível por um procedimento controlado do operador responsável.
3. Confira tabelas, colunas, chaves, RLS, policies, RPCs, Storage e Edge Functions antes de liberar usuários.
4. Configure os provedores de login e as URLs de redirecionamento do domínio local ou publicado.
5. Cadastre o primeiro usuário e peça ao operador com acesso administrativo para provisionar o perfil elevado, se necessário.
6. Configure os secrets de runtime das Edge Functions apenas no ambiente protegido do Supabase.

Não execute alterações destrutivas, conceda permissões amplas nem aplique migrations históricas cegamente em um banco remoto. Mudanças de schema devem ser acompanhadas por backup, revisão e procedimento operacional específico.

## Primeiro acesso

1. Inicie o projeto e abra http://localhost:3000.
2. Crie uma conta ou entre com e-mail e senha.
3. Use Google se o provedor estiver habilitado no Supabase.
4. Aguarde a confirmação de e-mail quando ela estiver exigida pela configuração de Auth.
5. Entre no dashboard e acesse os cursos liberados para a conta.

O acesso a áreas administrativas aparece somente para perfis autorizados. Cursos, matrículas e conteúdo visíveis dependem das políticas e atribuições do ambiente.

## Conteúdo e aprendizagem

Instrutores e administradores autorizados podem trabalhar com cursos, módulos, aulas, blocos de conteúdo, materiais, questionários e arquivos conforme suas atribuições. O estudante visualiza o conteúdo liberado, registra progresso, participa do fórum e consulta seus resultados.

As aulas podem combinar texto, imagens, vídeos, áudio, arquivos armazenados e links externos. Materiais externos, incluindo referências do Dropbox, devem continuar sujeitos às permissões do serviço de origem.

## Questionários e resultados

O sistema suporta questionários em modo prático e avaliativo, bancos de questões, opções, seleção de questões, tentativas, respostas dos estudantes e resultados. Questões podem ser organizadas e selecionadas conforme a configuração do curso. Ferramentas de acompanhamento e correção ficam disponíveis somente para os perfis autorizados.

Na jornada da PoC, o estudante utiliza contratos próprios do fluxo de questionário. A RPC `get_lesson_quiz_for_student` fornece à UI o conteúdo necessário sem retornar o marcador de resposta correta no contrato utilizado pela interface do aluno. O envio e a consulta de resultados passam pelos services e repositories do projeto, respeitando Auth e as regras server-side aplicáveis. Esta descrição se limita ao caminho comprovado e não é uma afirmação absoluta sobre toda a superfície do sistema.

## Progresso e recuperação

O progresso pode ser atualizado durante o estudo e é recuperado do banco quando a conta retorna. A aplicação utiliza o repository de progresso e a RPC segura update_lesson_progress_secure no caminho principal. O fluxo de questionários usa as RPCs e tabelas próprias do domínio para registrar tentativas e respostas.

Não apague registros de progresso diretamente no banco para corrigir uma tela. Investigue a conta, a matrícula, as policies, a RPC e os logs operacionais antes de qualquer intervenção.

## Gamificação

XP, níveis, conquistas e recompensas ajudam a acompanhar consistência e participação. As regras de recompensa e os registros persistidos são controlados pelo backend; o navegador não deve ser usado para fabricar XP, conquistas ou alterações de perfil.

O ranking global foi desativado enquanto seu modelo de autorização entre usuários não possui contrato comprovado. XP, níveis, conquistas e histórico pessoal permanecem capacidades separadas do produto e não fazem parte do caminho obrigatório da PoC acadêmica.

## Buddy AI e recursos de IA

O Buddy AI oferece suporte contextual e pode usar o conteúdo da aula ou informações de desempenho para gerar orientações. O sistema também possui recursos de recomendações e geração de questionários quando a integração está habilitada.

As chamadas passam pela Edge Function autenticada ask-ai, com controle de uso no backend. O estudante pode informar uma chave pessoal do Google AI na área de perfil quando esse recurso estiver disponível. A implementação atual guarda essa chave somente no armazenamento local do navegador e a envia à função autenticada apenas no uso correspondente; ela não deve ser colocada no repositório, compartilhada ou registrada em logs.

O modelo padrão atualmente configurado é gemini-2.5-flash-lite; essa configuração pode mudar conforme o ambiente. Provedores institucionais devem ser configurados como secrets protegidos da Edge Function, nunca como variáveis públicas do frontend.

## Integração com Dropbox

A integração Dropbox é opcional e serve para localizar materiais, metadados, links temporários e arquivos autorizados pelo usuário.

1. Crie um aplicativo no Dropbox e habilite o fluxo OAuth 2.0 Authorization Code com PKCE.
2. Configure VITE_DROPBOX_APP_KEY no .env.local.
3. Adicione o callback local http://localhost:3000/oauth/dropbox no console do Dropbox.
4. Para produção, adicione https://SEU-DOMINIO/oauth/dropbox.
5. Habilite no aplicativo Dropbox as permissões de metadados e conteúdo exigidas pela tela atual. Na configuração observada, isso inclui files.metadata.read e files.content.read.
6. Autorize a conta pelo botão de conexão dentro da aplicação.

O fluxo usa state para proteção CSRF, PKCE e acesso offline. O token da sessão Dropbox é mantido no armazenamento de sessão do navegador pela implementação atual; não o copie para logs, tickets ou arquivos versionados. Se uma operação de link compartilhado falhar, confira as permissões específicas da aplicação Dropbox e as regras do link de origem.

## Executar localmente

Depois de configurar .env.local:

    npm run dev

O Vite usa a porta 3000 por padrão. Acesse:

    http://localhost:3000

Para simular a distribuição local depois do build:

    npm run preview

## Build de produção

    npm run build

O artefato é gerado em dist/. A configuração do Vite inclui a manifestação e o service worker da PWA quando aplicável.

## Deploy

Para publicar a aplicação:

1. Instale as dependências com npm ci no ambiente de build.
2. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente de produção.
3. Defina VITE_DROPBOX_APP_KEY somente se o Dropbox for usado.
4. Execute npm run build.
5. Sirva o conteúdo de dist/ com fallback de SPA para /.
6. Adicione o domínio publicado às URLs permitidas do Supabase Auth.
7. Adicione o callback Dropbox do domínio publicado, se aplicável.
8. Publique e valide login, dashboard, curso, aula, questionário, progresso e logout.

Nunca faça build de produção com credenciais administrativas ou secrets de servidor expostos como variáveis VITE_*.

A Edge Function `ask-ai` utiliza uma allowlist explícita de origins/CORS. Ao implantar o StudySystem em um domínio institucional novo, o operador deve:

1. revisar a lista de origins permitidas em `supabase/functions/ask-ai/index.ts`;
2. adicionar o domínio institucional;
3. redeployar a função `ask-ai`;
4. validar o Buddy AI a partir do domínio publicado.

## Deploy na Vercel

O repositório contém configuração para o roteamento de uma SPA Vite. Em um projeto Vercel:

- importe o repositório privado;
- use npm run build como comando de build;
- use dist como diretório de saída;
- configure as variáveis públicas VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY e, se necessário, VITE_DROPBOX_APP_KEY;
- configure no Supabase Auth a URL de produção e os redirects permitidos;
- configure no Dropbox o callback https://SEU-DOMINIO/oauth/dropbox, quando aplicável;
- confira o fallback de SPA e os headers definidos em vercel.json.

As Edge Functions e seus secrets são configurados no projeto Supabase, independentemente das variáveis públicas da Vercel.

## Testes e verificações locais

    npm test
    npm run typecheck
    npm run build
    npm run security:scan
    npm run test:e2e

A validação técnica consolidada após as Fases B e C registrou 32 suítes / 167 testes unitários aprovados, typecheck, build e security scan aprovados. O snapshot público foi sanitizado para avaliação e não inclui o histórico Git privado. Resultados transitórios de checks remotos devem ser consultados na execução correspondente.

Caso o Chromium não esteja instalado:

    npx playwright install chromium

Os testes E2E podem possuir cenários condicionais que dependem de credenciais de teste configuradas no ambiente. Não coloque credenciais reais nos comandos, nos testes ou no repositório.

## Segurança e privacidade

- A chave anon pública do Supabase pode ser usada pelo cliente, mas só é segura quando RLS e policies estão corretamente configuradas.
- A chave administrativa do Supabase e qualquer outra credencial privilegiada pertencem apenas ao runtime protegido do servidor ou das Edge Functions.
- Não use secrets em VITE_*, no browser, no histórico Git, em screenshots ou em mensagens de suporte.
- Mantenha .env.local fora do controle de versão.
- Exija HTTPS em produção e configure corretamente os redirects de Auth e OAuth.
- Confirme Auth, RLS, Storage, policies e RPCs antes de liberar dados reais.
- Limite uploads por tipo, tamanho e permissão; mantenha materiais privados quando o curso exigir.
- Trate chaves pessoais de IA, tokens Dropbox e dados de estudantes como dados sensíveis.
- Faça backup e tenha um procedimento de recuperação antes de mudanças operacionais no Supabase.
- Observe as obrigações aplicáveis de privacidade e proteção de dados, incluindo LGPD quando pertinente.

## Estrutura do projeto

    components/       Componentes React e telas
    contexts/         Contextos de sessão, cursos e navegação
    domain/           Entidades, interfaces e erros de domínio
    hooks/             Hooks de estado e jornada
    repositories/     Acesso isolado ao Supabase
    services/         Orquestração de casos de uso
    stores/            Estado global complementar
    tests/             Testes unitários, integração e navegador
    supabase/         Edge Functions e migrations versionadas
    archive/          Migrations históricas preservadas fora do conjunto ativo
    docs/             Documentação do produto e contratos técnicos

## Solução de problemas

| Sintoma | Verificações e correção |
| --- | --- |
| A aplicação não inicia | Confira VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local; reinicie o Vite após alterar variáveis. |
| Login ou cadastro falha | Confira Auth, confirmação de e-mail, provider Google e URLs permitidas no Supabase. |
| Dashboard sem cursos | Confira a sessão, a matrícula da conta, as policies RLS e a visibilidade do curso. |
| Aula sem progresso | Confira a matrícula, lesson_progress, a RPC segura e os logs da Edge/API; não altere a tabela diretamente. |
| Questionário não carrega | Confira a aula, o questionário publicado, as questões, as policies e as RPCs do domínio. |
| Recursos ou imagens não aparecem | Confira os buckets Storage, policies, caminho do arquivo e validade do link temporário. |
| Buddy AI não responde | Confira a Edge Function ask-ai, autenticação, limites de uso e a configuração protegida do provedor. |
| Buddy AI funciona localmente mas falha no domínio publicado | Confira se o domínio está autorizado na allowlist de origins/CORS da Edge Function `ask-ai` e redeploye a função após a alteração. |
| Chave pessoal de IA não funciona | Confira a chave no perfil, o provider habilitado e o console da Edge Function; nunca cole a chave em logs. |
| Dropbox não conecta | Confira VITE_DROPBOX_APP_KEY, callback exato, PKCE, state, permissões do aplicativo e sessão Dropbox. |
| Dropbox retorna erro de permissão | Habilite as permissões de metadados e conteúdo exigidas pela operação no console do Dropbox e refaça a autorização. |
| Área administrativa não aparece | Confirme o perfil provisionado e a atribuição institucional; não tente mudar o role no navegador. |
| Rotas funcionam localmente, mas dão 404 publicadas | Habilite o fallback da SPA para / no host e mantenha a configuração de vercel.json. |
| Build falha | Execute npm ci, revise a versão do Node e rode novamente npm run typecheck e npm run build. |
| Teste E2E falha por navegador ausente | Execute npx playwright install chromium e repita o teste. |

## Atualizar uma instalação

    git pull --ff-only
    npm ci
    npm run build

Antes de atualizar uma instalação com usuários reais, leia as notas da mudança, faça backup, confirme compatibilidade do schema e planeje a reversão. Alterações de banco, Auth, Storage, Edge Functions ou policies devem ser aplicadas por procedimento operacional revisado.

## Documentação acadêmica e técnica

### 2ª entrega

- [Prova de Conceito](docs/segunda-entrega/POC.md)
- [Requisitos e critérios de aceitação](docs/segunda-entrega/REQUISITOS_E_ACEITACAO.md)
- [Arquitetura e tecnologias](docs/segunda-entrega/ARQUITETURA_E_TECNOLOGIAS.md)
- [Status da entrega](docs/segunda-entrega/STATUS_ENTREGA.md)

### Contratos técnicos

- [PRD do produto](docs/product/STUDYSYSTEM_PRD.md)
- [Especificação funcional](docs/FSD.md)
- [Contrato de UX/UI](docs/DESIGN.md)
- [Contrato técnico de execução](docs/architecture/STUDYSYSTEM_EXECUTION_CONTRACT.md)
- [Gate de aceitação da PoC](docs/POC_ACCEPTANCE.md)

Esses documentos detalham comportamento, arquitetura, segurança, operação e rastreabilidade acadêmica. Para uma nova instalação Supabase, trate o código, as migrations e a configuração remota como fontes que precisam ser conferidas em conjunto.

## Licença

Este repositório não contém atualmente um arquivo LICENSE. Antes de redistribuir o StudySystem ou incorporá-lo a um produto, confirme com os responsáveis os termos legais aplicáveis.
