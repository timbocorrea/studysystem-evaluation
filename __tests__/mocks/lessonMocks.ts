import { vi } from 'vitest';
import { LessonRecord, LessonResourceRecord } from '../../domain/admin';

// Mock Lesson Data
export const mockLesson: LessonRecord = {
    id: 'test-lesson-id-123',
    title: 'Test Lesson Title',
    module_id: 'test-module-id',
    position: 1,
    video_url: 'https://example.com/video.mp4',
    video_urls: [],
    audio_url: null,
    image_url: null,
    duration_seconds: 600,
    content: JSON.stringify([
        {
            id: 'block-1',
            type: 'text',
            text: '<p>First block content</p>',
            spacing: 0
        },
        {
            id: 'block-2',
            type: 'text',
            text: '<p>Second block content</p>',
            spacing: 1
        }
    ]),
    content_blocks: [
        {
            id: 'block-1',
            type: 'text',
            text: '<p>First block content</p>',
            spacing: 0
        },
        {
            id: 'block-2',
            type: 'text',
            text: '<p>Second block content</p>',
            spacing: 1
        }
    ],
    created_at: '2024-01-01T00:00:00Z'
};

// Mock Lesson Resources
export const mockResources: LessonResourceRecord[] = [
    {
        id: 'resource-1',
        lesson_id: 'test-lesson-id-123',
        title: 'Test PDF',
        resource_type: 'PDF',
        url: 'https://example.com/test.pdf',
        position: 0,
        created_at: '2024-01-01T00:00:00Z'
    },
    {
        id: 'resource-2',
        lesson_id: 'test-lesson-id-123',
        title: 'Test Document',
        resource_type: 'FILE',
        url: 'https://example.com/test.docx',
        position: 1,
        created_at: '2024-01-01T00:00:00Z'
    }
];

// Mock Supabase Client
export const createMockSupabaseClient = () => {
    return {
        from: vi.fn((table: string) => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: mockLesson, error: null })),
                    order: vi.fn(() => Promise.resolve({ data: mockResources, error: null }))
                }))
            })),
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
            })),
            delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
        })),
        storage: {
            from: vi.fn(() => ({
                upload: vi.fn(() => Promise.resolve({
                    data: { path: 'uploads/test-file.jpg' },
                    error: null
                })),
                getPublicUrl: vi.fn(() => ({
                    data: { publicUrl: 'https://example.com/test-file.jpg' }
                }))
            }))
        }
    };
};

// Mock Toast
export const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
};

// Mock Admin Service
export const createMockAdminService = () => ({
    getLesson: vi.fn(() => Promise.resolve(mockLesson)),
    updateLesson: vi.fn(() => Promise.resolve()),
    saveLesson: vi.fn(() => Promise.resolve()),
    listLessonResources: vi.fn(() => Promise.resolve(mockResources)),
    uploadResource: vi.fn(() => Promise.resolve({
        id: 'new-resource',
        url: 'https://example.com/uploaded.pdf'
    })),
    deleteResource: vi.fn(() => Promise.resolve())
});

// Mock File for testing uploads
export const createMockFile = (
    name: string = 'test-image.jpg',
    type: string = 'image/jpeg',
    size: number = 1024000
): File => {
    const blob = new Blob(['fake image content'], { type });
    return new File([blob], name, { type });
};

// Mock HTML Element for contentEditable
export const createMockContentEditableElement = () => {
    const element = document.createElement('div');
    element.contentEditable = 'true';
    element.innerHTML = '<p>Test content</p>';
    return element;
};
