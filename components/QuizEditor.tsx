import { courseRepository, questionBankRepository, quizRepository } from '../services/Dependencies';
import React, { useState, useRef } from 'react';
import { Quiz, QuizQuestion, QuizOption } from '../domain/quiz-entities';
import { LessonResource } from '../domain/entities';
import { toast } from 'sonner';
import { normalizeQuestions, parseMarkdownQuestions } from '../utils/quizUtils';

interface QuizEditorProps {
    lessonId: string;
    existingQuiz?: Quiz | null;
    onSave: (quizData: {
        title: string;
        description: string;
        passingScore: number;
        questionsCount: number | null;
        poolDifficulty: 'easy' | 'medium' | 'hard' | null;
        questions: Array<{
            id?: string;
            questionText: string;
            questionType: 'multiple_choice' | 'true_false';
            points: number;
            options: Array<{
                id?: string;
                optionText: string;
                isCorrect: boolean;
            }>;
        }>;
    }) => Promise<void>;
    onClose: () => void;
    apiKey?: string;
    lessonContent?: string | Promise<string>;
    lessonResources?: LessonResource[];
    courseId?: string;
    moduleId?: string;
}

const QuizEditor: React.FC<QuizEditorProps> = ({ lessonId, existingQuiz, onSave, onClose, apiKey, lessonContent, lessonResources, courseId, moduleId }) => {
    const [title, setTitle] = useState(existingQuiz?.title || 'Questionário da Aula');
    const [description, setDescription] = useState(existingQuiz?.description || 'Teste seus conhecimentos');
    const [passingScore, setPassingScore] = useState(existingQuiz?.passingScore || 80);
    const [questionsCount, setQuestionsCount] = useState<number | null>(existingQuiz?.questionsCount || null);
    const [poolDifficulty, setPoolDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(existingQuiz?.poolDifficulty || null);
    const [usePool, setUsePool] = useState(!!existingQuiz?.questionsCount && existingQuiz.questions.length === 0);

    // Reports State
    const [showReports, setShowReports] = useState(false);
    const [reports, setReports] = useState<any[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(false);

    // Deletion State
    const [questionToDeleteIndex, setQuestionToDeleteIndex] = useState<number | null>(null);

    // Bank Preview State
    const [bankPreview, setBankPreview] = useState<QuizQuestion[]>([]);
    const [isLoadingBank, setIsLoadingBank] = useState(false);

    // JSON Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importRawJson, setImportRawJson] = useState('');

    // Markdown Import State
    const [isImportMarkdownModalOpen, setIsImportMarkdownModalOpen] = useState(false);
    const [importRawMarkdown, setImportRawMarkdown] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const jsonFileInputRef = useRef<HTMLInputElement>(null);

    const loadBankPreview = async () => {
        if (!usePool) return;
        setIsLoadingBank(true);
        try {
            const repo = questionBankRepository;
            // Filter by lesson, module or course depending on what's available
            const { questions: results } = await repo.getQuestionsPage(
                {
                    lessonId: lessonId || undefined,
                    moduleId: moduleId || undefined,
                    courseId: courseId || undefined,
                    difficulty: poolDifficulty || undefined
                },
                {
                    page: 1,
                    pageSize: 50
                }
            );
            setBankPreview(results);
        } catch (error) {
            console.error('Error loading bank preview:', error);
            toast.error('Erro ao carrerar preview do banco');
        } finally {
            setIsLoadingBank(false);
        }
    };

    React.useEffect(() => {
        if (usePool) {
            loadBankPreview();
        }
    }, [usePool, poolDifficulty]);

    const loadReports = async () => {
        if (!existingQuiz?.id) return;

        setIsLoadingReports(true);
        try {
            const fetchedReports = await quizRepository.getQuizReports(existingQuiz.id);
            setReports(fetchedReports);
            setShowReports(true);
        } catch (error) {
            console.error('Erro ao carregar reports:', error);
            toast.error('Erro ao carregar relatórios de erro.');
        } finally {
            setIsLoadingReports(false);
        }
    };

    const [questions, setQuestions] = useState<any[]>(
        existingQuiz?.questions.map(q => ({
            id: q.id,
            questionText: q.questionText,
            questionType: q.questionType,
            points: q.points,
            options: q.options.map(o => ({
                id: o.id,
                optionText: o.optionText,
                isCorrect: o.isCorrect
            }))
        })) || []
    );
    const [isSaving, setIsSaving] = useState(false);

    const [isGenerating, setIsGenerating] = useState<{
        active: boolean;
        stage: 'extracting-pdfs' | 'calling-ai' | 'parsing' | null;
        progress: number;
    }>({
        active: false,
        stage: null,
        progress: 0
    });

    const [pendingQuestions, setPendingQuestions] = useState<any[] | null>(null);

    const resolveLessonContent = async (): Promise<string> => {
        if (!lessonContent) return '';
        try {
            return typeof lessonContent === 'string' ? lessonContent : await lessonContent;
        } catch (error) {
            console.error('Erro ao carregar conteudo da aula para IA:', error);
            return '';
        }
    };

    const buildContext = async (): Promise<string> => {
        const contentText = await resolveLessonContent();
        const resourcesText = (lessonResources || [])
            .map(r => `- [${r.type}] ${r.title}${r.url ? ` -> ${r.url}` : ''}`)
            .join('\n');
        return [contentText, resourcesText].filter(Boolean).join('\n\n').trim();
    };


    const extractQuestionsFromResponse = (responseText: string) => {
        try {
            const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
            const target = arrayMatch ? arrayMatch[0] : cleaned;
            const parsed = JSON.parse(target);
            return normalizeQuestions(Array.isArray(parsed) ? parsed : [parsed]);
        } catch (error) {
            console.error('❌ Falha no parsing:', error);
            return [];
        }
    };

    const callAi = async (prompt: string): Promise<string> => {
        if (!apiKey) throw new Error('Chave de API ausente');
        const isGroq = apiKey.startsWith('gsk_');
        const url = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
        const model = isGroq ? 'openai/gpt-oss-120b' : 'gpt-3.5-turbo';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                temperature: 0.7,
                messages: [
                    { role: "system", content: "Você é um assistente útil que responde APENAS com JSON válido." },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erro API');
        return data.choices[0]?.message?.content || "";
    };

    const buildPrompt = (content: string, numQuestions: number): string => {
        return `Gere ${numQuestions} perguntas de múltipla escolha baseadas no seguinte conteúdo:\n\n${content}\n\nRetorne JSON no formato: [{"questionText": "...", "points": 1, "options": [{"optionText": "...", "isCorrect": true}, ...]}]`;
    };

    const handleGenerateAi = async () => {
        if (!apiKey) {
            toast.error('🔑 Chave de API Não Configurada');
            return;
        }

        setIsGenerating({ active: true, stage: 'extracting-pdfs', progress: 20 });
        try {
            const fullContext = await buildContext();
            const context = fullContext.substring(0, 50000);
            const questionCount = 5;

            setIsGenerating({ active: true, stage: 'calling-ai', progress: 50 });
            const response = await callAi(buildPrompt(context, questionCount));
            const normalized = extractQuestionsFromResponse(response);

            if (normalized.length === 0) throw new Error('A IA não retornou perguntas utilizáveis.');

            setIsGenerating({ active: true, stage: 'parsing', progress: 90 });
            setPendingQuestions(normalized);
        } catch (error: any) {
            toast.error('Erro ao gerar perguntas: ' + error.message);
        } finally {
            setIsGenerating({ active: false, stage: null, progress: 0 });
        }
    };

    const handleImportJson = async () => {
        try {
            const raw = importRawJson.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(raw);
            const normalized = normalizeQuestions(Array.isArray(parsed) ? parsed : [parsed]);

            if (normalized.length === 0) {
                toast.error('Nenhuma questão válida encontrada no JSON.');
                return;
            }

            const syncAndAdd = (async () => {
                const repo = questionBankRepository;

                await repo.createQuestions(normalized, {
                    courseId,
                    moduleId,
                    lessonId
                });
                setQuestions(prev => [...prev, ...normalized]);
                setImportRawJson('');
                setIsImportModalOpen(false);
            })();

            toast.promise(syncAndAdd, {
                loading: 'Processando e sincronizando questões com o banco...',
                success: `✅ ${normalized.length} questões importadas e salvas no banco com sucesso!`,
                error: (err) => `❌ Erro na sincronização: ${err.message || 'Erro desconhecido'}`
            });
        } catch (error) {
            console.error('Erro ao processar JSON:', error);
            toast.error('JSON inválido. Verifique a formatação.');
        }
    };

    const handleImportMarkdown = async () => {
        try {
            if (!importRawMarkdown.trim()) {
                toast.warning('Cole o conteúdo Markdown primeiro.');
                return;
            }

            const parsedQuestions = parseMarkdownQuestions(importRawMarkdown);

            if (parsedQuestions.length === 0) {
                toast.error('Nenhuma questão válida encontrada no Markdown. Verifique o formato.');
                return;
            }

            // Normalize to ensure IDs and structure
            const normalized = normalizeQuestions(parsedQuestions);

            const syncAndAdd = (async () => {
                const repo = questionBankRepository;

                await repo.createQuestions(normalized, {
                    courseId,
                    moduleId,
                    lessonId
                });
                setQuestions(prev => [...prev, ...normalized]);
                setImportRawMarkdown('');
                setIsImportMarkdownModalOpen(false);
            })();

            toast.promise(syncAndAdd, {
                loading: 'Processando e importando questões Markdown...',
                success: `✅ ${normalized.length} questões importadas e salvas no banco com sucesso!`,
                error: (err) => `❌ Erro na importação: ${err.message || 'Erro desconhecido'}`
            });

        } catch (error) {
            console.error('Erro ao importar Markdown:', error);
            toast.error('Erro ao processar Markdown.');
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                setImportRawMarkdown(text);
                toast.success('Arquivo carregado com sucesso!');
            }
        };
        reader.readAsText(file);
    };

    const handleJsonFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                setImportRawJson(text);
                toast.success('Arquivo JSON carregado com sucesso!');
            }
        };
        reader.readAsText(file);
    };





    const handleSyncManualQuestions = async () => {
        if (questions.length === 0) {
            toast.error('Não há questões manuais para sincronizar.');
            return;
        }

        const syncPromise = (async () => {
            const repo = questionBankRepository;

            await repo.createQuestions(questions as QuizQuestion[], {
                courseId,
                moduleId,
                lessonId
            });
        })();

        toast.promise(syncPromise, {
            loading: 'Sincronizando todas as questões manuais com o banco global...',
            success: '✅ Sincronização concluída! As questões agora estão no banco global.',
            error: (err) => `❌ Erro na sincronização: ${err.message || 'Erro desconhecido'}`
        });
    };

    const addQuestion = () => {
        setQuestions([...questions, {
            questionText: '',
            questionType: 'multiple_choice',
            points: 1,
            options: [
                { optionText: '', isCorrect: false },
                { optionText: '', isCorrect: false }
            ]
        }]);
    };

    const removeQuestion = (index: number) => {
        setQuestionToDeleteIndex(index);
    };

    const confirmRemoveQuestion = () => {
        if (questionToDeleteIndex !== null) {
            setQuestions(questions.filter((_, i) => i !== questionToDeleteIndex));
            setQuestionToDeleteIndex(null);
            toast.success('Pergunta removida localmente. Clique em Salvar para persistir a exclusão.');
        }
    };

    const handleAcceptAiQuestions = async () => {
        if (!pendingQuestions || pendingQuestions.length === 0) return;

        const toAdd = [...pendingQuestions];
        const syncPromise = (async () => {
            const repo = questionBankRepository;

            await repo.createQuestions(toAdd as QuizQuestion[], {
                courseId,
                moduleId,
                lessonId
            });

            setQuestions(prev => [...prev, ...toAdd]);
            setPendingQuestions(null);
        })();

        toast.promise(syncPromise, {
            loading: 'Adicionando e sincronizando questões com o banco...',
            success: `✅ ${toAdd.length} questões adicionadas e salvas no banco!`,
            error: (err) => `❌ Erro ao adicionar/sincronizar: ${err.message || 'Erro desconhecido'}`
        });
    };

    const updateQuestion = (index: number, field: string, value: any) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const addOption = (questionIndex: number) => {
        const updated = [...questions];
        updated[questionIndex].options.push({ optionText: '', isCorrect: false });
        setQuestions(updated);
    };

    const removeOption = (questionIndex: number, optionIndex: number) => {
        const updated = [...questions];
        updated[questionIndex].options = updated[questionIndex].options.filter((_: any, i: number) => i !== optionIndex);
        setQuestions(updated);
    };

    const updateOption = (questionIndex: number, optionIndex: number, field: string, value: any) => {
        const updated = [...questions];
        updated[questionIndex].options[optionIndex] = {
            ...updated[questionIndex].options[optionIndex],
            [field]: value
        };
        setQuestions(updated);
    };

    const toggleCorrect = (questionIndex: number, optionIndex: number) => {
        const updated = [...questions];
        updated[questionIndex].options[optionIndex].isCorrect = !updated[questionIndex].options[optionIndex].isCorrect;
        setQuestions(updated);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.warning('Título do quiz é obrigatório');
            return;
        }

        if (usePool) {
            if (!questionsCount || questionsCount <= 0) {
                toast.warning('Defina a quantidade de questões do banco');
                return;
            }
        } else {
            // Permitir 0 questões se for para limpar o quiz, mas avisar
            if (questions.length === 0) {
                const proceed = window.confirm('Você está prestes a salvar um quiz sem perguntas manuais. Isso removerá todas as perguntas existentes no banco. Deseja continuar?');
                if (!proceed) return;
            }
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                if (!q.questionText.trim()) {
                    toast.warning(`Pergunta ${i + 1} está vazia`);
                    return;
                }
                if (!q.options.some((o: any) => o.isCorrect)) {
                    toast.warning(`Pergunta ${i + 1} precisa de uma resposta correta`);
                    return;
                }
            }
        }

        setIsSaving(true);
        try {
            await onSave({
                title,
                description,
                passingScore,
                questionsCount: usePool ? questionsCount : (questionsCount || null),
                poolDifficulty: usePool ? poolDifficulty : null,
                questions: usePool ? [] : questions
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900/95 backdrop-blur-md w-full max-w-6xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 ring-1 ring-white/5 animate-in zoom-in-95 duration-300 relative">

                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-pink-500 opacity-50"></div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Header: Clean & Integrated */}
                <div className="px-8 py-6 flex items-center justify-between shrink-0 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                            <i className="fas fa-layer-group text-white text-xl"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight leading-none">Editar Quiz</h2>
                            <p className="text-xs text-slate-400 font-medium mt-1">Configuração e conteúdo da aula</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95 text-slate-400 hover:text-white"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="flex-1 min-h-0 flex overflow-hidden relative z-10">
                    {/* Left Column: Settings (Fixed Width) */}
                    <div className="w-[320px] lg:w-[380px] flex-shrink-0 overflow-y-auto p-5 pb-24 space-y-5 border-r border-white/5 custom-scrollbar bg-black/10">
                        {/* Global Settings Section */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-5 rounded-[1.5rem] bg-white/5 border border-white/5 space-y-4">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-1 h-5 bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.5)]"></div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Dados Principais</h3>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Título do Questionário</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                                <i className="fas fa-heading text-xs"></i>
                                            </div>
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={e => setTitle(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/20 border border-white/5 text-slate-200 text-sm font-medium outline-none focus:border-indigo-500/50 focus:bg-black/40 transition-all placeholder:text-slate-600"
                                                placeholder="Ex: Fundamentos de Algoritmos"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Aprovação</label>
                                            <div className="relative group">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={passingScore}
                                                    onChange={e => setPassingScore(Number(e.target.value))}
                                                    className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/5 text-slate-200 text-sm font-bold outline-none focus:border-indigo-500/50 focus:bg-black/40 transition-all placeholder:text-slate-600"
                                                />
                                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none font-bold text-slate-500 text-xs">
                                                    %
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-2xl shadow-indigo-600/20 flex flex-col gap-4 relative overflow-hidden group border border-white/10">
                                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center ring-1 ring-white/20 shadow-lg">
                                            <i className={`fas ${usePool ? 'fa-dice' : 'fa-hand-pointer'} text-lg text-white`}></i>
                                        </div>
                                        <button
                                            onClick={() => setUsePool(!usePool)}
                                            className="px-4 py-2 rounded-lg bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95 shadow-lg border border-white/10 backdrop-blur-sm"
                                        >
                                            Alternar
                                        </button>
                                    </div>

                                    <h4 className="text-base font-bold uppercase tracking-tight leading-tight">Método de Seleção</h4>

                                    <div className="mt-2 flex flex-col gap-2">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/10 backdrop-blur-sm">
                                            <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest">Ativo:</span>
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                                                {usePool ? 'Banco de Questões' : 'Seleção Manual'}
                                            </span>
                                        </div>

                                        <p className="text-[10px] font-medium leading-relaxed text-indigo-100/90 pl-1">
                                            {usePool
                                                ? "Perguntas dinâmicas."
                                                : "Controle manual."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Manual Controls (Moved to Left) */}
                        {!usePool && (
                            <div className="grid grid-cols-1 gap-3 animate-in slide-in-from-left-2 duration-300">
                                <button
                                    onClick={addQuestion}
                                    className="w-full py-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-plus"></i>
                                    Nova Questão
                                </button>

                                <button
                                    onClick={handleSyncManualQuestions}
                                    className="w-full py-4 rounded-xl bg-white/5 border border-white/5 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-sync-alt"></i>
                                    Sincronizar
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleGenerateAi}
                                        disabled={isGenerating.active}
                                        className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <i className={`fas ${isGenerating.active ? 'fa-spinner fa-spin' : 'fa-magic'}`}></i>
                                        {isGenerating.active ? 'IA...' : 'Gerar IA'}
                                    </button>
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={() => setIsImportModalOpen(true)}
                                            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                                            title="Importar JSON"
                                        >
                                            <i className="fas fa-code text-xs"></i>
                                        </button>
                                        <button
                                            onClick={() => setIsImportMarkdownModalOpen(true)}
                                            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                                            title="Importar Markdown"
                                        >
                                            <i className="fab fa-markdown text-sm"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Filter Section for Pool */}
                        {usePool && (
                            <div className="p-5 rounded-[1.5rem] bg-white/5 border border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Filtros</h3>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Qtd. Perguntas</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-500 transition-colors">
                                                <i className="fas fa-list-ol text-xs"></i>
                                            </div>
                                            <input
                                                type="number"
                                                value={questionsCount || ''}
                                                onChange={e => setQuestionsCount(Number(e.target.value))}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/20 border border-white/5 text-slate-200 text-sm font-medium outline-none focus:border-amber-500/50 focus:bg-black/40 transition-all placeholder:text-slate-600"
                                                placeholder="Ex: 5"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Dificuldade</label>
                                        <div className="relative group text-slate-200">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-500 transition-colors">
                                                <i className="fas fa-layer-group text-xs"></i>
                                            </div>
                                            <select
                                                value={poolDifficulty || ''}
                                                onChange={e => setPoolDifficulty((e.target.value || null) as any)}
                                                className="w-full pl-10 pr-8 py-3 rounded-xl bg-black/20 border border-white/5 text-inherit outline-none focus:border-amber-500/50 focus:bg-black/40 transition-all shadow-inner appearance-none text-sm font-medium"
                                            >
                                                <option value="">Todas (Misto)</option>
                                                <option value="easy">🔵 Fácil</option>
                                                <option value="medium">🟡 Média</option>
                                                <option value="hard">🔴 Difícil</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                                                <i className="fas fa-chevron-down text-[10px]"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Content Section */}
                    <div className="flex-1 overflow-y-auto px-8 py-6 pb-24 space-y-8 custom-scrollbar relative">
                        {usePool ? (
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Preview do Banco</h3>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Questões que combinam com os filtros ({bankPreview.length})</p>
                                    </div>
                                    <button
                                        onClick={loadBankPreview}
                                        disabled={isLoadingBank}
                                        className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2"
                                    >
                                        <i className={`fas fa-sync-alt ${isLoadingBank ? 'animate-spin' : ''}`}></i>
                                        Atualizar Preview
                                    </button>
                                </div>

                                {isLoadingBank ? (
                                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sincronizando...</span>
                                    </div>
                                ) : bankPreview.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {bankPreview.slice(0, 6).map((q, idx) => (
                                            <div key={idx} className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/0 group-hover:bg-indigo-500 transition-all duration-300"></div>

                                                <div className="flex gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-black/20 text-indigo-400 flex items-center justify-center shrink-0 text-[10px] font-bold ring-1 ring-white/5 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                                                        <i className="fas fa-question"></i>
                                                    </div>
                                                    <div className="flex-1 space-y-3">
                                                        <p className="text-xs text-slate-300 font-medium leading-relaxed line-clamp-2 group-hover:text-white transition-colors">{q.questionText}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-wider ${q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                                q.difficulty === 'hard' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                }`}>
                                                                {q.difficulty === 'easy' ? 'Fácil' : q.difficulty === 'hard' ? 'Difícil' : 'Média'}
                                                            </span>
                                                            <span className="text-[9px] px-2 py-1 rounded-md bg-white/5 text-slate-400 border border-white/5 font-bold uppercase tracking-wider">
                                                                {q.options.length} Opções
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {bankPreview.length > 6 && (
                                            <div className="col-span-1 md:col-span-2 p-4 text-center border border-dashed border-white/10 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                                                    + {bankPreview.length - 6} questões disponíveis
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <i className="fas fa-database text-2xl"></i>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Nenhuma questão encontrada</h4>
                                        <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto font-medium">Não encontramos questões que correspondam aos filtros nesta aula ou nos contextos superiores.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="pt-10 border-t border-slate-100 dark:border-slate-800 space-y-10 animate-in fade-in duration-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Questões Manuais</h3>
                                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{questions.length} Questões no Total</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {questions.map((q, qIdx) => (
                                        <div key={qIdx} className="group relative p-6 bg-white dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-500/40 transition-all">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-indigo-500/20">
                                                        <i className="fas fa-question"></i>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Configuração da Pergunta</span>
                                                </div>
                                                <button
                                                    onClick={() => removeQuestion(qIdx)}
                                                    className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                >
                                                    <i className="fas fa-trash-alt text-xs"></i>
                                                </button>
                                            </div>

                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">ENUNCIADO DA QUESTÃO</label>
                                                    <textarea
                                                        value={q.questionText}
                                                        onChange={e => updateQuestion(qIdx, 'questionText', e.target.value)}
                                                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px] resize-none"
                                                        placeholder="Digite o enunciado da questão..."
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between px-1">
                                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">ALTERNATIVAS</label>
                                                        <button
                                                            onClick={() => addOption(qIdx)}
                                                            className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
                                                        >
                                                            <i className="fas fa-plus mr-1"></i> Adicionar Opção
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-3">
                                                        {q.options.map((opt: any, optIdx: number) => (
                                                            <div key={optIdx} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                                                                <button
                                                                    onClick={() => {
                                                                        // Reset all and toggle this one
                                                                        const updatedQ = { ...questions[qIdx] };
                                                                        updatedQ.options = updatedQ.options.map((o: any, i: number) => ({
                                                                            ...o,
                                                                            isCorrect: i === optIdx
                                                                        }));
                                                                        updateQuestion(qIdx, 'options', updatedQ.options);
                                                                    }}
                                                                    className={`w-10 h-10 rounded-xl border-2 flex-shrink-0 flex items-center justify-center transition-all ${opt.isCorrect
                                                                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-300'
                                                                        }`}
                                                                >
                                                                    {opt.isCorrect ? <i className="fas fa-check text-xs"></i> : <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />}
                                                                </button>
                                                                <input
                                                                    type="text"
                                                                    value={opt.optionText}
                                                                    onChange={e => updateOption(qIdx, optIdx, 'optionText', e.target.value)}
                                                                    className={`flex-1 px-5 py-3 rounded-xl border transition-all text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 ${opt.isCorrect
                                                                        ? 'bg-emerald-50/30 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900/30'
                                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                                                        }`}
                                                                    placeholder={`Opção ${optIdx + 1}`}
                                                                />
                                                                {q.options.length > 2 && (
                                                                    <button
                                                                        onClick={() => removeOption(qIdx, optIdx)}
                                                                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                                                                    >
                                                                        <i className="fas fa-times-circle"></i>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {questions.length === 0 && (
                                        <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                                <i className="fas fa-pencil-alt text-2xl"></i>
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Nenhuma questão manual</h4>
                                            <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto font-medium">Clique em "Nova Questão" para adicionar conteúdo ou use o Gerador de IA.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions - Floating Gradient */}
                <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent z-20 flex items-center justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 ring-1 ring-white/10"
                    >
                        {isSaving ? (
                            <>
                                <i className="fas fa-circle-notch animate-spin"></i>
                                <span>Salvando...</span>
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save"></i>
                                <span>Salvar Alterações</span>
                            </>
                        )}
                    </button>
                </div>

                {/* AI Generator Overlay */}
                {
                    isGenerating.active && (
                        <div className="fixed inset-0 z-[400] bg-indigo-950/80 backdrop-blur-md flex items-center justify-center p-4">
                            <div className="w-full max-w-sm text-white text-center space-y-8 animate-in zoom-in-95 duration-300">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center mx-auto">
                                        <i className="fas fa-magic text-4xl animate-pulse"></i>
                                    </div>
                                    <div className="absolute inset-0 w-24 h-24 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Magia em Execução</h3>
                                    <p className="text-xs text-indigo-200 font-bold uppercase tracking-widest">
                                        {isGenerating.stage === 'extracting-pdfs' ? 'Extraindo conteúdo dos PDFs...' :
                                            isGenerating.stage === 'calling-ai' ? 'Consultando Professor AI...' :
                                                'Formatando questões...'}
                                    </p>
                                </div>
                                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-400 transition-all duration-1000 ease-out"
                                        style={{ width: `${isGenerating.progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* AI Preview Modal */}
                {
                    pendingQuestions && (
                        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-cyan-200 dark:border-cyan-900/30">
                                <div className="p-8 bg-cyan-600 text-white flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter">Nova Descoberta IA</h3>
                                        <p className="text-xs font-bold text-cyan-100 uppercase tracking-widest mt-1">Revisão Sugerida ({pendingQuestions?.length || 0} Questões)</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <i className="fas fa-check-double"></i>
                                    </div>
                                </div>
                                <div className="p-8 overflow-y-auto flex-1 space-y-6">
                                    {(pendingQuestions || []).map((q, i) => (
                                        <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black text-[10px]"><i className="fas fa-question"></i></div>
                                                <p className="font-bold text-sm leading-relaxed text-slate-800 dark:text-slate-100">{q.questionText}</p>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 pl-9">
                                                {q.options.map((o: any, j: number) => (
                                                    <div key={j} className={`text-xs p-3 rounded-xl border ${o.isCorrect
                                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700 font-bold dark:bg-emerald-900/10 dark:border-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                                                        }`}>
                                                        <div className="flex items-center gap-2">
                                                            <i className={`fas ${o.isCorrect ? 'fa-check-circle' : 'fa-circle text-[6px] opacity-30'}`}></i>
                                                            {o.optionText}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex gap-4">
                                    <button
                                        onClick={() => setPendingQuestions(null)}
                                        className="flex-1 py-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                    >
                                        Rejeitar Tudo
                                    </button>
                                    <button
                                        onClick={handleAcceptAiQuestions}
                                        className="flex-2 px-10 py-4 rounded-2xl bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-cyan-600/20 transition-all active:scale-95"
                                    >
                                        Importar {pendingQuestions?.length || 0} Questões
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Reports Modal */}
                {
                    showReports && (
                        <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-amber-200 dark:border-amber-900/30">
                                <div className="p-8 bg-amber-500 text-white flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter">Feedback dos Alunos</h3>
                                        <p className="text-xs font-bold text-amber-100 uppercase tracking-widest mt-1">{reports.length} Incidentes Reportados</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <i className="fas fa-bug text-xl"></i>
                                    </div>
                                </div>
                                <div className="p-8 overflow-y-auto flex-1 space-y-4">
                                    {reports.length === 0 ? (
                                        <div className="text-center py-10 opacity-40">
                                            <i className="fas fa-check-circle text-4xl mb-4"></i>
                                            <p className="font-black uppercase tracking-widest text-[10px]">Nenhum problema reportado</p>
                                        </div>
                                    ) : (
                                        reports.map((r, i) => (
                                            <div key={i} className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="px-2 py-1 rounded bg-amber-200 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest">
                                                        {r.issueType}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400">
                                                        {new Date(r.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic leading-relaxed">"{r.comment}"</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                                    <button
                                        onClick={() => setShowReports(false)}
                                        className="px-8 py-3 rounded-xl bg-white dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Deletion Confirmation */}
                {
                    questionToDeleteIndex !== null && (
                        <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                                <div className="p-10 text-center space-y-8">
                                    <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <i className="fas fa-trash-alt text-4xl text-red-500"></i>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Remover?</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                            Esta pergunta será removida localmente. Para efetivar no banco, <b>salve o quiz</b> após confirmar.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setQuestionToDeleteIndex(null)}
                                            className="px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            onClick={confirmRemoveQuestion}
                                            className="px-6 py-4 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-xl shadow-red-600/20"
                                        >
                                            Confirmar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* JSON Import Modal */}
                {
                    isImportModalOpen && (
                        <div className="fixed inset-0 z-[800] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh]">
                                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Importar Questões via JSON</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Cole o código ou faça upload do arquivo</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => jsonFileInputRef.current?.click()}
                                            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                                        >
                                            <i className="fas fa-file-upload"></i>
                                            Carregar .JSON
                                        </button>
                                        <input
                                            type="file"
                                            ref={jsonFileInputRef}
                                            className="hidden"
                                            accept=".json"
                                            onChange={handleJsonFileUpload}
                                        />
                                        <button onClick={() => setIsImportModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="p-8 space-y-6 overflow-y-auto">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                                        <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <i className="fas fa-info-circle"></i>
                                            Formato Esperado
                                        </div>
                                        <code className="text-[11px] block whitespace-pre bg-white/50 dark:bg-black/20 p-3 rounded-lg overflow-x-auto text-slate-600 dark:text-indigo-300">
                                            {`[
  {
    "questionText": "Qual a capital da França?",
    "points": 1,
    "options": [
      { "optionText": "Paris", "isCorrect": true },
      { "optionText": "Londres", "isCorrect": false }
    ]
  }
]`}
                                        </code>
                                    </div>

                                    <textarea
                                        value={importRawJson}
                                        onChange={(e) => setImportRawJson(e.target.value)}
                                        placeholder="Cole seu JSON aqui..."
                                        className="w-full h-64 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs outline-none focus:border-indigo-500 transition-all resize-none"
                                    />
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
                                        disabled={!importRawJson.trim()}
                                        className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        Processar e Adicionar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Markdown Import Modal */}
                {
                    isImportMarkdownModalOpen && (
                        <div className="fixed inset-0 z-[800] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh]">
                                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Importar via Markdown</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Cole o conteúdo ou faça upload do arquivo</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                                        >
                                            <i className="fas fa-file-upload"></i>
                                            Carregar .MD
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept=".md,.txt"
                                            onChange={handleFileUpload}
                                        />
                                        <button onClick={() => setIsImportMarkdownModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="p-8 space-y-6 overflow-y-auto">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                                        <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <i className="fab fa-markdown"></i>
                                            Formato Suportado
                                        </div>
                                        <pre className="text-[11px] block whitespace-pre bg-white/50 dark:bg-black/20 p-3 rounded-lg overflow-x-auto text-slate-600 dark:text-indigo-300 font-mono">
                                            {`## Título da Pergunta
Enunciado da pergunta aqui...

- [ ] Opção Incorreta
- [x] Opção Correta
- [ ] Outra opção

Gabarito: B (Opcional)
Justificativa: Explicação aqui (Opcional)`}
                                        </pre>
                                    </div>

                                    <textarea
                                        value={importRawMarkdown}
                                        onChange={(e) => setImportRawMarkdown(e.target.value)}
                                        placeholder="Cole seu conteúdo Markdown aqui..."
                                        className="w-full h-64 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs outline-none focus:border-indigo-500 transition-all resize-none"
                                    />
                                </div>

                                <div className="p-8 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                                    <button
                                        onClick={() => setIsImportMarkdownModalOpen(false)}
                                        className="flex-1 py-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleImportMarkdown}
                                        disabled={!importRawMarkdown.trim()}
                                        className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        Processar e Adicionar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </div >
    );
};

export default QuizEditor;
