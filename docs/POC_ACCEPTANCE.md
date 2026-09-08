# StudySystem — Gate de Aceitação da PoC

## 1. Autoridade e referência acadêmica

Este documento define o Gate de aceitação da PoC. Os requisitos completos permanecem em [docs/segunda-entrega/REQUISITOS_E_ACEITACAO.md](segunda-entrega/REQUISITOS_E_ACEITACAO.md).

Estados permitidos:

~~~text
PASS = evidência executada e suficiente
FAIL = evidência executada demonstra falha
NOT_VERIFIED = não há evidência suficiente para decidir
~~~

## 2. Critérios P0

| ID | Critério | Evidência consolidada | Estado atual |
|---|---|---|---|
| P0-01 | Dashboard do aluno | Sessão válida e dashboard demonstrado | PASS |
| P0-02 | Curso | Curso real selecionado e aberto | PASS |
| P0-03 | Aula | Aula real carregada e acessível | PASS |
| P0-04 | Quiz | Questionário associado carregado para o aluno | PASS |
| P0-05 | Resultado | Respostas enviadas e resultado exibido | PASS |
| P0-06 | Persistência da tentativa | Read-after-write autenticado em quiz_attempts | PASS |
| P0-07 | Persistência do progresso | Read-after-write autenticado em lesson_progress | PASS |
| P0-08 | Recuperação do progresso | Reentrada posterior refletiu o progresso salvo | PASS |
| P0-09 | Desktop | Jornada completa em viewport desktop | PASS |
| P0-10 | Mobile | Jornada completa em viewport mobile aproximado de 390 x 844 | PASS |

## 3. Condições e limites da evidência

- A demonstração utilizou aluno autenticado e dados autorizados.
- A tentativa de quiz foi confirmada por leitura posterior autenticada.
- O progresso foi confirmado por leitura posterior de lesson_progress.
- Progresso persistido não equivale à conclusão de aula.
- O progresso geral do curso permaneceu em 0% porque nenhuma aula foi concluída durante a demonstração.
- Houve progresso parcial persistido em blocos de texto.
- Não são registrados secrets, tokens, e-mails ou dados pessoais neste documento.

## 4. Decisão do Gate

~~~text
POC_ACCEPTANCE=PASS
GATE_2_STATUS=PASS
P0_01_DASHBOARD=PASS
P0_02_COURSE=PASS
P0_03_LESSON=PASS
P0_04_QUIZ=PASS
P0_05_RESULT=PASS
P0_06_QUIZ_ATTEMPT_PERSISTENCE=PASS
P0_07_PROGRESS_PERSISTENCE=PASS
P0_08_PROGRESS_RECOVERY=PASS
P0_09_DESKTOP_FULL_POC=PASS
P0_10_MOBILE=PASS
~~~

A aceitação acima se limita à jornada principal da PoC e às evidências consolidadas deste Gate. Funcionalidades secundárias, publicação, segurança e o E2E autenticado específico de AUTHZ-001 permanecem fora desta decisão.
