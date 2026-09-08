import { describe, expect, it } from 'vitest';
import { FileUploadService, isSafeLessonResourcePath, sanitizeOriginalFilename } from '../../services/FileUploadService';

const service = new FileUploadService();

const mockFile = (name: string, type: string, size: number = 1024): File => ({
    name,
    type,
    size,
} as File);

describe('FileUploadService validation helpers', () => {
    it('accepts allowed PDF files up to the configured size', () => {
        const file = mockFile('material.pdf', 'application/pdf', 50 * 1024 * 1024);

        expect(service.validateFile(file, 'PDF')).toEqual({ valid: true });
        expect(service.validateFileType(file, 'PDF')).toBe(true);
    });

    it('rejects mismatched MIME and extension combinations', () => {
        const file = mockFile('material.pdf', 'image/png');

        expect(service.validateFile(file, 'PDF').valid).toBe(false);
    });

    it('rejects dangerous double extensions', () => {
        const file = mockFile('material.exe.pdf', 'application/pdf');

        expect(service.validateFile(file, 'PDF').valid).toBe(false);
    });

    it('rejects path traversal style names', () => {
        const file = mockFile('../material.pdf', 'application/pdf');

        expect(service.validateFile(file, 'PDF').valid).toBe(false);
    });

    it('builds a safe bucket-relative object path without using the original name', () => {
        const file = mockFile('material.pdf', 'application/pdf');
        const path = service.buildStoragePath(file, 'pdfs');

        expect(path).toMatch(/^pdfs\/[a-f0-9-]+\.pdf$/i);
        expect(path).not.toContain('material');
        expect(isSafeLessonResourcePath(path)).toBe(true);
    });

    it('sanitizes original filenames for metadata without changing storage paths', () => {
        expect(sanitizeOriginalFilename(' material de apoio.pdf ')).toBe('material de apoio.pdf');
        expect(sanitizeOriginalFilename('pasta\\material.pdf')).toBe('pasta_material.pdf');
        expect(sanitizeOriginalFilename('')).toBe('arquivo');
    });

    it('extracts only safe paths from lesson-resources public URLs', () => {
        const url = 'https://example.supabase.co/storage/v1/object/public/lesson-resources/pdfs/abc-123.pdf';

        expect(service.extractStoragePathFromUrl(url)).toBe('pdfs/abc-123.pdf');
    });

    it('does not extract unsafe or unrelated paths for deletion', () => {
        expect(service.extractStoragePathFromUrl('https://example.com/file.pdf')).toBeNull();
        expect(service.extractStoragePathFromUrl('https://example.supabase.co/storage/v1/object/public/lesson-resources/pdfs/../file.pdf')).toBeNull();
        expect(isSafeLessonResourcePath('pdfs/../file.pdf')).toBe(false);
    });
});
