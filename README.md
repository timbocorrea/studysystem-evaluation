# StudySystem

## Plataforma de aprendizagem e acompanhamento educacional

## Sobre o StudySystem

O StudySystem é uma plataforma web de aprendizagem, acompanhamento educacional e organização de estudos. A proposta é reunir, no mesmo ambiente, cursos, aulas, materiais, questionários, resultados e registros de progresso para acompanhar diferentes momentos do estudo — do acesso ao conteúdo à retomada posterior da jornada.

O produto foi pensado para apoiar instituições de ensino regular, escolas e cursos profissionalizantes, treinamentos corporativos e contextos de estudo individual. A organização de cursos, progresso e histórico também pode servir a cenários de acompanhamento individual ou familiar, dependendo da configuração de acesso adotada. Isso não pressupõe um painel específico para responsáveis nem um modelo comercial ou institucional já definido.

## Para quem o sistema foi pensado

O acesso é organizado por autenticação, perfil e regras de autorização do backend:

- `STUDENT`: acessa cursos, aulas, materiais, questionários, resultados, progresso e recursos pessoais disponíveis para sua conta.
- `INSTRUCTOR`: trabalha com conteúdo e interações autorizadas dentro dos cursos e aulas.
- `MASTER`: possui funções administrativas ampliadas para usuários, acessos, auditoria e configurações.

A aplicação não oferece atalhos públicos para promoção de perfil. As permissões administrativas dependem do provisionamento adequado do ambiente.

## Experiência de aprendizagem

O código atual reúne recursos para organizar o estudo e acompanhar seu desenvolvimento:

- cursos estruturados em módulos e aulas;
- conteúdo com texto, imagens, vídeo, áudio, arquivos e links externos;
- reprodução de áudio associado a aulas e blocos de conteúdo, inclusive materiais importados de fontes compatíveis;
- anotações pessoais e destaques de trechos, que podem ser associados ao conteúdo da aula;
- questionários em modo prático e avaliativo, com questões, tentativas, respostas e resultados;
- progresso por aula e curso, com persistência e recuperação quando o estudante retorna;
- fórum associado à aula para interação entre os usuários autorizados;
- XP, níveis, conquistas e histórico pessoal de recompensas, com regras controladas pelo backend;
- ferramentas administrativas para conteúdo, usuários, acessos, arquivos, questionários e acompanhamento de atividade;
- Buddy AI para dúvidas, orientações e recomendações contextualizadas, além de geração de questionários quando a integração estiver configurada;
- integração opcional com Dropbox para localizar e utilizar materiais;
- interface responsiva, navegação móvel e suporte técnico à instalação como PWA.

Esses recursos não têm todos o mesmo grau de validação operacional. O fluxo principal de tentativa e progresso foi validado na PoC; recursos complementares, como Buddy AI, Dropbox, fórum, gamificação, notas e acompanhamento administrativo, dependem de configuração, permissões e validações próprias. O ranking global permanece fora do caminho principal enquanto seu modelo de autorização entre usuários não estiver comprovado.

O projeto possui reprodução de áudio, mas este README não apresenta text-to-speech como uma funcionalidade pronta: não foi encontrada uma implementação de síntese de voz no código auditado.

## Projeto Integrador — 2ª Entrega

A segunda entrega acadêmica utiliza apenas um recorte funcional do StudySystem. O produto tem uma visão mais ampla, mas a avaliação foi delimitada para que uma jornada completa pudesse ser observada com clareza, incluindo interface, autenticação, regras de negócio, backend, persistência e recuperação.

Esta segunda entrega não pretende demonstrar toda a superfície funcional do StudySystem. A PoC foi deliberadamente limitada a uma jornada principal para que o funcionamento de ponta a ponta pudesse ser acompanhado sem confundir o recorte acadêmico com o produto inteiro.

**Integrante:** ALEXANDRE CORREA DOS SANTOS

## PoC escolhida

O recorte funcional da segunda entrega é:

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

O fluxo foi escolhido porque mostra, em pouco tempo, como o estudante encontra um curso, acessa uma aula, responde uma avaliação, recebe o resultado e retoma depois o ponto de estudo registrado.

## O que a PoC demonstra

Na jornada validada, o aluno:

1. entra com uma sessão autorizada;
2. abre o Dashboard e seleciona um curso;
3. percorre a estrutura do curso e acessa uma aula;
4. consulta o conteúdo e abre o questionário relacionado;
5. envia as respostas e visualiza o resultado;
6. mantém a tentativa e o progresso persistidos;
7. retorna posteriormente e recupera o estado salvo.

O valor técnico do recorte está na integração entre a interface React, os serviços de domínio, os repositories, as RPCs e o Supabase/PostgreSQL. O escopo detalhado está em [`docs/segunda-entrega/POC.md`](docs/segunda-entrega/POC.md), e a rastreabilidade dos requisitos está em [`docs/segunda-entrega/REQUISITOS_E_ACEITACAO.md`](docs/segunda-entrega/REQUISITOS_E_ACEITACAO.md).

## Arquitetura

O frontend foi desenvolvido em React com TypeScript. A aplicação separa componentes visuais, lógica de jornada e acesso a dados, mantendo as regras de persistência fora da interface. O projeto utiliza Repository Pattern: as consultas e operações do Supabase ficam concentradas em uma camada própria, em vez de serem espalhadas pelos componentes React.

```text
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
```

As dependências são compostas em `services/Dependencies.ts` e o cliente Supabase é criado em `services/supabaseClient.ts`. Não há um backend Node monolítico separado: o backend da aplicação é formado por Supabase Auth, PostgreSQL, Storage, RPCs e Edge Functions em Deno.

## Tecnologias

- React 19 e TypeScript;
- Vite e React Router;
- Tailwind CSS;
- TanStack Query para dados remotos e cache;
- React Context e Zustand para sessão e estado global complementar;
- Supabase Auth, PostgreSQL, Row Level Security, Storage e Edge Functions em Deno;
- Vitest para testes automatizados e Playwright para testes de navegador;
- Recharts, Lucide e outras bibliotecas de interface declaradas no projeto.

## Como avaliar a PoC

Para observar o recorte acadêmico, use uma sessão de aluno autorizada sem publicar credenciais:

1. abra o Dashboard;
2. selecione um curso;
3. abra uma aula;
4. acesse e responda o questionário;
5. envie as respostas e observe o resultado;
6. confirme a persistência da tentativa e do progresso;
7. retorne ao curso ou à aula e observe a recuperação do progresso.

A aceitação consolidada da jornada está em [`docs/POC_ACCEPTANCE.md`](docs/POC_ACCEPTANCE.md). A demonstração foi registrada em desktop e em viewport mobile aproximado de 390 × 844.

## Estado técnico da entrega

```text
UNIT_TEST_SUITES=32/32 PASS
UNIT_TESTS=167/167 PASS
MIGRATION_ALIGNMENT=42/42
TYPECHECK=PASS
BUILD=PASS
SECURITY_SCAN=PASS
PRE_VIDEO_REHEARSAL=PASS
VIDEO_FLOW_DURATION_APPROX_SECONDS=54
VIDEO_FLOW_FITS_60_SECONDS=SIM
VIDEO=PENDING_PHASE_D
CHECKLIST_FINAL=PENDING_PHASE_E
```

## Instalação e configuração

### Pré-requisitos

- Git;
- Node.js 20 ou versão compatível com o pipeline do projeto;
- npm;
- um projeto Supabase configurado para a aplicação;
- Chromium, caso os testes de navegador sejam executados localmente;
- uma conta Dropbox somente se a integração de materiais for necessária.

Docker e Supabase local não são necessários para a instalação web padrão conectada a um projeto Supabase em nuvem.

### Instalação local

```bash
git clone https://github.com/timbocorrea/studysystem-evaluation.git
cd studysystem-evaluation
npm ci
```

Crie o arquivo local de variáveis:

```bash
cp .env.example .env.local
```

No PowerShell, use `Copy-Item .env.example .env.local`.

### Variáveis do frontend

O `.env.example` contém somente placeholders para variáveis públicas:

```text
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SEU_ANON_KEY
VITE_DROPBOX_APP_KEY=SEU_DROPBOX_APP_KEY
```

`VITE_DROPBOX_APP_KEY` é opcional. Os valores Supabase são necessários para a aplicação iniciar corretamente. Nunca coloque chaves administrativas, tokens privados, senhas ou secrets de Edge Functions em variáveis `VITE_*`.

Credenciais institucionais de IA pertencem aos secrets protegidos das Edge Functions. A chave pessoal Google AI do estudante, quando usada, fica local ao navegador e é enviada à função autenticada somente no recurso correspondente; ela não deve ser versionada, registrada em logs ou compartilhada.

### Supabase

O frontend espera um schema compatível com a versão do código, incluindo tabelas, RLS, policies, RPCs, Storage e Edge Functions usados pela aplicação. O histórico em `supabase/migrations/` registra a evolução do ambiente e não deve ser aplicado cegamente como instalador de uma instância vazia.

Para uma nova instalação, o operador deve provisionar o schema por procedimento controlado, conferir as políticas e configurar Auth, Storage, RPCs e secrets protegidos antes de liberar usuários. Não execute alterações destrutivas nem escritas remotas sem backup, revisão e autorização operacional.

### Primeiro acesso

```bash
npm run dev
```

Abra `http://localhost:3000`, crie uma conta ou entre com e-mail e senha e acesse os cursos liberados para a conta. O login com Google depende da configuração do provider no Supabase. Áreas administrativas aparecem somente para perfis autorizados.

## Build, testes e publicação

Com `.env.local` configurado:

```bash
npm run build
npm run preview
npm test
npm run typecheck
npm run security:scan
npm run test:e2e
```

Se o Chromium não estiver instalado, execute `npx playwright install chromium`.

Para publicar uma instância própria, configure apenas as variáveis públicas do frontend no ambiente de build, sirva `dist/` com fallback de SPA e registre no Supabase Auth os domínios e redirects permitidos. Em um projeto Vercel, use `npm run build` e `dist` como diretório de saída; as Edge Functions e seus secrets continuam sendo configurados no Supabase.

## Sobre este repositório de avaliação

Este repositório existe para disponibilizar código e documentação da 2ª entrega para avaliação acadêmica. Ele é um snapshot público sanitizado do StudySystem, e não a identidade do produto.

O snapshot:

- não contém credenciais privadas ou secrets;
- não contém o histórico Git do repositório canônico;
- usa placeholders em `.env.example`;
- não deve receber credenciais, tokens privados ou dados de estudantes;
- mantém separado o produto StudySystem, a PoC acadêmica e o pacote público de avaliação.

```text
GITHUB_EVALUATION_ACCESS=PASS
PUBLIC_EVALUATION_REPOSITORY=https://github.com/timbocorrea/studysystem-evaluation
EVALUATION_REPOSITORY=PUBLIC_SANITIZED_SNAPSHOT
CANONICAL_REPOSITORY=PRIVATE
PUBLIC_INITIAL_SNAPSHOT_SHA=5b8a5b4e5f70b6d3461eb6589faee602420977e4
```

## Vídeo da PoC

Não há URL de vídeo neste README. O vídeo permanece pendente para a Fase D, e o checklist final permanece pendente para a Fase E.

## Segurança e privacidade

- mantenha `.env.local` fora do controle de versão;
- não use secrets em `VITE_*`, no browser, em screenshots ou em mensagens de suporte;
- a chave administrativa do Supabase pertence somente ao runtime protegido e nunca deve aparecer no frontend;
- confira Auth, RLS, Storage, policies e RPCs antes de liberar dados reais;
- trate chaves pessoais de IA, tokens Dropbox e dados de estudantes como dados sensíveis;
- faça backup e planeje recuperação antes de mudanças operacionais no Supabase.

## Estrutura do projeto

```text
components/       Componentes React e telas
contexts/         Contextos de sessão, cursos e navegação
domain/           Entidades, interfaces e erros de domínio
hooks/            Hooks de estado e jornada
repositories/     Acesso isolado ao Supabase
services/         Orquestração de casos de uso
stores/           Estado global complementar
supabase/         Edge Functions e migrations versionadas
archive/          Migrations históricas preservadas fora do conjunto ativo
docs/             Documentação do produto e contratos técnicos
```

## Documentação

### 2ª entrega

- [Prova de Conceito](docs/segunda-entrega/POC.md)
- [Requisitos e critérios de aceitação](docs/segunda-entrega/REQUISITOS_E_ACEITACAO.md)
- [Arquitetura e tecnologias](docs/segunda-entrega/ARQUITETURA_E_TECNOLOGIAS.md)
- [Status da entrega](docs/segunda-entrega/STATUS_ENTREGA.md)

### Contratos do produto e da implementação

- [PRD do produto](docs/product/STUDYSYSTEM_PRD.md)
- [Especificação funcional](docs/FSD.md)
- [Contrato de UX/UI](docs/DESIGN.md)
- [Contrato técnico de execução](docs/architecture/STUDYSYSTEM_EXECUTION_CONTRACT.md)
- [Gate de aceitação da PoC](docs/POC_ACCEPTANCE.md)

## Licença

Este repositório não contém atualmente um arquivo `LICENSE`. Antes de redistribuir o StudySystem ou incorporá-lo a um produto, confirme com os responsáveis os termos legais aplicáveis.
