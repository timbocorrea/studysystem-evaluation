/**
 * Utility para extrair texto de PDFs usando pdfjs-dist
 * Funciona no navegador sem necessidade de backend
 */

// 🆕 FIX 3.1: Cache de PDFs processados (10 minutos de duração)
const pdfCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos em milissegundos

/**
 * Limpa entradas expiradas do cache
 */
function cleanExpiredCache() {
    const now = Date.now();
    for (const [url, entry] of pdfCache.entries()) {
        if (now - entry.timestamp > CACHE_DURATION) {
            pdfCache.delete(url);
            console.debug(`🗑️ Cache expirado removido: ${url}`);
        }
    }
}

/**
 * Limpa manualmente todo o cache de PDFs
 */
export function clearPdfCache() {
    const size = pdfCache.size;
    pdfCache.clear();
    console.log(`✅ Cache de PDFs limpo (${size} entradas removidas)`);
}

export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
    // 🆕 FIX 3.1: Verificar cache primeiro
    cleanExpiredCache(); // Limpar entradas expiradas

    const cached = pdfCache.get(pdfUrl);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.debug(`✅ Cache hit para PDF: ${pdfUrl.substring(0, 50)}...`);
        return cached.text;
    }

    try {
        // Importação dinâmica do pdfjs-dist
        const pdfjsLib = await import('pdfjs-dist');

        // Configurar worker apontando para CDN
        // Isso evita precisar copiar o worker manualmente para public/
        // Usando unpkg para garantir versão correta e suporte a ESM (.mjs)
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        // Carregar PDF
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        let fullText = '';

        // 🆕 FIX 1.3: Aumentar de 10 para 50 páginas
        const maxPages = Math.min(pdf.numPages, 50);

        // Avisar quando PDF é muito grande
        if (pdf.numPages > 50) {
            console.warn(
                `⚠️ PDF "${pdfUrl}" tem ${pdf.numPages} páginas. ` +
                `Processando apenas as primeiras 50 para evitar timeout.`
            );
        }

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Concatenar todos os itens de texto
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += `--- Página ${pageNum} ---\n${pageText}\n\n`;
        }

        const extractedText = fullText.trim();

        // 🆕 FIX 3.1: Salvar no cache
        pdfCache.set(pdfUrl, { text: extractedText, timestamp: Date.now() });
        console.debug(`💾 PDF adicionado ao cache: ${pdfUrl.substring(0, 50)}... (${extractedText.length} chars)`);

        return extractedText;
    } catch (error) {
        console.error('Erro ao extrair texto do PDF:', error);
        return `[Erro ao ler PDF: ${pdfUrl}]`;
    }
}

/**
 * Extrai texto de múltiplos PDFs em paralelo
 */
export async function extractTextFromMultiplePDFs(pdfUrls: string[]): Promise<string> {
    if (pdfUrls.length === 0) return '';

    try {
        const promises = pdfUrls.map(url => extractTextFromPDF(url));
        const results = await Promise.all(promises);

        return results
            .filter(text => text.length > 0)
            .join('\n\n========================================\n\n');
    } catch (e) {
        console.error("Erro geral na extração de PDFs", e);
        return "";
    }
}
