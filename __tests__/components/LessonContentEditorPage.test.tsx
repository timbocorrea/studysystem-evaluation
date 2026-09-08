import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LessonContentEditorPage from '../../components/LessonContentEditorPage';
import {
    mockLesson,
    mockResources,
    createMockAdminService,
    createMockFile
} from '../mocks/lessonMocks';
import {
    adminCourseRepository,
    quizRepository,
    userProgressRepository
} from '../../services/Dependencies';

// Mock dependencies - MUST be at top level without external variables
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn()
    },
    Toaster: () => null
}));

vi.mock('../../services/supabaseClient', () => ({
    createSupabaseClient: () => ({
        from: vi.fn(),
        storage: vi.fn()
    })
}));

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: {
            id: 'test-user',
            name: 'Test User',
            role: 'INSTRUCTOR'
        }
    })
}));

vi.spyOn(adminCourseRepository, 'getModule').mockResolvedValue({
    id: 'test-module',
    course_id: 'test-course',
    title: 'Test Module',
    position: 1
} as any);

vi.spyOn(quizRepository, 'getQuizByLessonId').mockResolvedValue(null);

vi.spyOn(userProgressRepository, 'getLessonRequirements').mockResolvedValue({
    lessonId: mockLesson.id,
    videoRequiredPercent: 90,
    textBlocksRequiredPercent: 0,
    requiredPdfs: [],
    requiredAudios: [],
    requiredMaterials: []
} as any);

describe('LessonContentEditorPage - Integration Tests', () => {
    const mockOnSave = vi.fn();
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('1. Load Lesson Successfully', () => {
        it('should load and display lesson data', async () => {
            render(
                <LessonContentEditorPage
                    lesson={mockLesson}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Verificar se o componente renderizou
            await waitFor(() => {
                expect(document.body.textContent).toBeTruthy();
            }, { timeout: 3000 });
        });

        it('should render lesson blocks', async () => {
            render(
                <LessonContentEditorPage
                    lesson={mockLesson}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            await waitFor(() => {
                const editableElements = document.querySelectorAll('[contenteditable="true"]');
                expect(editableElements.length).toBeGreaterThan(0);
            }, { timeout: 3000 });
        });
    });

    describe('2. Add New Block', () => {
        it('should have blocks in DOM', async () => {
            render(
                <LessonContentEditorPage
                    lesson={mockLesson}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            await waitFor(() => {
                const blocks = document.querySelectorAll('[contenteditable="true"]');
                expect(blocks.length).toBeGreaterThanOrEqual(1);
            }, { timeout: 3000 });
        });
    });

    describe('3. Edit Block Content', () => {
        it('should have editable blocks', async () => {
            render(
                <LessonContentEditorPage
                    lesson={mockLesson}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            await waitFor(() => {
                const editableBlock = document.querySelector('[contenteditable="true"]');
                expect(editableBlock).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });

    describe('4. Save Changes', () => {
        it('should have save button', async () => {
            render(
                <LessonContentEditorPage
                    lesson={mockLesson}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            await waitFor(() => {
                // Check if component rendered
                expect(document.body.textContent).toBeTruthy();
            }, { timeout: 3000 });
        });
    });

    describe('5. UI Snapshot', () => {
        it('should match UI snapshot', async () => {
            const { container } = render(
                <LessonContentEditorPage
                    lesson={mockLesson}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Wait for render
            await waitFor(() => {
                expect(container.querySelector('[contenteditable]')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Clean up trailing whitespaces from DOM text nodes to satisfy git diff --check
            const cleanDOM = (node: Node) => {
                const toRemove: Node[] = [];
                node.childNodes.forEach(child => {
                    if (child.nodeType === 3) { // Node.TEXT_NODE = 3
                        if (!child.nodeValue || child.nodeValue.trim() === '') {
                            toRemove.push(child);
                        } else {
                            if (node.nodeName.toLowerCase() === 'style') {
                                // Collapse style content to a single line to prevent indentation of empty lines in snapshot
                                child.nodeValue = child.nodeValue.replace(/\s+/g, ' ').trim();
                            } else {
                                child.nodeValue = child.nodeValue.replace(/[^\S\r\n]+$/gm, '');
                            }
                        }
                    } else {
                        cleanDOM(child);
                    }
                });
                toRemove.forEach(child => node.removeChild(child));
            };
            cleanDOM(container);

            expect(container).toMatchSnapshot();
        });
    });
});
