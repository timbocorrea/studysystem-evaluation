import DOMPurify from 'dompurify';

const DANGEROUS_URI_PATTERN = /^(?:javascript|vbscript):|^data:text\/html/i;

function removeUnsafeOutputAttributes(html: string): string {
    return html
        .replace(/\s+on[a-z0-9:_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/\s+(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (full, _attribute, doubleQuoted, singleQuoted, unquoted) => {
            const value = (doubleQuoted ?? singleQuoted ?? unquoted ?? '').trim();
            return DANGEROUS_URI_PATTERN.test(value) ? '' : full;
        });
}

/**
 * Sanitizes an HTML string using DOMPurify.
 * Allows common formatting tags, iframes from YouTube/Vimeo, and strips
 * dangerous protocols (javascript:, data:) and event handlers.
 *
 * @param html The raw HTML string to sanitize.
 * @returns A safe HTML string.
 */
export function sanitizeHtml(html: string): string {
    if (!html) return '';

    // Defense in depth for DOM implementations that preserve forbidden element
    // nodes while sanitizing mixed content. DOMPurify remains the authoritative
    // sanitizer for the parsed document and all attributes/elements below.
    const sanitizedInput = html.replace(
        /<\s*(script|style|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
        ''
    );

    // Hook 1: Block javascript: URIs in href/src
    DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
        if (data.attrName === 'href' || data.attrName === 'src') {
            const val = data.attrValue.toLowerCase().trim();
            if (val.startsWith('javascript:') || val.startsWith('data:text/html')) {
                data.keepAttr = false;
            } else if (!/^[a-z][a-z0-9+.-]*:/i.test(val) && !val.startsWith('//')) {
                // Keep safe relative URLs such as "x", "./x" and "/assets/x".
                data.keepAttr = true;
            }
        }
    });

    // Hook 2: Allow iframes ONLY from YouTube and Vimeo
    DOMPurify.addHook('uponSanitizeElement', (node, data) => {
        if (data.tagName === 'iframe') {
            const el = node as Element;
            const src = el.getAttribute('src') || '';
            const isSafeDomain =
                src.startsWith('https://www.youtube.com/embed/') ||
                src.startsWith('https://www.youtube-nocookie.com/embed/') ||
                src.startsWith('https://player.vimeo.com/video/');

            if (!isSafeDomain) {
                node.parentNode?.removeChild(node);
            }
        }
    });

    const sanitizeSentinel = '<br data-studysystem-sanitize-sentinel="true">';
    const sanitizedOutput = DOMPurify.sanitize(`${sanitizeSentinel}${sanitizedInput}`, {
        // Do NOT use USE_PROFILES — it resets ALLOWED_TAGS/ATTR to fixed presets
        ALLOWED_TAGS: [
            'b', 'i', 'em', 'strong', 's', 'strike', 'del', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
            'img', 'svg', 'path', 'mark', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'div', 'iframe', 'video', 'source'
        ],
        ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel',
            'width', 'height', 'd', 'viewBox', 'fill', 'xmlns', 'data-note-id',
            'frameborder', 'allow', 'allowfullscreen', 'controls', 'scrolling',
            'autoplay', 'muted', 'loop', 'playsinline', 'preload', 'poster',
            'referrerpolicy', 'loading', 'sandbox'
        ],
        ALLOW_DATA_ATTR: true,
        FORBID_ATTR: [
            'onerror', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur',
            'onkeydown', 'onkeyup', 'onkeypress', 'ondrag', 'ondrop', 'onclick',
            'oncontextmenu', 'onscroll', 'onwheel', 'onresize'
        ],
        FORBID_TAGS: ['script', 'style', 'object', 'embed', 'base', 'form', 'input', 'button']
    });
    const cleanHtml = removeUnsafeOutputAttributes(sanitizedOutput)
        .replace(/^<br[^>]*data-studysystem-sanitize-sentinel[^>]*>/i, '')
        .replace(/<\s*(script|style|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
        .replace(/<\s*(base|form|input|button)\b[^>]*\/?>/gi, '');

    // Remove hooks to avoid duplicates on next call
    DOMPurify.removeHook('uponSanitizeAttribute');
    DOMPurify.removeHook('uponSanitizeElement');

    return cleanHtml as string;
}
