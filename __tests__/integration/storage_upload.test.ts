import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fileUploadService } from '../../services/FileUploadService';

// Mocking dependencies to only test the frontend validation boundaries
vi.mock('../../services/supabaseClient', () => {
    return {
        createSupabaseClient: vi.fn(() => ({
            storage: {
                from: vi.fn().mockReturnValue({
                    upload: vi.fn().mockResolvedValue({ error: null }),
                    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'mock-url' } })
                })
            }
        }))
    };
});

describe('FileUploadService - Security Validation (Level 4)', () => {

    it('should block SVG file types based on strict MIME Type validation', () => {
        // Mocking a File object (Browser API limitation in Vitest env, so we mock it manually)
        const mockFile = {
            name: 'malicious.svg',
            type: 'image/svg+xml',
            size: 1024,
        } as unknown as File;

        const isValid = fileUploadService.validateFileType(mockFile, 'IMAGE');
        expect(isValid).toBe(false); // SVG is no longer whitelisted
    });

    it('should block HTML spoofing', () => {
        const mockFile = {
            name: 'phishing.html',
            type: 'text/html',
            size: 1024,
        } as unknown as File;

        const isValid = fileUploadService.validateFileType(mockFile, 'FILE');
        expect(isValid).toBe(false); 
    });

    it('should allow purely safe images', () => {
        const mockPdf = {
            name: 'safe_document.pdf',
            type: 'application/pdf',
            size: 1024,
        } as unknown as File;

        const isValid = fileUploadService.validateFileType(mockPdf, 'PDF');
        expect(isValid).toBe(true);
    });

    it('should throw an error for oversized images/documents (>10MB)', async () => {
        const oversizedFile = {
            name: 'large_image.jpg',
            type: 'image/jpeg',
            size: 15 * 1024 * 1024, // 15MB
        } as unknown as File;

        await expect(fileUploadService.uploadFile(oversizedFile, 'images'))
            .rejects
            .toThrow(/tamanho máximo/);
    });

    it('should allow large audio files but enforce limits at 50MB', async () => {
        const allowedAudio = {
            name: 'podcast.mp3',
            type: 'audio/mpeg',
            size: 40 * 1024 * 1024, // 40MB -> Safe for audio
        } as unknown as File;
        
        await expect(fileUploadService.uploadFile(allowedAudio, 'audios'))
            .resolves.toBeTruthy();

        const illegalAudio = {
            name: 'orchestra.flac',
            type: 'audio/flac',
            size: 60 * 1024 * 1024, // 60MB -> Blocked
        } as unknown as File;
        
        await expect(fileUploadService.uploadFile(illegalAudio, 'audios'))
            .rejects
            .toThrow(/tamanho máximo/);
    });
});
