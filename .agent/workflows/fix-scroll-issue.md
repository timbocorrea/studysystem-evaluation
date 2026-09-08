---
description: Guia para corrigir bugs de rolagem de página inesperada ao focar elementos (substituindo scrollIntoView)
---

# Correção de Bug de Rolagem de Página (Scroll Jump)

Este guia explica como corrigir o problema onde a página inteira rola para cima inesperadamente ao clicar ou focar em um elemento dentro de um container com rolagem (como um editor ou lista lateral).

## Sintoma
Quando um usuário clica em um elemento (ex: bloco de prévia), a página inteira "pula" ou rola, movendo o cabeçalho ou outros elementos para fora de vista.

## Causa Comum
O uso da função nativa `element.scrollIntoView({ block: 'center' })`.
Esta função tenta centralizar o elemento na **viewport do navegador**, o que frequentemente causa a rolagem dos containers pais (incluindo o `<body>`), resultando no salto indesejado.

## Solução
Substitua `scrollIntoView` por um cálculo manual de `scrollTo` aplicado **apenas ao container específico** que deve rolar.

### Passo a Passo

1. **Identifique o Container de Rolagem**
   Encontre o elemento pai que tem `overflow-y-auto` ou `overflow: scroll`. Certifique-se de que ele possui um `id` ou referência única (ex: `id="blocks-scroll-container"`).

2. **Identifique o Elemento Alvo**
   O elemento para o qual você quer rolar (ex: o bloco de editor correspondente).

3. **Substitua o Código**

**Código Problemático (Antes):**
```javascript
// Causa rolagem da página inteira
element.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

**Código Seguro (Depois):**
```javascript
const container = document.getElementById('seu-container-id');
const element = document.getElementById('seu-elemento-alvo-id');

if (container && element) {
    // 1. Obter retângulos de posição
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // 2. Calcular a posição do elemento relativa ao topo do container
    const relativeTop = elementRect.top - containerRect.top;

    // 3. Obter a rolagem atual
    const currentScroll = container.scrollTop;

    // 4. Calcular o novo topo para centralizar o elemento
    // (Rolagem Atual + Posição Relativa - Metade do Container + Metade do Elemento)
    const targetScroll = currentScroll + relativeTop - (container.clientHeight / 2) + (elementRect.height / 2);

    // 5. Aplicar rolagem apenas no container
    container.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
    });
}
```

## Dicas Adicionais
- Certifique-se de que o container tem `position: relative` ou contexto de posicionamento se usar `offsetTop`, mas `getBoundingClientRect` (como no exemplo acima) é geralmente mais robusto para elementos aninhados complexos.
- Se o clique ocorrer em um elemento filho (overlay), use `e.stopPropagation()` para evitar que eventos de clique em pais (que podem conter a lógica antiga) sejam disparados.
