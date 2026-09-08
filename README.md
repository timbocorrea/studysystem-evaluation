# StudySystem

Plataforma de aprendizagem e acompanhamento educacional

## Sobre o StudySystem

O StudySystem é uma plataforma web de aprendizagem, acompanhamento educacional e organização de estudos. A proposta é reunir, no mesmo ambiente, cursos, aulas, materiais, questionários, resultados e registros de progresso para acompanhar diferentes momentos do estudo — do acesso ao conteúdo à retomada posterior da jornada.

O produto não foi criado apenas para uma avaliação acadêmica. Ele organiza uma experiência de aprendizagem que pode ser configurada para diferentes contextos educacionais, respeitando os perfis e as permissões definidos no ambiente.

## Para quem foi desenvolvido

O StudySystem foi pensado para escolas de ensino regular, cursos profissionalizantes, treinamentos corporativos e contextos de estudo individual. A organização de cursos, progresso e histórico também pode servir a cenários de acompanhamento individual ou familiar, dependendo da configuração de acesso adotada. Isso não pressupõe um painel específico para responsáveis nem um modelo comercial ou institucional já definido.

O acesso é organizado por autenticação, perfil e regras de autorização do backend:

- Estudante (`STUDENT`): acessa cursos, aulas, materiais, questionários, resultados, progresso e recursos pessoais disponíveis para sua conta.
- Instrutor (`INSTRUCTOR`): trabalha com conteúdo e interações autorizadas dentro dos cursos e aulas.
- Administrador (`MASTER`): possui as funções administrativas ampliadas previstas no modelo atual para usuários, acessos, auditoria e configurações.

A aplicação não oferece atalhos públicos para promoção de perfil. As permissões administrativas dependem do provisionamento adequado do ambiente.

## Recursos de aprendizagem

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

Esses recursos não têm todos o mesmo grau de validação operacional. O fluxo principal de tentativa e progresso foi validado no recorte acadêmico; recursos complementares, como Buddy AI, Dropbox, fórum, gamificação, notas e acompanhamento administrativo, dependem de configuração, permissões e validações próprias. O ranking global permanece fora do caminho principal enquanto seu modelo de autorização entre usuários não estiver comprovado.

O projeto possui reprodução de áudio, mas este README não apresenta text-to-speech como uma funcionalidade pronta: não foi encontrada uma implementação de síntese de voz no código auditado.

## Como funciona

A experiência de aprendizagem acompanha o estudante ao longo do uso da plataforma. Em geral, ele:

1. acessa os cursos liberados para sua conta;
2. navega por módulos e aulas;
3. consome textos, vídeos, áudios, materiais e recursos externos;
4. pode registrar anotações e destaques para retomar pontos importantes;
5. realiza questionários práticos ou avaliativos;
6. consulta resultados e acompanha o progresso;
7. retorna posteriormente para continuar os estudos.

Instrutores e administradores autorizados gerenciam conteúdo, materiais, questionários, acessos e atividades conforme seu perfil. Recursos complementares, como IA, Dropbox, fórum e gamificação, dependem da configuração do ambiente e das permissões da conta.

## Arquitetura e tecnologias

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

Tecnologias principais:

- React 19 e TypeScript;
- Vite e React Router;
- Tailwind CSS;
- TanStack Query para dados remotos e cache;
- React Context e Zustand para sessão e estado global complementar;
- Supabase Auth, PostgreSQL, Row Level Security, RPCs, Storage e Edge Functions em Deno;
- Vitest para testes automatizados e Playwright para testes de navegador;
- Recharts, Lucide e outras bibliotecas de interface declaradas no projeto.

## Experimentar o StudySystem

A forma recomendada de conhecer a aplicação é usar a instância pública já publicada para a avaliação:

[https://studysystem-psi.vercel.app](https://studysystem-psi.vercel.app)

O código-fonte e os passos para reprodução estão neste repositório público:

[https://github.com/timbocorrea/studysystem-evaluation](https://github.com/timbocorrea/studysystem-evaluation)

A instância pública já está conectada a um backend provisionado. Para a avaliação funcional, siga as instruções de acesso abaixo; este README não publica dados de autenticação ou dados pessoais.

### Acesso para avaliação

Para a avaliação funcional, utilize a versão publicada acima. Não é necessário instalar Supabase ou backend para realizar essa avaliação. Quando for necessário autenticar, os dados de acesso da conta destinada à demonstração são fornecidos separadamente junto à submissão no Portal do Aluno. Por segurança, nenhuma credencial é publicada neste repositório.

Após o login, o fluxo principal utilizado na demonstração é:

`Dashboard → Curso → Aula → Questionário → Resultado → retorno ao curso`

### Avaliação rápida

1. Abra a aplicação publicada.
2. Entre com a credencial de avaliação fornecida na submissão.
3. Abra um curso e uma aula.
4. Acesse o questionário e visualize o fluxo de resultado.
5. Retorne ao curso para observar a continuidade da jornada.

Para apenas conhecer e avaliar o funcionamento do StudySystem, não é necessário realizar a instalação local descrita abaixo.

## Instalação e configuração

Há uma diferença importante entre experimentar a instância pública, executar o frontend localmente e implantar uma nova instância completa. Os comandos abaixo reproduzem o frontend local conectado a um backend StudySystem compatível; eles não criam esse backend.

### Pré-requisitos

- Git;
- Node.js 20 ou versão compatível com o pipeline do projeto;
- npm;
- acesso a um projeto Supabase já provisionado e compatível com a aplicação, para a execução local;
- Chromium, caso os testes de navegador sejam executados localmente;
- uma conta Dropbox somente se a integração de materiais for necessária.

Docker e Supabase local não são necessários para executar o frontend conectado a um projeto Supabase em nuvem já provisionado.

### Clonar e executar o frontend localmente

Antes de executar os comandos, confirme que você possui acesso a um backend Supabase compatível. O clone não provisiona schema, autenticação, permissões, dados iniciais ou funções do backend.

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
VITE_SUPABASE_URL=https://<YOUR_PROJECT_ID>.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
VITE_DROPBOX_APP_KEY=<YOUR_DROPBOX_APP_KEY>
```

`VITE_DROPBOX_APP_KEY` é opcional. Os valores Supabase são necessários para a aplicação iniciar corretamente. Nunca coloque chaves administrativas, tokens privados, senhas ou secrets de Edge Functions em variáveis `VITE_*`.

As credenciais institucionais de IA, como `GEMINI_API_KEY` e `GROQ_API_KEY`, pertencem aos secrets protegidos das Edge Functions e não devem ser copiadas para `.env.local` do frontend. A chave pessoal Google AI do estudante, quando usada, fica local ao navegador e é enviada à função autenticada somente no recurso correspondente; ela não deve ser versionada, registrada em logs ou compartilhada.

### Backend compatível e nova implantação

O frontend espera um backend compatível com a versão do código, incluindo:

- schema PostgreSQL e migrations aplicadas por procedimento controlado;
- Supabase Auth e redirects do ambiente;
- RLS, policies e RPCs validados;
- Storage e políticas de acesso;
- Edge Functions `ask-ai` e `monitor-usage`, com seus secrets server-side;
- perfis, permissões e conteúdo inicial necessários para os cursos.

O histórico em `supabase/migrations/` registra a evolução do ambiente; ele não é um instalador comprovado de projeto Supabase vazio e não deve ser aplicado cegamente. Uma nova implantação completa exige provisionamento controlado, validação de segurança e configuração dos dados iniciais. Não execute alterações destrutivas nem escritas remotas sem backup, revisão e autorização operacional.

### Primeiro acesso

```bash
npm run dev
```

Abra `http://localhost:3000` e entre com uma conta que já tenha acesso aos cursos configurados no backend. O clone não cria conta, perfil, curso ou conteúdo inicial. Cadastro, login com Google e áreas administrativas dependem da configuração do Auth e das permissões do ambiente.

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

`npm run preview` apenas serve o build local; não provisiona o backend. Para publicar uma instância própria, além do build do frontend, é necessário concluir o provisionamento descrito acima, configurar apenas as variáveis públicas do frontend no ambiente de build, servir `dist/` com fallback de SPA e registrar no Supabase Auth os domínios e redirects permitidos. Em um projeto Vercel, use `npm run build` e `dist` como diretório de saída; as Edge Functions e seus secrets continuam sendo configurados no Supabase.

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

## Documentação do produto

- [PRD do produto](docs/product/STUDYSYSTEM_PRD.md)
- [Especificação funcional](docs/FSD.md)
- [Contrato de UX/UI](docs/DESIGN.md)
- [Contrato técnico de execução](docs/architecture/STUDYSYSTEM_EXECUTION_CONTRACT.md)

O repositório também contém documentação específica da 2ª entrega, apresentada na seção acadêmica abaixo.

Este repositório não contém atualmente um arquivo `LICENSE`. Antes de redistribuir o StudySystem ou incorporá-lo a um produto, confirme com os responsáveis os termos legais aplicáveis.

---

## Projeto Integrador — 2ª Entrega

Esta entrega acadêmica usa um recorte funcional do StudySystem para demonstrar uma jornada completa sem representar todo o sistema. **Integrante:** Alexandre Correa dos Santos.

Os documentos específicos da entrega são a [Prova de Conceito](docs/segunda-entrega/POC.md), os [requisitos e critérios de aceitação](docs/segunda-entrega/REQUISITOS_E_ACEITACAO.md), a [arquitetura da entrega](docs/segunda-entrega/ARQUITETURA_E_TECNOLOGIAS.md) e o [status da entrega](docs/segunda-entrega/STATUS_ENTREGA.md).

## Prova de Conceito (PoC) escolhida

Para a 2ª entrega foi selecionada uma jornada específica do StudySystem como Prova de Conceito (PoC):

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

O recorte evidencia a integração entre interface, autenticação, regras de negócio, backend, persistência da tentativa, persistência do progresso e recuperação posterior. A PoC não pretende validar toda a superfície funcional do produto.

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
VIDEO_DURATION_SECONDS=57.38
VIDEO_DURATION_UNDER_60=PASS
LOGIN_SCREEN_REMOVED=PASS
MAIN_STUDENT_FLOW_VISIBLE=PASS
QUIZ_RESULT_VISIBLE=PASS
RETURN_TO_COURSE_VISIBLE=PASS
VIDEO_READY_FOR_SUBMISSION=SIM
CHECKLIST_FINAL=IN_PROGRESS
```

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

## Vídeo da demonstração

A demonstração final da Prova de Conceito, com duração aproximada de 57,38 segundos, está disponível em:

[Assistir ao vídeo da demonstração](https://youtube.com/shorts/1uuI9f3UY34)
