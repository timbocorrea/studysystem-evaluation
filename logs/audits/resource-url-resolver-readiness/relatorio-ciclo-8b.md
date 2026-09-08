# RELATÓRIO CONSOLIDADO — CICLO 8B — RESOURCE URL RESOLVER READINESS

## 1. Identificação
- Repositório: `timbocorrea/studysystem`
- Branch: `fix/resource-url-resolver-readiness`
- Base: `main`
- Commit inicial: `484f625eefdbc895d7a35039597a3b84ccc27cd3`
- Commit final: pendente de atualização após abertura do PR draft
- PR draft: pendente nesta primeira versão do relatório
- Modo: patch pequeno, client-side, sem migration e sem chamada real ao Storage

## 2. Segurança operacional
- Arquivos alterados: `.gitignore`; `services/ResourceUrlResolver.ts`; `utils/mediaUtils.ts`; `components/features/classroom/LessonMaterialsModal.tsx`; `tests/unit/ResourceUrlResolver.test.ts`; este relatório.
- SQL remoto executado: não.
- Banco alterado: não.
- Migration aplicada: não.
- Storage real chamado: não.
- Signed URL real gerada: não.
- Deploy: não.
- Merge: não.
- Service role: não utilizada.
- Secrets: não lidos, não impressos e não versionados.
- Upload/download/delete real: não executado.

## 3. Acoplamentos encontrados
| Arquivo/fluxo | Uso anterior de URL | Risco | Alteração feita |
|---|---|---|---|
| `services/FileUploadService.ts` | Upload ainda retorna public URL por compatibilidade. | Bucket privado quebraria consumidores atuais se aplicado agora. | Não alterado neste ciclo; compatibilidade preservada. |
| `ResourceUploadForm` | Salva a URL retornada pelo upload ou informada manualmente. | URL externa/protocolo perigoso poderia chegar aos consumidores se já existisse no banco. | Não alterado para evitar ampliar escopo; resolver atua na leitura/abertura. |
| `SupabaseCourseRepository` | Entrega `lesson_resources.url` diretamente ao domínio. | Sem `bucket/path` persistidos, signed URL futura ainda exige schema/backfill. | Não alterado; sem schema/migration. |
| `LessonMaterialsModal` | Usava `window.open`, `img`, viewer externo e documento com URL direta. | Abertura/renderização sem validação central. | Integrado ao `ResourceUrlResolver` antes de abrir/renderizar materiais. |
| `LessonMaterialsSidebar` | Usa `convertDropboxUrl`, `convertGoogleDriveUrl`, `isDocumentFile` e também abre URLs diretamente em alguns fluxos. | Parte do fluxo ainda depende de URL direta. | Helpers de mídia agora passam por validação do resolver; integração total da sidebar fica para ciclo posterior se o Analista Mestre aprovar. |
| `utils/mediaUtils.ts` | Conversões de Dropbox/Drive e detecção de documento aceitavam qualquer string. | Protocolos perigosos poderiam seguir para embed/abertura nos fluxos que usam os helpers. | Helpers agora recusam URLs inseguras via `isPotentiallySafePersistedResourceUrl`. |
| `getOptimizedUrl` em `LessonViewer` | Otimiza apenas public URL Supabase. | Não cobre signed/private future. | Não alterado neste patch para não mexer no player/leitor. |
| `window.open` | Abertura direta em componentes de materiais. | Risco de abrir URL unsafe ou futura signed URL em fluxo não controlado. | `LessonMaterialsModal` usa resolver e helper `canOpenResolvedUrlInNewTab`. |

## 4. ResourceUrlResolver criado
Foi criado `services/ResourceUrlResolver.ts` com uma camada pura, sem dependência do Supabase client e sem chamada de rede.

A camada classifica URLs como:
- `external_url`;
- `supabase_public_legacy`;
- `unknown`;
- tipo reservado futuro `supabase_private_ref`, sem uso neste ciclo.

A validação de protocolo:
- permite `https:`;
- mantém `http:` por compatibilidade de leitura de URLs legadas, mas marca warning e não considera seguro para embed;
- bloqueia protocolos persistidos perigosos, como script inline, data inline, arquivo local e blob persistido.

Para URLs públicas legadas do Supabase Storage, a camada identifica `/storage/v1/object/public/`, extrai `bucket` e `path` bucket-relative, valida path contra traversal, barra invertida, caminho vazio e segmentos `.`/`..`.

A estrutura retornada já prepara o futuro sem assinar nada:
- `sourceType`;
- `provider`;
- `originalUrl`;
- `displayUrl`;
- `downloadUrl`;
- `bucket`;
- `path`;
- `expiresAt: null`;
- `isSafe`;
- `canOpenInNewTab`;
- `isSafeForEmbed`;
- `shouldAvoidExternalViewer`;
- `reason`;
- `warnings`.

O resolver não gera signed URL, não persiste URL resolvida e não chama Supabase Storage.

## 5. Integrações realizadas
| Arquivo | Antes | Depois | Compatibilidade |
|---|---|---|---|
| `components/features/classroom/LessonMaterialsModal.tsx` | Abria/renderizava `item.url` após conversões locais. | Resolve URL antes de abrir/renderizar; bloqueia URL unsafe com mensagem sanitizada. | Mantém HTTPS externo, Dropbox/Drive convertidos e public URL legada. |
| `utils/mediaUtils.ts` | Conversores e detector de documento não validavam protocolo. | Usa `isPotentiallySafePersistedResourceUrl` antes de converter/detectar. | Fluxos atuais seguros continuam iguais; protocolos bloqueados retornam valor vazio/falso. |
| `tests/unit/ResourceUrlResolver.test.ts` | Não existia. | Cobre classificação, extração, bloqueios, compatibilidade e ausência de signed URL. | Teste puro, sem chamada de rede/Storage. |
| `.gitignore` | Não permitia versionar este relatório. | Permite apenas o relatório sanitizado deste ciclo. | Sem impacto funcional. |

## 6. Testes criados
| Teste | O que valida | Resultado |
|---|---|---|
| Classificação Supabase pública | URL `/storage/v1/object/public/lesson-resources/...` vira `supabase_public_legacy`. | Criado; execução local pendente. |
| Extração bucket/path | Extrai `lesson-resources` e path relativo. | Criado; execução local pendente. |
| HTTPS externo | Mantém URL externa HTTPS e permite embed/aba. | Criado; execução local pendente. |
| Bloqueio de protocolo script | Bloqueia protocolo perigoso e não ecoa URL completa na mensagem. | Criado; execução local pendente. |
| Bloqueio de data inline | Bloqueia URL inline persistida. | Criado; execução local pendente. |
| Bloqueio de arquivo local | Bloqueia URL local persistida. | Criado; execução local pendente. |
| URL inválida | Trata como unsafe/unknown. | Criado; execução local pendente. |
| Sem signed URL | Garante `expiresAt = null` e ausência de token assinado. | Criado; execução local pendente. |
| Inferência de tipo | Identifica PDF/áudio/imagem/documento/link por extensão. | Criado; execução local pendente. |
| Compatibilidade URL pública atual | `displayUrl` e `downloadUrl` preservam URL pública atual. | Criado; execução local pendente. |

## 7. Alterações propositalmente não realizadas
- Nenhuma alteração de schema.
- Nenhuma migration criada.
- Nenhuma migration aplicada.
- Nenhuma signed URL gerada.
- Nenhuma Edge Function criada.
- Nenhuma policy de Storage alterada.
- Bucket `lesson-resources` não foi tornado privado.
- Nenhuma chamada ao Storage real.
- Nenhum upload/download/delete real.
- Nenhuma alteração no PR #13.
- Nenhum deploy.
- Nenhum merge.

## 8. Validações executadas
| Comando | Resultado | Observação |
|---|---|---|
| `git diff --check` | Não executado neste ambiente | Execução local indisponível no conector GitHub sem checkout do repositório privado. Diff foi revisado via comparação GitHub. |
| `npm.cmd run security:scan` | Não executado neste ambiente | Requer checkout local e dependências. |
| `npm.cmd run typecheck` | Não executado neste ambiente | Requer checkout local e dependências. |
| `npm.cmd run test -- tests/unit/ResourceUrlResolver.test.ts` | Não executado neste ambiente | Teste foi criado, execução pendente no ambiente do projeto/CI. |
| `npm.cmd run build` com env fake | Não executado neste ambiente | Requer checkout local e dependências. |
| `npm.cmd run postbuild` | Não executado neste ambiente | Requer build local. |
| E2E com env fake | Não executado neste ambiente | Requer ambiente Playwright/app. |
| Comparação GitHub `main...branch` | Executada | Confirma patch pequeno e branch ahead da main. |

## 9. Impacto funcional
- Fluxos preservados: URLs públicas atuais continuam como `displayUrl`/`downloadUrl`.
- URLs externas HTTPS: preservadas e ainda abertas/renderizadas quando válidas.
- URLs Supabase legadas: classificadas e mantidas para compatibilidade.
- Protocolos bloqueados: protocolos perigosos persistidos passam a ser recusados nos fluxos integrados e nos helpers de mídia.
- Risco de regressão: baixo/moderado, concentrado em materiais com URLs malformadas ou protocolos não HTTPS. HTTP legado é mantido para abertura, mas não é tratado como seguro para embed.

## 10. Relação com PR #13
Este PR deve vir antes do PR #13 ou de qualquer migration que torne `lesson-resources` privado. O PR #13 mexe em RLS/Storage de forma ampla e poderia quebrar o app porque o frontend ainda depende de URLs públicas diretas. O Ciclo 8B reduz esse acoplamento no client sem alterar banco, preparando o caminho para schema `bucket/path`, signed URLs e policies privadas em ciclos separados.

## 11. Riscos restantes
- Bucket `lesson-resources` continua público.
- Policies de Storage ainda estão amplas conforme diagnóstico do Ciclo 3.
- Ainda não há signed URLs.
- Ainda não há `bucket/path` persistidos no schema.
- Ainda não há validação server-side/magic bytes adicional neste ciclo.
- `LessonMaterialsSidebar` ainda possui pontos de abertura direta que devem ser tratados em ciclo posterior, embora os helpers de mídia usados por ela tenham sido endurecidos.
- `getOptimizedUrl` ainda é específico para public URL Supabase.
- PR #13 ainda precisa ser dividido.

## 12. Recomendação do executor
A) Pronto para revisão do Analista Mestre, com a ressalva de que as validações locais/CI precisam ser executadas antes de merge.

## 13. Próximo ciclo recomendado
Ciclo 8C — revisão/merge ResourceUrlResolver, incluindo execução das validações obrigatórias no ambiente local/CI e, se aprovado, complemento da integração da `LessonMaterialsSidebar`.

Depois disso, seguir para:
- Ciclo 8D — schema bucket/path;
- Ciclo 8E — `can_access_lesson`/RLS;
- Ciclo 8F — Edge Function ou signed URL;
- Ciclo 8G — Storage policies privado.

## 14. Resumo para colar no chat do Analista Mestre
Branch `fix/resource-url-resolver-readiness` criada a partir de `main` no commit `484f625eefdbc895d7a35039597a3b84ccc27cd3`. Patch adiciona `services/ResourceUrlResolver.ts`, teste unitário, integração no `LessonMaterialsModal`, endurecimento dos helpers de `utils/mediaUtils.ts`, ajuste de `.gitignore` e relatório sanitizado. Nenhum banco, migration, Storage policy, signed URL, Storage real, PR #13, deploy ou merge foi alterado. O risco reduzido é o uso direto de URLs sem classificação/validação nos fluxos integrados. Pendências: executar validações locais/CI e completar integração da sidebar em ciclo posterior se aprovado.

CICLO_8B_RESOURCE_URL_RESOLVER_READINESS_CONCLUIDO_SEM_APLICAR_DB
