import { questionBankRepository, supabaseClient as supabase } from '../services/Dependencies';
import React, { useEffect, useState, useMemo } from 'react';
import { AdminService } from '../services/AdminService';
import { QuizQuestion, QuestionDifficulty, Quiz, QuizAttemptResult } from '../domain/quiz-entities';
import QuestionBankEditor from './QuestionBankEditor';
import QuizModal from './QuizModal';
import QuizResultsModal from './QuizResultsModal';
import { toast } from 'sonner';
import { normalizeQuestions, parseMarkdownQuestions } from '../utils/quizUtils';
import { useCourseHierarchy } from '../hooks/useCourseHierarchy';

// Utility function to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

interface Props {
    adminService: AdminService;
}

const QuestionnaireManagementPage: React.FC<Props> = ({ adminService }) => {
    // Page Filter Hierarchy
    const {
        courses,
        modules,
        lessons,
        selectedCourseId,
        selectedModuleId,
        selectedLessonId,
        setSelectedCourseId,
        setSelectedModuleId,
        setSelectedLessonId,
        resetHierarchy,
        loadingModules,
        loadingLessons
    } = useCourseHierarchy({ adminService });

    // MD Import Modal Hierarchy
    const importHierarchy = useCourseHierarchy({ adminService });

    const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty | ''>('');
    const [searchKeyword, setSearchKeyword] = useState<string>('');

    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [totalFilteredQuestions, setTotalFilteredQuestions] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isBusy, setIsBusy] = useState(false);

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

    // Simulation State
    const [isSimulationOpen, setIsSimulationOpen] = useState(false);
    const [isResultOpen, setIsResultOpen] = useState(false);
    const [simulationResult, setSimulationResult] = useState<QuizAttemptResult | null>(null);

    // JSON Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importRawJson, setImportRawJson] = useState('');

    // System Stats State
    const [stats, setStats] = useState({
        courses: 0,
        modules: 0,
        lessons: 0,
        questions: 0
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const repository = useMemo(() => questionBankRepository, []);
    const hasInitializedFilterEffect = React.useRef(false);

    useEffect(() => {
        loadSystemStats();
    }, []);

    const loadSystemStats = async () => {
        try {
            const [
                { count: coursesCount },
                { count: modulesCount },
                { count: lessonsCount },
                { count: questionsCount }
            ] = await Promise.all([
                supabase.from('courses').select('id', { count: 'exact', head: true }),
                supabase.from('modules').select('id', { count: 'exact', head: true }),
                supabase.from('lessons').select('id', { count: 'exact', head: true }),
                supabase.from('question_bank').select('id', { count: 'exact', head: true })
            ]);

            setStats({
                courses: coursesCount || 0,
                modules: modulesCount || 0,
                lessons: lessonsCount || 0,
                questions: questionsCount || 0
            });
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    };

    const loadQuestions = async (page: number = currentPage, pageSize: number = itemsPerPage) => {
        setIsLoading(true);
        try {
            const { questions: list, total } = await repository.getQuestionsPage(
                {
                    courseId: selectedCourseId || undefined,
                    moduleId: selectedModuleId || undefined,
                    lessonId: selectedLessonId || undefined,
                    difficulty: selectedDifficulty || undefined,
                    keyword: searchKeyword || undefined
                },
                {
                    page,
                    pageSize
                }
            );

            const safeTotalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
            if (page > safeTotalPages) {
                setCurrentPage(safeTotalPages);
                return;
            }

            setQuestions(list);
            setTotalFilteredQuestions(total || 0);
        } catch (error: any) {
            console.error(error);
            toast.error(`Erro ao carregar questoes: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!hasInitializedFilterEffect.current) {
            hasInitializedFilterEffect.current = true;
            return;
        }

        const timer = setTimeout(() => {
            if (currentPage === 1) {
                loadQuestions(1, itemsPerPage);
            } else {
                setCurrentPage(1); // Reset to page 1 when filters change
            }
            setSelectedQuestions(new Set()); // Reset selection
        }, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [selectedCourseId, selectedModuleId, selectedLessonId, selectedDifficulty, searchKeyword]);

    useEffect(() => {
        loadQuestions(currentPage, itemsPerPage);
    }, [currentPage, itemsPerPage]);


const handleClearFilters = () => {
    resetHierarchy();
    setSelectedDifficulty('');
    setSearchKeyword('');
    setCurrentPage(1);
    toast.success('Filtros limpos');
};

    const handleSaveQuestion = async (question: QuizQuestion, h: { courseId?: string; moduleId?: string; lessonId?: string }) => {
        setIsBusy(true);
        try {
            if (question.id) {
                await repository.updateQuestion(question, h);
            } else {
                await repository.createQuestion(question, h);
                loadSystemStats(); // Refresh stats on new question
            }
            loadQuestions();
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            setIsBusy(false);
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm('Deseja realmente excluir esta questão?')) return;
        try {
            await repository.deleteQuestion(id);
            toast.success('questão excluída');
            loadQuestions();
            loadSystemStats(); // Refresh stats on delete
        } catch (error) {
            toast.error('Erro ao excluir questão');
        }
    };

    // Bulk Selection Logic
    const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

    const toggleSelectAll = () => {
        const allIds = paginatedQuestions.map(q => q.id);
        const allSelected = allIds.every(id => selectedQuestions.has(id));

        if (allSelected) {
            const newSelected = new Set(selectedQuestions);
            allIds.forEach(id => newSelected.delete(id));
            setSelectedQuestions(newSelected);
        } else {
            const newSelected = new Set(selectedQuestions);
            allIds.forEach(id => newSelected.add(id));
            setSelectedQuestions(newSelected);
        }
    };

    const toggleSelectQuestion = (id: string) => {
        const newSelected = new Set(selectedQuestions);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedQuestions(newSelected);
    };

    const handleBulkDelete = async () => {
        if (selectedQuestions.size === 0) return;
        if (!confirm(`Deseja realmente excluir ${selectedQuestions.size} questões? Esta ação não pode ser desfeita.`)) return;

        setIsBusy(true);
        try {
            // Execute deletes in parallel batches to avoid overwhelming the server
            const idsToDelete = Array.from(selectedQuestions);
            const batchSize = 5;

            for (let i = 0; i < idsToDelete.length; i += batchSize) {
                const batch = idsToDelete.slice(i, i + batchSize);
                await Promise.all(batch.map(id => repository.deleteQuestion(id)));
            }

            toast.success(`${selectedQuestions.size} questões excluídas com sucesso.`);
            setSelectedQuestions(new Set());
            loadQuestions();
            loadSystemStats();
        } catch (error) {
            console.error('Erro ao excluir questões em massa:', error);
            toast.error('Erro ao excluir algumas questões. Tente novamente.');
        } finally {
            setIsBusy(false);
        }
    };

    const handleImportJson = async () => {
        if (!importHierarchy.selectedCourseId) {
            toast.error('Por favor, selecione um curso para as questões.');
            return;
        }

        try {
            const raw = importRawJson;

            // Strictly Markdown parsing as requested
            const parsed = parseMarkdownQuestions(raw);

            const normalized = normalizeQuestions(parsed);

            if (normalized.length === 0) {
                toast.error('Nenhuma questão válida encontrada no Markdown.');
                return;
            }

        setIsBusy(true);
        try {
            await repository.createQuestions(normalized, {
                courseId: importHierarchy.selectedCourseId, // Use modal selection
                moduleId: importHierarchy.selectedModuleId || undefined,
                lessonId: importHierarchy.selectedLessonId || undefined
            });

                toast.success(`${normalized.length} questões importadas e salvas no banco com sucesso!`);
                setImportRawJson('');
                setIsImportModalOpen(false);
                loadQuestions();
                loadSystemStats();
            } finally {
                setIsBusy(false);
            }
        } catch (error) {
            console.error('Erro ao processar Markdown:', error);
            toast.error('Erro ao processar arquivo. Verifique a formatação.');
        }
    };

    const handleSimulationSubmit = (answers: Record<string, string>) => {
        if (questions.length === 0) return;

        // Shuffle questions and their options for randomization
        const shuffledQuestions = shuffleArray(questions).map(q =>
            new QuizQuestion(
                q.id,
                q.quizId,
                q.questionText,
                q.questionType,
                q.position,
                q.points,
                shuffleArray(q.options), // Shuffle options
                q.difficulty,
                q.imageUrl,
                q.courseId,
                q.moduleId,
                q.lessonId,
                q.courseName,
                q.moduleName,
                q.lessonName
            )
        );

        // Create a virtual quiz for simulation
        const virtualQuiz = new Quiz(
            'SIMULATION',
            'BANK',
            'Simulação de Banco de questões',
            'Teste suas questões aqui',
            70, // Standard passing score
            shuffledQuestions
        );

        const result = virtualQuiz.validateAttempt(answers);
        setSimulationResult(result);
        setIsSimulationOpen(false);
        setIsResultOpen(true);
    };

    // Pagination Logic
    const totalPages = Math.max(1, Math.ceil(totalFilteredQuestions / itemsPerPage));
    const startIndex = totalFilteredQuestions === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, totalFilteredQuestions);
    const paginatedQuestions = questions;

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // Scroll to top of questions list
        window.scrollTo({ top: 400, behavior: 'smooth' });
    };

    const handleItemsPerPageChange = (value: number) => {
        setItemsPerPage(value);
        setCurrentPage(1); // Reset to page 1 when changing items per page
    };

    return (
        <div className="h-screen bg-white dark:bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Sticky Header Area */}
            <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="px-8 py-3 max-w-7xl mx-auto">
                    <div className="flex items-center justify-between">
                        {/* Title and Back Button */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => window.history.back()}
                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-600 dark:text-slate-300"
                                title="Voltar"
                            >
                                <i className="fas fa-arrow-left"></i>
                            </button>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Questionário Centralizado
                                </h1>
                                <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">
                                    Admin / <span className="text-slate-400">Banco de Dados</span>
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                            {selectedQuestions.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="h-9 px-4 rounded-lg font-black transition-all active:scale-95 flex items-center gap-2 text-[10px] uppercase bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/20 animate-in fade-in zoom-in duration-200"
                                    title="Excluir Selecionados"
                                >
                                    <i className="fas fa-trash-alt text-[10px]"></i>
                                    Excluir ({selectedQuestions.size})
                                </button>
                            )}

                            {questions.length > 0 && (
                                <button
                                    onClick={() => setIsSimulationOpen(true)}
                                    className="h-9 px-4 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-2 text-[10px] uppercase bg-slate-100 text-indigo-600 border border-indigo-200 hover:bg-indigo-50 dark:bg-transparent dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                                    title="Simular Quiz"
                                >
                                    <i className="fas fa-play text-[10px]"></i>
                                    SIMULAR
                                </button>
                            )}

                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="h-9 px-4 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-2 text-[10px] uppercase bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 dark:bg-transparent dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-600/10"
                                title="Importar JSON"
                            >
                                <i className="fas fa-code text-[10px]"></i>
                                IMPORTAR
                            </button>

                            <button
                                onClick={() => { setEditingQuestion(null); setIsEditorOpen(true); }}
                                className="h-9 px-4 rounded-lg bg-indigo-600 text-white border border-transparent hover:bg-indigo-700 dark:bg-transparent dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-500/10 font-semibold transition-all active:scale-95 flex items-center gap-2 text-[10px] uppercase shadow-lg shadow-indigo-600/10 dark:shadow-none"
                            >
                                <i className="fas fa-plus text-[10px]"></i>
                                Nova questão
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Main Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Courses Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                        <i className="fas fa-book text-lg text-indigo-600 dark:text-indigo-400"></i>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Cursos</p>
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.courses}</p>
                            </div>
                        </div>

                        {/* Modules Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                                        <i className="fas fa-layer-group text-lg text-cyan-600 dark:text-cyan-400"></i>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Módulos</p>
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.modules}</p>
                            </div>
                        </div>

                        {/* Lessons Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                                        <i className="fas fa-chalkboard-user text-lg text-teal-600 dark:text-teal-400"></i>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Aulas</p>
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.lessons}</p>
                            </div>
                        </div>

                        {/* Questions Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                        <i className="fas fa-database text-lg text-amber-600 dark:text-amber-400"></i>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">questões</p>
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.questions}</p>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Curso</label>
                            <select
                                value={selectedCourseId}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">Todos os Cursos</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Módulo</label>
                            <select
                                value={selectedModuleId}
                                onChange={(e) => setSelectedModuleId(e.target.value)}
                                disabled={!selectedCourseId}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer disabled:opacity-50"
                            >
                                <option value="">Todos os Módulos</option>
                                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Aula</label>
                            <select
                                value={selectedLessonId}
                                onChange={(e) => setSelectedLessonId(e.target.value)}
                                disabled={!selectedModuleId}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer disabled:opacity-50"
                            >
                                <option value="">Todas as Aulas</option>
                                {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Dificuldade</label>
                            <select
                                value={selectedDifficulty}
                                onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">Todas as Dificuldades</option>
                                <option value="easy">Fácil</option>
                                <option value="medium">Médio</option>
                                <option value="hard">Difícil</option>
                            </select>
                        </div>

                        {/* SEARCH FILTER */}
                        <div className="md:col-span-4 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <i className="fas fa-search text-indigo-500 text-[12px]"></i>
                                    Buscar por Palavra-Chave
                                </label>
                                {(selectedCourseId || selectedModuleId || selectedLessonId || selectedDifficulty || searchKeyword) && (
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-700 transition-colors flex items-center gap-1.5"
                                    >
                                        <i className="fas fa-filter-circle-xmark"></i>
                                        Limpar Filtros
                                    </button>
                                )}
                            </div>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    placeholder="Digite parte do enunciado ou conteúdo da questão..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-transparent rounded-2xl px-5 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500/50 outline-none transition-all shadow-inner"
                                />
                                {searchKeyword && (
                                    <button
                                        onClick={() => setSearchKeyword('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
                                    >
                                        <i className="fas fa-times text-xs"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Questions List */}
                    <div className="space-y-4">
                        {/* Pagination Info */}
                        {totalFilteredQuestions > 0 && (
                            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sticky top-20 z-40 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 pl-2 border-r border-slate-200 dark:border-slate-800 pr-4">
                                        <input
                                            type="checkbox"
                                            checked={paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQuestions.has(q.id))}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer" onClick={toggleSelectAll}>
                                            Todos
                                        </label>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        Exibindo <span className="text-indigo-600 dark:text-indigo-400">{startIndex}-{endIndex}</span> de <span className="text-indigo-600 dark:text-indigo-400">{totalFilteredQuestions}</span> questoes
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Por pagina:</label>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Carregando questões...</p>
                            </div>
                        ) : paginatedQuestions.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {paginatedQuestions.map(q => (
                                    <div key={q.id} className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border transition-all group relative ${selectedQuestions.has(q.id)
                                        ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-900/10'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/30'
                                        }`}>
                                        <div className="flex items-start gap-4">
                                            <div className="pt-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedQuestions.has(q.id)}
                                                    onChange={() => toggleSelectQuestion(q.id)}
                                                    className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all"
                                                />
                                            </div>
                                            <div className="flex-1 flex items-start justify-between gap-6 min-w-0">
                                                <div className="flex items-start gap-6 min-w-0">
                                                    {q.imageUrl && (
                                                        <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                                                            <img src={q.imageUrl} alt="questão" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div className="space-y-2 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                                                q.difficulty === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                                                                    'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                                                                }`}>
                                                                {q.difficulty === 'easy' ? 'Fácil' : q.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                                                            </span>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                {q.points} Pontos
                                                            </span>
                                                        </div>

                                                        {(q.courseName || q.moduleName || q.lessonName) && (
                                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight mb-1">
                                                                <i className="fas fa-folder-open text-indigo-500 opacity-80"></i>
                                                                {q.courseName && <span>{q.courseName}</span>}
                                                                {q.moduleName && (
                                                                    <>
                                                                        <i className="fas fa-chevron-right text-[7px] opacity-30"></i>
                                                                        <span>{q.moduleName}</span>
                                                                    </>
                                                                )}
                                                                {q.lessonName && (
                                                                    <>
                                                                        <i className="fas fa-chevron-right text-[7px] opacity-30"></i>
                                                                        <span className="text-indigo-600 dark:text-indigo-400">{q.lessonName}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                        <p className="text-[15px] font-bold text-slate-800 dark:text-white leading-relaxed whitespace-pre-wrap">{q.questionText}</p>
                                                        <div className="flex flex-wrap gap-2 pt-1">
                                                            {q.options.map((opt, idx) => (
                                                                <div key={idx} className={`px-3 py-1.5 rounded-xl text-[14px] font-medium border ${opt.isCorrect
                                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/5 dark:border-emerald-500/20 dark:text-emerald-400'
                                                                    : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-500'
                                                                    }`}>
                                                                    {opt.isCorrect && <i className="fas fa-check-circle mr-1.5"></i>}
                                                                    {opt.optionText}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-shrink-0 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => { setEditingQuestion(q); setIsEditorOpen(true); }}
                                                        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                    >
                                                        <i className="fas fa-pen"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteQuestion(q.id)}
                                                        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-500 hover:text-white transition-colors"
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-2xl text-slate-300 dark:text-slate-600">
                                    <i className="fas fa-clipboard-question"></i>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white">Nenhuma questão encontrada</h3>
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Refine seus filtros ou adicione uma nova questão ao banco.</p>
                                    </div>
                                    {(selectedCourseId || selectedModuleId || selectedLessonId || selectedDifficulty || searchKeyword) && (
                                        <button
                                            onClick={handleClearFilters}
                                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2 mx-auto"
                                        >
                                            <i className="fas fa-filter-circle-xmark"></i>
                                            Limpar Todos os Filtros
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <i className="fas fa-chevron-left text-sm"></i>
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                    // Show first page, last page, current page, and pages around current
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === page
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                                        return <span key={page} className="text-slate-400 px-2">...</span>;
                                    }
                                    return null;
                                })}

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <i className="fas fa-chevron-right text-sm"></i>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Editor Modal */}
                    {isEditorOpen && (
                        <QuestionBankEditor
                            existingQuestion={editingQuestion}
                            hierarchy={{
                                courseId: selectedCourseId || undefined,
                                moduleId: selectedModuleId || undefined,
                                lessonId: selectedLessonId || undefined
                            }}
                            adminService={adminService}
                            onSave={handleSaveQuestion}
                            onClose={() => setIsEditorOpen(false)}
                        />
                    )}

                    {/* Simulation Modals */}
                    {isSimulationOpen && (
                        <QuizModal
                            quiz={new Quiz('SIM', 'BANK', 'Simulado', 'Teste do Banco', 70, questions)}
                            isOpen={isSimulationOpen}
                            onClose={() => setIsSimulationOpen(false)}
                            onSubmit={handleSimulationSubmit}
                        />
                    )}

                    {simulationResult && (
                        <QuizResultsModal
                            result={simulationResult}
                            passingScore={70}
                            isOpen={isResultOpen}
                            onClose={() => setIsResultOpen(false)}
                            onRetry={() => {
                                setIsResultOpen(false);
                                setIsSimulationOpen(true);
                            }}
                        />
                    )}

                    {/* MD Import Modal */}
                    {isImportModalOpen && (
                        <div className="fixed inset-0 z-[800] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh]">
                                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Importar questões (Markdown)</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                            Carregue um arquivo .md ou cole o texto abaixo.
                                        </p>
                                    </div>
                                    <button onClick={() => setIsImportModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>

                                <div className="p-8 space-y-6 overflow-y-auto">
                                    {/* Hierarchy Selection for Import */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                                Curso (Obrigatório)
                                            </label>
                                            <select
                                                value={importHierarchy.selectedCourseId}
                                                onChange={(e) => importHierarchy.setSelectedCourseId(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="">Selecione...</option>
                                                {importHierarchy.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                                Módulo
                                            </label>
                                            <select
                                                value={importHierarchy.selectedModuleId}
                                                onChange={(e) => importHierarchy.setSelectedModuleId(e.target.value)}
                                                disabled={!importHierarchy.selectedCourseId || importHierarchy.loadingModules}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer disabled:opacity-30"
                                            >
                                                <option value="">{importHierarchy.loadingModules ? 'Carregando...' : 'Selecione...'}</option>
                                                {importHierarchy.modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                                Aula
                                            </label>
                                            <select
                                                value={importHierarchy.selectedLessonId}
                                                onChange={(e) => importHierarchy.setSelectedLessonId(e.target.value)}
                                                disabled={!importHierarchy.selectedModuleId || importHierarchy.loadingLessons}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer disabled:opacity-30"
                                            >
                                                <option value="">{importHierarchy.loadingLessons ? 'Carregando...' : 'Selecione...'}</option>
                                                {importHierarchy.lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                                        <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <i className="fas fa-info-circle"></i>
                                            Formato Markdown Esperado
                                        </div>
                                        <code className="text-[11px] block whitespace-pre bg-white/50 dark:bg-black/20 p-3 rounded-lg overflow-x-auto text-slate-600 dark:text-indigo-300">
                                            {`# Enunciado da questão aqui...
A) Opção 1
B) Opção 2
C) Opção 3

Gabarito: B
Justificativa: Explicação opcional...

---

# Próxima questão...`}
                                        </code>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                            Arquivo ou Texto
                                        </label>
                                        <input
                                            type="file"
                                            accept=".md,.txt"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => setImportRawJson(ev.target?.result as string);
                                                    reader.readAsText(file);
                                                }
                                            }}
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400"
                                        />
                                        <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wide my-2">OU</div>
                                        <textarea
                                            value={importRawJson}
                                            onChange={(e) => setImportRawJson(e.target.value)}
                                            placeholder="Cole o conteúdo do Markdown aqui..."
                                            className="w-full h-48 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs outline-none focus:border-indigo-500 transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                                    <button
                                        onClick={() => setIsImportModalOpen(false)}
                                        className="flex-1 py-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleImportJson}
                                        disabled={!importRawJson.trim() || isBusy || !importHierarchy.selectedCourseId}
                                        className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isBusy ? 'Processando...' : 'Importar questões'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuestionnaireManagementPage;
