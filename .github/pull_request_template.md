# StudySystem Pull Request

## Objetivo

<!-- Resuma a mudança. -->

## Canonical Change Precheck

```text
CONTRACT_READ=SIM|NAO
CHANGE_CLASSIFICATION=UI_SAFE|DOCUMENTATION_ONLY|CONTROLLED|PROTECTED
AFFECTED_DOMAINS=
CANONICAL_AUTHORITIES_READ=
PROTECTED_BOUNDARY_TOUCHED=SIM|NAO
FUNCTIONAL_CONTRACT_CHANGED=SIM|NAO
AUTH_CONTRACT_CHANGED=SIM|NAO
DATABASE_CONTRACT_CHANGED=SIM|NAO
PERSISTENCE_CONTRACT_CHANGED=SIM|NAO
CHANGE_ALLOWED=SIM|NAO
REQUIRED_GATE=
```

## Escopo

- [ ] O diff está limitado aos arquivos autorizados.
- [ ] Não há alteração incidental fora do escopo.
- [ ] A classificação corresponde ao diff real.

## Contratos preservados

- [ ] Autenticação preservada ou mudança autorizada.
- [ ] Autorização/RLS preservados ou mudança autorizada.
- [ ] Contratos de dados preservados ou mudança autorizada.
- [ ] Persistência de quiz preservada.
- [ ] Persistência/recuperação de progresso preservadas.
- [ ] Nenhum secret foi incluído.

Permitir N/A com justificativa quando realmente não aplicável.

## Frontend V2

- [ ] N/A
- [ ] Mudança puramente visual.
- [ ] Reutiliza contratos funcionais existentes.
- [ ] Não cria acesso Supabase paralelo.
- [ ] Não duplica regra de negócio.
- [ ] Não altera persistência.
- [ ] Não altera autenticação/autorização.

## Validação

```text
TESTS_EXECUTED=
TESTS_NOT_EXECUTED=
TESTS_NOT_EXECUTED_REASON=
DIFF_CHECK=
```

## Gate protegido

Se `PROTECTED_BOUNDARY_TOUCHED=SIM`:

```text
AUTHORIZED_GATE=
AUTHORIZATION_EVIDENCE=
```

Sem Gate explícito:

```text
CHANGE_ALLOWED=NAO
```

## Segurança

- [ ] Nenhum secret/token/password foi versionado.
- [ ] Nenhuma identidade privilegiada literal foi adicionada.
- [ ] Nenhuma `service_role` foi exposta ao cliente.
- [ ] Não houve history rewrite/force push.

## Resultado

```text
RESULT=PASS|BLOCKED
STOP_REASON=
NEXT_ACTION=
```

Não inserir secrets, tokens, senhas, UUIDs privilegiados ou credenciais em PRs.
