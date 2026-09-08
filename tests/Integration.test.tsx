import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import StudentDashboard from '@/components/features/dashboard/StudentDashboard';
import { Course } from '../domain/entities';

// Mocks
vi.mock('../contexts/AuthContext');
vi.mock('../contexts/CourseContext', () => ({
    useCourse: () => ({
        courseService: {
            getWeeklyXpHistory: vi.fn().mockResolvedValue([])
        }
    })
}));
vi.mock('@/components/features/dashboard/RecentActivity', () => ({
    default: () => null
}));
const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
});

// Setup mock data
const mockCourse = new Course('c1', 'Test Course', 'Description', null, null, null, []);
// Mock User with necessary methods to avoid class instance issues in test env
const mockUser = {
    id: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'STUDENT',
    xp: 0,
    level: 1,
    calculateLevelProgress: () => 50,
    getRemainingXpForNextLevel: () => 500,
    checkAndAddAchievements: () => null,
    achievements: []
};

describe('Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({
            user: mockUser,
            isAdmin: false
        });
    });

    it('renders dashboard with courses', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <StudentDashboard
                        user={mockUser as any}
                        courses={[mockCourse]}
                        onCourseClick={vi.fn()}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(screen.getAllByText('Test Course').length).toBeGreaterThan(0);
            expect(screen.getByText('Cursos da Plataforma')).toBeInTheDocument();
        });
    });

    it('handles course click navigation', async () => {
        const handleCourseClick = vi.fn();

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <StudentDashboard
                        user={mockUser as any}
                        courses={[mockCourse]}
                        onCourseClick={handleCourseClick}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        );

        // Target the action button which actually has the click handler in Cards mode.
        const enrollButton = await screen.findByRole('button', { name: /inscrever-se/i });
        fireEvent.click(enrollButton);
        expect(handleCourseClick).toHaveBeenCalledWith('c1');
    });

    // Note: Testing actual routing integration inside App.tsx is complex due to many providers.
    // Testing component interaction boundaries (like above) is often sufficient for integration.
});
