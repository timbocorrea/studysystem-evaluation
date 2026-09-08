import React, { useEffect, useState } from 'react';
import { AdminService } from '../services/AdminService';
import { CourseRecord, ProfileRecord } from '../domain/admin';
import { useAuth } from '../contexts/AuthContext';

interface AdminCourseAccessPageProps {
    adminService: AdminService;
}

const AdminCourseAccessPage: React.FC<AdminCourseAccessPageProps> = ({ adminService }) => {
    const { user } = useAuth();

    // Data
    const [courses, setCourses] = useState<CourseRecord[]>([]);
    const [students, setStudents] = useState<ProfileRecord[]>([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<CourseRecord | null>(null);

    // Assignment State
    const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, [adminService]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [courseList, userList] = await Promise.all([
                adminService.listCourses(),
                adminService.fetchApprovedUsers() // Fetch all approved users to assign
            ]);

            setCourses(courseList);

            // Filter only students (Instructors see everything by default usually, but let's list all relevant users)
            // Actually, we might want to assign access to Instructors too if the system requires it, 
            // but usually Admins/Instructors have global access.
            // Let's filter effectively to Students for now as per requirement.
            const studentList = userList.filter(u => u.role === 'STUDENT');
            setStudents(studentList);

        } catch (error) {
            console.error("Error loading data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCourse = async (course: CourseRecord) => {
        setSelectedCourse(course);
        setAssignedUserIds([]);
        setIsSaving(false);

        try {
            const assignments = await adminService.getCourseUserAssignments(course.id);
            setAssignedUserIds(assignments);
        } catch (error) {
            console.error("Error fetching assignments", error);
        }
    };

    const handleUserToggle = (userId: string) => {
        setAssignedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSave = async () => {
        if (!selectedCourse || !user) return;

        try {
            setIsSaving(true);
            await adminService.assignUsersToCourse(selectedCourse.id, assignedUserIds, user.id);
            setIsSaving(false);
            setSelectedCourse(null); // Close modal/panel
        } catch (error) {
            console.error("Error saving assignments", error);
            setIsSaving(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    // Filter students based on search
    const filteredStudents = students.filter(student =>
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto min-h-screen">
            <div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                    Controle de Acesso
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Gerencie quais alunos podem visualizar e acessar cada curso.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <div
                            key={course.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
                                    <i className="fas fa-book-open"></i>
                                </div>
                                <button
                                    onClick={() => handleSelectCourse(course)}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider transition-colors"
                                >
                                    <i className="fas fa-users-cog mr-1"></i> Gerenciar
                                </button>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">
                                {course.title}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 h-10">
                                {course.description || 'Sem descrição.'}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal / Slide-over for Managing Access */}
            {selectedCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 h-[85vh] flex flex-col">

                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <i className="fas fa-lock text-indigo-500"></i>
                                    Acesso: {selectedCourse.title}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Selecione os alunos que terão acesso a este curso.
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedCourse(null)}
                                className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors flex items-center justify-center shadow-sm"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="relative">
                                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input
                                    type="text"
                                    placeholder="Buscar aluno por nome ou email..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-950 border-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white placeholder-slate-400 font-medium"
                                />
                            </div>
                        </div>

                        {/* User List */}
                        <div className="flex-1 overflow-y-auto p-2 md:p-6 bg-slate-50/50 dark:bg-slate-900">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map(student => {
                                        const isSelected = assignedUserIds.includes(student.id);
                                        return (
                                            <label
                                                key={student.id}
                                                className={`
                          flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none
                          ${isSelected
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                    }
                        `}
                                            >
                                                <div className={`
                          w-5 h-5 rounded-md border flex items-center justify-center transition-colors
                          ${isSelected
                                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                                        : 'border-slate-300 dark:border-slate-600'
                                                    }
                        `}>
                                                    {isSelected && <i className="fas fa-check text-[10px]"></i>}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={isSelected}
                                                    onChange={() => handleUserToggle(student.id)}
                                                />
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {student.name || 'Sem nome'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 truncate">
                                                        {student.email}
                                                    </p>
                                                </div>
                                            </label>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full py-12 text-center text-slate-400">
                                        <i className="fas fa-user-slash text-3xl mb-2 opacity-50"></i>
                                        <p>Nenhum aluno encontrado.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
                            <div className="text-xs font-medium text-slate-500">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{assignedUserIds.length}</span> alunos selecionados
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedCourse(null)}
                                    className="px-6 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <i className="fas fa-circle-notch animate-spin"></i>
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-save"></i>
                                            Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCourseAccessPage;
