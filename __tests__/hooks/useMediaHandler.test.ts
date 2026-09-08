import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaHandler } from '../../hooks/useMediaHandler';

describe('useMediaHandler', () => {
    const createMockFile = (name: string, type: string) => {
        const blob = new Blob(['test content'], { type });
        return new File([blob], name, { type });
    };

    const createMockSupabaseClient = () => ({
        storage: {
            from: vi.fn((bucket: string) => ({
                upload: vi.fn(() => Promise.resolve({
                    data: { path: 'uploads/test-file.jpg' },
                    error: null
                })),
                getPublicUrl: vi.fn(() => ({
                    data: { publicUrl: 'https://example.com/test-file.jpg' }
                })),
                remove: vi.fn(() => Promise.resolve({
                    error: null
                }))
            }))
        }
    });

    describe('URL Conversions', () => {
        it('should convert Google Drive URL to direct download', () => {
            const { result } = renderHook(() => useMediaHandler());

            const driveUrl = 'https://drive.google.com/file/d/ABC123XYZ/view';
            const converted = result.current.convertGoogleDriveUrl(driveUrl);

            expect(converted).toBe('https://drive.google.com/uc?export=download&id=ABC123XYZ');
        });

        it('should convert Dropbox URL to direct download', () => {
            const { result } = renderHook(() => useMediaHandler());

            const dropboxUrl = 'https://www.dropbox.com/s/abc123/file.mp3?dl=0';
            const converted = result.current.convertDropboxUrl(dropboxUrl);

            expect(converted).toContain('dl=1');
        });

        it('should add dl=1 to Dropbox URL without dl parameter', () => {
            const { result } = renderHook(() => useMediaHandler());

            const dropboxUrl = 'https://www.dropbox.com/s/abc123/file.mp3';
            const converted = result.current.convertDropboxUrl(dropboxUrl);

            expect(converted).toContain('dl=1');
        });
    });

    describe('uploadImage', () => {
        it('should upload image successfully', async () => {
            const mockClient = createMockSupabaseClient();
            const { result } = renderHook(() => useMediaHandler(mockClient));

            const file = createMockFile('test.jpg', 'image/jpeg');

            let uploadResult;
            await act(async () => {
                uploadResult = await result.current.uploadImage(file);
            });

            expect(uploadResult).toEqual({
                url: 'https://example.com/test-file.jpg',
                path: 'uploads/test-file.jpg'
            });
        });

        it('should set isUploading state during upload', async () => {
            const mockClient = createMockSupabaseClient();
            const { result } = renderHook(() => useMediaHandler(mockClient));

            const file = createMockFile('test.jpg', 'image/jpeg');

            expect(result.current.isUploading).toBe(false);

            await act(async () => {
                await result.current.uploadImage(file);
            });

            // After upload, should be false again
            expect(result.current.isUploading).toBe(false);
        });
    });

    describe('uploadAudio', () => {
        it('should upload audio successfully', async () => {
            const mockClient = createMockSupabaseClient();
            const { result } = renderHook(() => useMediaHandler(mockClient));

            const file = createMockFile('test.mp3', 'audio/mpeg');

            let uploadResult;
            await act(async () => {
                uploadResult = await result.current.uploadAudio(file);
            });

            expect(uploadResult).toEqual({
                url: 'https://example.com/test-file.jpg',
                path: 'uploads/test-file.jpg'
            });
        });
    });

    describe('deleteMedia', () => {
        it('should delete media file', async () => {
            const mockClient = createMockSupabaseClient();
            const { result } = renderHook(() => useMediaHandler(mockClient));

            await act(async () => {
                await result.current.deleteMedia('uploads/test-file.jpg');
            });

            expect(mockClient.storage.from).toHaveBeenCalledWith('lessons');
        });
    });

    describe('Error Handling', () => {
        it('should throw error when upload fails', async () => {
            const mockClient = {
                storage: {
                    from: vi.fn(() => ({
                        upload: vi.fn(() => Promise.resolve({
                            data: null,
                            error: new Error('Upload failed')
                        }))
                    }))
                }
            };

            const { result } = renderHook(() => useMediaHandler(mockClient));
            const file = createMockFile('test.jpg', 'image/jpeg');

            // Should throw when upload fails
            await expect(async () => {
                await act(async () => {
                    await result.current.uploadImage(file);
                });
            }).rejects.toThrow('Upload failed');

            // After error, isUploading should be reset to false
            expect(result.current.isUploading).toBe(false);
        });
    });
});
