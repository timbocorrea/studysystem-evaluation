# Prova de Conceito — StudySystem

## 1. Revisita da primeira entrega

A primeira etapa do Projeto Integrador apresentou o StudySystem como uma visão ampla de produto, envolvendo estudantes, professores/gestores, administração, cursos, aulas, questionários, progresso, gamificação, IA, TTS, mobilidade/PWA, recursos offline e uma possível evolução SaaS/multi-tenant.

Na segunda entrega, essa visão foi revisitada com um objetivo diferente: em vez de tentar demonstrar muitas funcionalidades ao mesmo tempo, foi priorizada uma única jornada crítica e verificável. A redução de escopo foi deliberada e permitiu concentrar a prova em um fluxo completo, integrado e persistente.

A evolução pode ser resumida assim:

```text
VISÃO AMPLA DO PRODUTO
        ↓
PRIORIZAÇÃO DE UMA JORNADA CRÍTICA
        ↓
POC FUNCIONAL COM FRONTEND + LÓGICA + PERSISTÊNCIA
```

Funcionalidades que continuam fazendo parte da visão do StudySystem, mas não são necessárias para comprovar essa jornada, permanecem fora do escopo obrigatório da PoC. Isso não representa remoção dessas capacidades do produto.

## 2. Persona priorizada e valor da PoC

A persona priorizada da primeira entrega para esta jornada é **Ricardo**.

Na proposta inicial, Ricardo representa o usuário que precisa manter continuidade nos estudos em uma rotina com períodos curtos e mobilidade, enfrentando dificuldade para utilizar materiais extensos no celular e o custo/praticidade de depender de impressão. A segunda entrega transforma essa necessidade em uma jornada digital curta e verificável: entrar no ambiente, localizar o curso, acessar uma aula, responder um questionário e retornar depois sem perder o progresso registrado.

A relação entre dor, ação e valor demonstrado é:

| Dor ou necessidade da persona | Resposta na PoC | Valor demonstrado |
|---|---|---|
| Estudar em períodos curtos e em diferentes contextos | Jornada web responsiva do dashboard até a aula e o questionário | Acesso ao estudo em uma sequência objetiva e navegável |
| Dificuldade de manter materiais e atividades organizados | Curso, aula e questionário reunidos no mesmo fluxo | Redução da fragmentação da experiência de estudo |
| Necessidade de saber onde parou | Persistência e recuperação do progresso | Continuidade entre uma sessão e outra |
| Necessidade de verificar o aprendizado | Questionário, submissão e resultado | Retorno imediato sobre a tentativa realizada |

Não são adicionados aqui atributos pessoais de Ricardo que não estejam comprovados pela primeira entrega.

## 3. Objetivo da PoC

Esta Prova de Conceito demonstra a jornada principal de estudo do StudySystem, conectando a interface web, a lógica da aplicação, o padrão Repository e a persistência no Supabase/PostgreSQL.

O objetivo é comprovar uma experiência mínima e funcional para um aluno autenticado: acessar o dashboard, selecionar um curso, abrir uma aula, responder o questionário, consultar o resultado e manter o progresso para uma entrada posterior.

### Pré-condição

O aluno já está autenticado no sistema. A autenticação é tratada como pré-condição da demonstração para que a jornada avaliada comece diretamente no dashboard.

### Fluxo principal

```text
Aluno autenticado
→ Dashboard
→ Curso
→ Aula
→ Questionário
→ Resultado
→ Persistência
→ Recuperação posterior
```

Em termos operacionais:

1. Acessar o Dashboard.
2. Selecionar um curso.
3. Abrir o curso e visualizar sua estrutura.
4. Abrir uma aula pertencente ao curso.
5. Consumir ou acessar o conteúdo da aula.
6. Acessar o questionário relacionado à aula.
7. Responder e enviar as respostas.
8. Exibir o resultado.
9. Persistir a tentativa no backend/banco.
10. Atualizar o progresso e recuperar esse progresso em uma entrada posterior.

| Etapa | Implementado no código | Validado na PoC | Observação |
|---|---|---|---|
| Dashboard | SIM | PASS | Acesso com aluno autenticado |
| Seleção de curso | SIM | PASS | Curso selecionado na jornada demonstrada |
| Abertura de aula | SIM | PASS | Aula pertencente ao curso aberta |
| Acesso ao conteúdo | SIM | PASS | Conteúdo da aula acessado |
| Questionário | SIM | PASS | Questionário relacionado à aula acessado |
| Envio das respostas | SIM | PASS | Respostas submetidas em ambiente controlado |
| Resultado | SIM | PASS | Resultado da tentativa exibido |
| Persistência da tentativa | SIM | PASS | Tentativa confirmada por read-after-write |
| Progresso atualizado | SIM | PASS | Progresso persistido e confirmado por read-after-write |
| Recuperação posterior | SIM | PASS | Progresso recuperado em entrada posterior |

A jornada foi validada com aluno autenticado. Houve read-after-write da tentativa, persistência de progresso e recuperação posterior. A validação passou em desktop e em viewport mobile aproximado de 390 x 844.

Durante a demonstração técnica anterior, o progresso geral do curso permaneceu em 0% porque nenhuma aula foi concluída. Isso não caracteriza falha: houve progresso parcial persistido em blocos, e progresso parcial não equivale à conclusão da aula.

## 4. Escopo da PoC

### IN_SCOPE

- Dashboard do aluno.
- Listagem e seleção de cursos.
- Estrutura de curso, módulos e aulas.
- Abertura e consumo da aula.
- Questionário relacionado à aula.
- Submissão das respostas.
- Exibição do resultado.
- Persistência da tentativa.
- Atualização e recuperação do progresso.
- Responsividade web/mobile necessária para a demonstração.

### OUT_OF_SCOPE

- Buddy/IA como requisito obrigatório.
- Geração automática de questionário por IA.
- TTS.
- Modo offline completo.
- Administração avançada.
- Integração Dropbox.
- Gamificação complementar fora da jornada principal.
- Visão SaaS/multi-tenant e SuperAdmin SaaS.
- Expansão geral do produto.

Estar fora do escopo da PoC significa apenas que a funcionalidade não é necessária para comprovar a jornada principal da segunda entrega.

## 5. Critério de sucesso da PoC

A PoC é considerada funcional quando um aluno autenticado consegue percorrer:

```text
Dashboard → Curso → Aula → Questionário → Resultado
```

com evidência de:

- tentativa persistida;
- progresso persistido;
- progresso recuperável posteriormente;
- integração entre interface, lógica e banco;
- uso em desktop e viewport mobile da demonstração.

## 6. Evidências técnicas

| Responsabilidade | Evidência |
|---|---|
| Rotas | `src/routes/AppRoutes.tsx` |
| Dashboard | `components/features/dashboard/StudentDashboard.tsx` |
| Visão do curso | `components/CourseOverview.tsx` |
| Carregamento da aula | `components/LessonLoader.tsx` |
| Visualização da aula | `components/features/classroom/LessonViewer.tsx` |
| Widget do questionário | `components/features/classroom/QuizWidget.tsx` |
| Estado e submissão do quiz | `hooks/useLessonQuiz.ts` |
| Resultado | `components/QuizResultsModal.tsx` |
| Orquestração de cursos/progresso | `services/CourseService.ts` e `contexts/CourseContext.tsx` |
| Cursos, módulos, aulas e leitura de progresso | `repositories/SupabaseCourseRepository.ts` |
| Questionários e tentativas | `repositories/SupabaseQuizRepository.ts` |
| Progresso da aula | `repositories/SupabaseUserProgressRepository.ts` |
| Composição das dependências | `services/Dependencies.ts` |
| Cliente Supabase | `services/supabaseClient.ts` |
| RPC de progresso | `supabase/migrations/20260311203000_fix_block_id_type_to_text.sql` |
| RPC de questionário do aluno | `archive/supabase-migrations/20260703030000_add_student_lesson_quiz_rpc.sql` |
| RPC de submissão | `archive/supabase-migrations/20260703020000_harden_submit_quiz_attempt.sql` e hardenings posteriores |
| Gate de aceitação da PoC | `docs/POC_ACCEPTANCE.md` |

## 7. Estado atual

```text
CODE_FLOW=CONFIRMED
FUNCTIONAL_POC=PASS
REMOTE_PERSISTENCE_VALIDATION=PASS
QUIZ_ATTEMPT_READ_AFTER_WRITE=PASS
LESSON_PROGRESS_READ_AFTER_WRITE=PASS
PROGRESS_RECOVERY=PASS
DESKTOP_POC=PASS
MOBILE_POC=PASS
UNIT_TESTS=167/167 PASS
TYPECHECK=PASS
BUILD=PASS
SECURITY_SCAN=PASS
MIGRATION_ALIGNMENT=42/42
```

Esses estados se limitam às evidências da jornada da PoC e às validações técnicas consolidadas. Eles não representam homologação de todas as funcionalidades do produto nem uma afirmação absoluta sobre toda a superfície de segurança da aplicação.
