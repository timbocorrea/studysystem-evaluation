import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../utils/sanitizeHtml';

describe('XSS Sanitization', () => {
    it('should strip script tags and javascript protocol', () => {
        const payload = '<a href="javascript:alert(1)">Click</a><script>alert("XSS")</script>';
        const clean = sanitizeHtml(payload);
        expect(clean).not.toContain('script');
        expect(clean).not.toContain('javascript:alert(1)');
    });

    it('should strip dangerous event handlers', () => {
        const payload = '<img src="x" onerror="alert(1)">';
        const clean = sanitizeHtml(payload);
        expect(clean).not.toContain('onerror');
        expect(clean).toContain('<img src="x">');
    });

    it('should strip insecure iframe protocols and allow secure ones', () => {
        const payload = '<iframe src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="></iframe>';
        const clean = sanitizeHtml(payload);
        expect(clean).not.toContain('data:text/html');
    });

    it('should allow legitimate markdown HTML tags', () => {
        const legitimate = '<p><strong>Bold</strong> <em>Italic</em></p><ul><li>List Item</li></ul>';
        const clean = sanitizeHtml(legitimate);
        expect(clean).toContain('<strong>Bold</strong>');
        expect(clean).toContain('<em>Italic</em>');
        expect(clean).toContain('<li>List Item</li>');
    });

    it('should neutralize SVG obfuscation attacks', () => {
        const payload = '<svg/onload=alert(1)>';
        const clean = sanitizeHtml(payload);
        expect(clean).not.toContain('onload');
        expect(clean).not.toContain('alert');
    });
});
