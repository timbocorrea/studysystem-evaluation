# Estratégia de Correção de Vulnerabilidades NPM (Audit Fix)

Este documento descreve os passos tomados para resolver as vulnerabilidades de segurança (High e Moderate) detetadas pelo comando `npm audit` no projeto, evitando "breaking changes" (alterações que quebram o código) em dependências importantes como o `vite-plugin-pwa` e o `react-router`.

## 1. Problema Inicial
O relatório inicial do `npm audit` detetou **13 vulnerabilidades** (9 Altas, 4 Moderadas). 
A execução do comando sugerido `npm audit fix --force` resultaria no *downgrade* de pacotes cruciais (ex: `vite-plugin-pwa@0.19.8` e `sort-by@0.0.2`), o que quebraria funcionalidades vitais da aplicação na compilação do Service Worker e na ordenação de elementos.

O cenário em aberto listava 6 vulnerabilidades focadas em duas dependências profundas:
- **`object-path <=0.11.7`** (furo de _Prototype Pollution_) arrastado pelo `sort-by`.
- **`serialize-javascript <=7.0.2`** (furo de _Remote Code Execution (RCE)_ via RegExp) arrastado pela cadeia `@rollup/plugin-terser` > `workbox-build` > `vite-plugin-pwa`.

## 2. Passo a Passo da Correção

### Passo 1: Correção Segura Padrão
Primeiro, aplicámos as correções seguras automáticas que não quebram o código. Este comando resolveu a maioria dos problemas periféricos (como `lodash`, `minimatch`, `react-router`, etc.).

```bash
npm audit fix
```

### Passo 2: Implementação cirúrgica com Overrides (Resolução Avançada)
Para evitar que o Vite PWA fosse arrastado para o passado com o trágico comando `--force`, recorremos de forma intencional ao mecanismo de **`overrides`** nativo do NPM 8+ no nosso `package.json`.

Ao mapearmos forçosamente a versão subjacente destas dependências intermédias para a sua respetiva _hotfix build_, sanamos a cadeia de vulnerabilidades e mantemos a arquitetura React original no topo da árvore intocável.

Foi adicionado o seguinte bloco no fim do `package.json`:

```json
  "overrides": {
    "object-path": "^0.11.8",
    "serialize-javascript": "^7.0.4"
  }
```

### Passo 3: Limpeza e Reconhecimento
Efetivamos a nova árvore de dependências no `package-lock.json` recarregando tudo:
```bash
npm install
npm audit
```

## 3. Resultado Final
O resultado do último `npm audit` foi contundente:
**`found 0 vulnerabilities`**

✅ Os furos de RCE fechados sem downgrade do Vite PWA.
✅ A poluição de protótipo anulada.
✅ Base de código a correr sobre arquiteturas inteiramente fiáveis.
