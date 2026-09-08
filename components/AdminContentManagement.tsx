
import React, { useEffect, useMemo, useState } from 'react';
import { AdminService } from '../services/AdminService';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { scopeInstructorCourseContent } from '../utils/instructorAdminCourses';
import { CourseRecord, LessonRecord, LessonResourceRecord, ModuleRecord, SystemStats } from '../domain/admin';
import { fileUploadService } from '../services/FileUploadService';
import { supabaseClient as supabase } from '../services/Dependencies';
import ResourceUploadForm from './ResourceUploadForm';
import CreateCourseModal from './CreateCourseModal';
import CreateModuleModal from './CreateModuleModal';
import CreateLessonModal from './CreateLessonModal';
import MoveLessonModal from './MoveLessonModal';
import { Button } from './ui/Button';
import { 
  Plus, 
  Search, 
  GraduationCap, 
  Layers, 
  PlayCircle, 
  Pencil, 
  Trash2, 
  ChevronRight, 
  LayoutGrid, 
  List, 
  Maximize2,
  Calendar,
  MoreVertical,
  Settings,
  Eye,
  FileText
} from 'lucide-react';

type Props = {
  adminService: AdminService;
  initialCourseId?: string;
  initialModuleId?: string;
  initialLessonId?: string;
  onOpenContentEditor?: (lesson: LessonRecord) => void;
  user: { id: string, role: string, email: string };
};

const AdminContentManagement: React.FC<Props> = ({ adminService, user, initialCourseId, initialModuleId, onOpenContentEditor }) => {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [expandedCourseId, setExpandedCourseId] = useState<string>('');
  const [expandedModuleId, setExpandedModuleId] = useState<string>('');
  const [modulesByCourse, setModulesByCourse] = useState<Record<string, ModuleRecord[]>>({});
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, LessonRecord[]>>({});
  const [lessonResources, setLessonResources] = useState<Record<string, LessonResourceRecord[]>>({});
  const [allowedCourseIds, setAllowedCourseIds] = useState<string[]>([]);
  const [allowedLessonIds, setAllowedLessonIds] = useState<string[]>([]);
  const [allowedModuleIds, setAllowedModuleIds] = useState<string[]>([]);
  const allowedCourseIdsRef = React.useRef<string[]>([]);
  const allowedLessonIdsRef = React.useRef<string[]>([]);
  const allowedModuleIdsRef = React.useRef<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [activeCourseIdForModuleCreation, setActiveCourseIdForModuleCreation] = useState<string | null>(null);
  const [activeModuleIdForLessonCreation, setActiveModuleIdForLessonCreation] = useState<string | null>(null);

  const [editingCourse, setEditingCourse] = useState<CourseRecord | null>(null);
  const [editingModule, setEditingModule] = useState<ModuleRecord | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonRecord | null>(null);

  const [activeLesson, setActiveLesson] = useState<LessonRecord | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string>('');
  const [movingLesson, setMovingLesson] = useState<LessonRecord | null>(null);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceType, setNewResourceType] = useState<LessonResourceRecord['resource_type']>('PDF');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourcePosition, setNewResourcePosition] = useState<number>(0);

  // Estados para upload de arquivo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file'); // Padrão: upload de arquivo

  // Estados para edição de recursos
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editingResourceTitle, setEditingResourceTitle] = useState('');

  // Estados para modos de visualização
  type ViewMode = 'list' | 'grid' | 'minimal';
  const [moduleViewMode, setModuleViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('moduleViewMode');
    return (saved as ViewMode) || 'list';
  });
  const [lessonViewMode, setLessonViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('lessonViewMode');
    return (saved as ViewMode) || 'list';
  });
  const [courseViewMode, setCourseViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('courseViewMode');
    return (saved as ViewMode) || 'grid'; // Default to grid for modernized view
  });


  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  const stats = useMemo(() => {
    // Para Master, usar estatísticas globais do sistema se disponíveis.
    // Para Instrutores comuns, calcular com base apenas no que é visível nesta página (segurança + atribuições).
    const isMaster = user?.role === 'MASTER';

    if (systemStats && isMaster) {
      return [
        { label: 'Cursos', value: systemStats.course_count || courses.length, icon: GraduationCap, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { label: 'Modulos', value: systemStats.module_count || 0, icon: Layers, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
        { label: 'Aulas', value: systemStats.lesson_count || 0, icon: PlayCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
      ];
    }

    const totalModules = Object.values(modulesByCourse).reduce((acc, list) => acc + list.length, 0);
    const totalLessons = Object.values(lessonsByModule).reduce((acc, list) => acc + list.length, 0);
    return [
      { label: 'Cursos', value: courses.length, icon: GraduationCap, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
      { label: 'Modulos', value: totalModules, icon: Layers, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
      { label: 'Aulas', value: totalLessons, icon: PlayCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
    ];
  }, [courses.length, modulesByCourse, lessonsByModule, systemStats, user]);

  const refreshSystemStats = async () => {
    try {
      const s = await adminService.getSystemStats();
      setSystemStats(s);
    } catch (e) {
      console.error("Failed to load stats", e);
    }
  }

  const getModules = (courseId: string) => modulesByCourse[courseId] || [];
  const getLessons = (moduleId: string) => lessonsByModule[moduleId] || [];

  const refreshCourses = async () => {
    setError('');
    setBusy(true);
    try {
      // Usar outline para ter acesso aos módulos e aulas (para contadores)
      let list = await adminService.listCoursesOutline();
      const isMaster = user.role === 'MASTER';
      const access = {
        assignedLessonIds: [] as string[],
        activeEnrollmentCourseIds: [] as string[],
        userCourseAssignmentIds: [] as string[],
      };

      if (user.role === 'INSTRUCTOR' && !isMaster) {
        [
          access.assignedLessonIds,
          access.activeEnrollmentCourseIds,
          access.userCourseAssignmentIds,
        ] = await Promise.all([
          adminService.listInstructorLessonAssignments(user.id).catch(() => []),
          adminService.listActiveCourseEnrollmentIds(user.id).catch(() => []),
          adminService.listUserCourseAssignmentIds(user.id).catch(() => []),
        ]);
      }

      const contentScope = scopeInstructorCourseContent(list, user.id, access, isMaster);
      list = contentScope.courses as typeof list;

      allowedCourseIdsRef.current = contentScope.allowedCourseIds;
      allowedModuleIdsRef.current = contentScope.allowedModuleIds;
      allowedLessonIdsRef.current = contentScope.allowedLessonIds;
      setAllowedCourseIds(contentScope.allowedCourseIds);
      setAllowedModuleIds(contentScope.allowedModuleIds);
      setAllowedLessonIds(contentScope.allowedLessonIds);

      // Converter de Course[] para CourseRecord[] para manter compatibilidade
      const courseRecords: CourseRecord[] = list.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description || null,
        image_url: c.imageUrl || null,
        color: c.color || null,
        color_legend: c.colorLegend || null,
        instructor_id: c.instructorId || null
      }));
      setCourses(courseRecords);

      // Popular caches de contagem
      const newModulesByCourse: Record<string, ModuleRecord[]> = {};
      const newLessonsByModule: Record<string, LessonRecord[]> = {};

      list.forEach(course => {
        // Módulos do curso
        const modules = course.modules.map(m => ({
          id: m.id,
          course_id: course.id,
          title: m.title,
          position: m.position ?? 0
        } as any));
        newModulesByCourse[course.id] = modules;

        // Aulas de cada módulo
        course.modules.forEach((module: any) => {
          const lessons = module.lessons.map((l: any) => ({
            id: l.id,
            module_id: module.id,
            title: l.title,
            position: l.position,
            is_active: l.is_active ?? true
          } as any));
          newLessonsByModule[module.id] = lessons;
        });
      });

      setModulesByCourse(newModulesByCourse);
      setLessonsByModule(newLessonsByModule);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resolveCourseId = (courseOrModuleId?: string) => {
    if (!courseOrModuleId) return undefined;
    if (courses.some(course => course.id === courseOrModuleId)) return courseOrModuleId;
    return Object.values(modulesByCourse)
      .flat()
      .find(module => module.id === courseOrModuleId)
      ?.course_id;
  };

  const canManageLesson = (lesson: LessonRecord, courseOrModuleId?: string) => {
    if (user.role === 'MASTER') return true;

    const courseId = resolveCourseId(courseOrModuleId);
    if (courseId) {
      const course = courses.find(item => item.id === courseId);
      if (course?.instructor_id === user.id || allowedCourseIds.includes(courseId)) return true;
    }

    return allowedLessonIds.includes(lesson.id);
  };

  const refreshModules = async (courseId: string) => {
    setError('');
    let list = await adminService.listModules(courseId);
    
    const isMaster = user.role === 'MASTER';
    const course = courses.find(c => c.id === courseId);
    const isPrimary = course?.instructor_id === user.id;
    const hasFullCourseAccess = allowedCourseIdsRef.current.includes(courseId);

    if (!isMaster && !isPrimary && !hasFullCourseAccess) {
      // Use ref to get latest value (avoids stale closure bug)
      list = list.filter(m => allowedModuleIdsRef.current.includes(m.id));
    }

    setModulesByCourse(prev => ({ ...prev, [courseId]: list }));
  };

  const refreshLessons = async (moduleId: string) => {
    setError('');
    let list = await adminService.listLessons(moduleId, { summary: true });
    
    const isMaster = user.role === 'MASTER';
    const module = Object.values(modulesByCourse).flat().find(m => m.id === moduleId);
    const course = courses.find(c => c.id === module?.course_id);
    const isPrimary = course?.instructor_id === user.id;
    const hasFullCourseAccess = !!module?.course_id && allowedCourseIdsRef.current.includes(module.course_id);

    if (!isMaster && !isPrimary && !hasFullCourseAccess) {
      // Use ref to get latest value (avoids stale closure bug)
      list = list.filter(l => allowedLessonIdsRef.current.includes(l.id));
    }

    setLessonsByModule(prev => ({ ...prev, [moduleId]: list }));
  };

  const refreshLessonResources = async (lessonId: string) => {
    setError('');
    const list = await adminService.listLessonResources(lessonId);
    setLessonResources(prev => ({ ...prev, [lessonId]: list }));
  };

  const upsertLessonInCache = (lesson: LessonRecord) => {
    setLessonsByModule(prev => {
      const moduleLessons = prev[lesson.module_id];
      if (!moduleLessons || moduleLessons.length === 0) return prev;

      return {
        ...prev,
        [lesson.module_id]: moduleLessons.map(existing =>
          existing.id === lesson.id ? lesson : existing
        )
      };
    });
  };

  const ensureLessonDetails = async (lesson: LessonRecord): Promise<LessonRecord> => {
    const isSummaryOnly =
      lesson.content === null &&
      lesson.video_url === null &&
      lesson.video_urls === null &&
      lesson.audio_url === null &&
      lesson.image_url === null &&
      lesson.duration_seconds === null &&
      lesson.content_blocks === null;

    if (!isSummaryOnly) return lesson;

    const fullLesson = await adminService.getLesson(lesson.id);
    upsertLessonInCache(fullLesson);
    return fullLesson;
  };

  useEffect(() => {
    const run = async () => {
      try {
        setBusy(true);
        await refreshCourses();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
      refreshSystemStats(); // Carrega estatisticas iniciais
    };
    run();
  }, []);

  useEffect(() => {
    if (!courses.length) return;
    if (initialCourseId && courses.some(c => c.id === initialCourseId)) {
      setExpandedCourseId(initialCourseId);
      refreshModules(initialCourseId);
    }
  }, [courses, initialCourseId]);

  useEffect(() => {
    if (!expandedCourseId || !initialModuleId) return;
    const modules = getModules(expandedCourseId);
    if (modules.length && modules.some(m => m.id === initialModuleId)) {
      setExpandedModuleId(initialModuleId);
      refreshLessons(initialModuleId);
    }
  }, [expandedCourseId, modulesByCourse, initialModuleId]);

  const handleEditCourseFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCourse) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Por favor, selecione uma imagem válida.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning('A imagem deve ter no máximo 5MB.');
      return;
    }

    setIsUploading(true);

    try {

      const fileExt = file.name.split('.').pop();
      const fileName = `course-cover-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `course-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lesson-resources')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('lesson-resources')
        .getPublicUrl(filePath);

      setEditingCourse({ ...editingCourse, image_url: urlData.publicUrl });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error(`Erro ao fazer upload: ${(error as any).message || 'Erro desconhecido'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateCourse = async (title: string, description: string, imageUrl: string, color: string, colorLegend: string) => {
    try {
      setBusy(true);
      await adminService.createCourse(title.trim(), description.trim() || undefined, imageUrl.trim() || undefined, color, colorLegend);
      await refreshCourses();
      refreshSystemStats();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;
    try {
      setBusy(true);
      await adminService.updateCourse(editingCourse.id, {
        title: editingCourse.title,
        description: editingCourse.description ?? null,
        imageUrl: editingCourse.image_url ?? null,
        color: editingCourse.color ?? null,
        colorLegend: editingCourse.color_legend ?? null
      });
      setEditingCourse(null);
      await refreshCourses();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Excluir este curso? Isso remove modulos e aulas relacionadas.')) return;
    try {
      setBusy(true);
      await adminService.deleteCourse(courseId);
      setExpandedCourseId('');
      await refreshCourses();
      refreshSystemStats();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateModule = async (courseId: string, title: string, position: number) => {
    try {
      setBusy(true);
      await adminService.createModule(courseId, title.trim(), position);
      await refreshModules(courseId);
      refreshSystemStats();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!editingModule) return;
    try {
      setBusy(true);
      await adminService.updateModule(editingModule.id, {
        title: editingModule.title,
        position: editingModule.position
      });
      setEditingModule(null);
      await refreshModules(editingModule.course_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteModule = async (courseId: string, moduleId: string) => {
    if (!confirm('Excluir este modulo? Isso remove aulas relacionadas.')) return;
    try {
      setBusy(true);
      await adminService.deleteModule(moduleId);
      setLessonsByModule(prev => {
        const copy = { ...prev };
        delete copy[moduleId];
        return copy;
      });
      await refreshModules(courseId);
      refreshSystemStats();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLesson = async (moduleId: string, data: { title: string, videoUrl?: string, content?: string, durationSeconds: number, position: number }) => {
    try {
      setBusy(true);
      await adminService.createLesson(moduleId, {
        title: data.title.trim(),
        videoUrl: data.videoUrl,
        content: data.content,
        durationSeconds: data.durationSeconds,
        position: data.position
      });
      await refreshLessons(moduleId);
      refreshSystemStats();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateLesson = async () => {
    if (!editingLesson) return;
    try {
      setBusy(true);
      await adminService.updateLesson(editingLesson.id, {
        title: editingLesson.title,
        content: editingLesson.content ?? null,
        videoUrl: editingLesson.video_url ?? null,
        durationSeconds: editingLesson.duration_seconds,
        position: editingLesson.position
      });
      setEditingLesson(null);
      await refreshLessons(editingLesson.module_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm('Excluir esta aula?')) return;
    try {
      setBusy(true);
      await adminService.deleteLesson(lessonId);
      if (activeLessonId === lessonId) {
        setActiveLessonId('');
        setActiveLesson(null);
      }
      await refreshLessons(moduleId);
      refreshSystemStats();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleMoveLesson = async (lessonId: string, sourceModuleId: string, targetModuleId: string) => {
    try {
      setBusy(true);
      await adminService.moveLesson(lessonId, targetModuleId);
      if (activeLessonId === lessonId) {
        setActiveLessonId('');
        setActiveLesson(null);
      }
      setMovingLesson(null);
      await Promise.all([
        refreshLessons(sourceModuleId),
        refreshLessons(targetModuleId)
      ]);
      toast.success('Aula movida com sucesso!');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveActiveLesson = async () => {
    if (!activeLesson) return;
    try {
      setBusy(true);
      const updated = await adminService.updateLesson(activeLesson.id, {
        title: activeLesson.title,
        content: activeLesson.content ?? null,
        videoUrl: activeLesson.video_url ?? null,
        audioUrl: activeLesson.audio_url ?? null,
        imageUrl: activeLesson.image_url ?? null,
        durationSeconds: activeLesson.duration_seconds,
        position: activeLesson.position
      });
      setActiveLesson(updated);
      await refreshLessons(updated.module_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateResource = async (lessonId: string) => {
    if (!newResourceTitle.trim()) return;

    // Validar: ou tem arquivo ou tem URL
    if (uploadMethod === 'file' && !selectedFile) {
      setError('Por favor, selecione um arquivo para fazer upload');
      return;
    }
    if (uploadMethod === 'url' && !newResourceUrl.trim()) {
      setError('Por favor, insira uma URL');
      return;
    }

    try {
      setBusy(true);
      setIsUploading(true);
      setUploadProgress(0);
      let finalUrl = newResourceUrl.trim();
      let storageMetadata: {
        storageProvider?: LessonResourceRecord['storage_provider'];
        storageBucket?: string | null;
        storagePath?: string | null;
        mimeType?: string | null;
        fileSizeBytes?: number | null;
        originalFilename?: string | null;
      } = {};

      // Se método for upload de arquivo
      if (uploadMethod === 'file' && selectedFile) {
        // Validar tipo de arquivo
        if (!fileUploadService.validateFileType(selectedFile, newResourceType)) {
          throw new Error(`Tipo de arquivo inválido para ${newResourceType}`);
        }

        setUploadProgress(30);

        // Fazer upload
        const folder = fileUploadService.getFolderByType(newResourceType);
        const storageReference = await fileUploadService.uploadFileToStorage(selectedFile, folder, newResourceType);
        finalUrl = storageReference.publicUrl;
        storageMetadata = {
          storageProvider: 'supabase_storage',
          storageBucket: storageReference.bucket,
          storagePath: storageReference.path,
          mimeType: storageReference.mimeType,
          fileSizeBytes: storageReference.fileSizeBytes,
          originalFilename: storageReference.originalFilename,
        };

        setUploadProgress(70);
      }

      // Criar recurso no banco
      await adminService.createLessonResource(lessonId, {
        title: newResourceTitle.trim(),
        resourceType: newResourceType,
        url: finalUrl,
        position: newResourcePosition,
        ...storageMetadata
      });

      setUploadProgress(100);

      // Limpar estados
      setNewResourceTitle('');
      setNewResourceUrl('');
      setNewResourcePosition(0);
      setSelectedFile(null);
      setUploadProgress(0);

      await refreshLessonResources(lessonId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteResource = async (lessonId: string, resourceId: string) => {
    if (!confirm('Excluir este material?')) return;
    try {
      setBusy(true);
      await adminService.deleteLessonResource(resourceId);
      await refreshLessonResources(lessonId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateResource = async (resourceId: string, lessonId: string) => {
    if (!editingResourceTitle.trim()) {
      setError('Título não pode estar vazio');
      return;
    }
    try {
      setBusy(true);
      await adminService.updateLessonResource(resourceId, {
        title: editingResourceTitle.trim()
      });
      setEditingResourceId(null);
      setEditingResourceTitle('');
      await refreshLessonResources(lessonId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openLessonDetail = async (lesson: LessonRecord) => {
    setActiveLessonId(lesson.id);
    setActiveLesson({ ...lesson });
    try {
      const [detailedLesson] = await Promise.all([
        ensureLessonDetails(lesson),
        refreshLessonResources(lesson.id)
      ]);
      setActiveLesson({ ...detailedLesson });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // Funções para alternar modos de visualização
  const toggleModuleViewMode = (mode: ViewMode) => {
    setModuleViewMode(mode);
    localStorage.setItem('moduleViewMode', mode);
  };

  const toggleLessonViewMode = (mode: ViewMode) => {
    setLessonViewMode(mode);
    localStorage.setItem('lessonViewMode', mode);
  };

  const toggleCourseViewMode = (mode: ViewMode) => {
    setCourseViewMode(mode);
    localStorage.setItem('courseViewMode', mode);
  };

  // Componente de toggle de visualização
  const ViewModeToggle: React.FC<{ current: ViewMode; onChange: (mode: ViewMode) => void; label: string }> = ({ current, onChange, label }) => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}:</span>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
        <button
          onClick={() => onChange('list')}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${current === 'list'
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          title="Lista"
        >
          <List className="w-3.5 h-3.5" />
          <span>Lista</span>
        </button>
        <button
          onClick={() => onChange('grid')}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${current === 'grid'
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          title="Grade"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Cards</span>
        </button>
        <button
          onClick={() => onChange('minimal')}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${current === 'minimal'
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          title="Minimalista"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Minimal</span>
        </button>
      </div>
    </div>
  );
  const handleToggleLessonAvailability = async (lesson: LessonRecord) => {
    const nextIsActive = lesson.is_active === false;

    try {
      setBusy(true);
      setError('');

      const updatedLesson = await adminService.updateLesson(lesson.id, {
        isActive: nextIsActive
      });

      const finalIsActive = updatedLesson.is_active ?? nextIsActive;

      setLessonsByModule(prev => ({
        ...prev,
        [lesson.module_id]: (prev[lesson.module_id] || []).map(item =>
          item.id === lesson.id ? { ...item, is_active: finalIsActive } : item
        )
      }));

      setActiveLesson(prev =>
        prev?.id === lesson.id ? { ...prev, is_active: finalIsActive } : prev
      );

      toast.success(finalIsActive ? 'Aula ativada para alunos.' : 'Aula inativada para alunos.');
    } catch (e) {
      setError((e as Error).message);
      toast.error('Não foi possível alterar a disponibilidade da aula.');
    } finally {
      setBusy(false);
    }
  };

  const renderLessonList = (module: ModuleRecord) => {
    const lessons = getLessons(module.id);
    const isExpanded = expandedModuleId === module.id;

    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
        <div
          className={`p-4 flex items-start justify-between gap-4 cursor-pointer transition ${isExpanded ? 'bg-cyan-50 dark:bg-cyan-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          onClick={() => {
            const next = isExpanded ? '' : module.id;
            setExpandedModuleId(next);
            if (!lessons.length) refreshLessons(module.id);
          }}
        >
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-800 dark:text-white truncate">{module.title}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Posicao: {module.position ?? 0}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(user.role === 'MASTER' || (courses.find(c => c.id === module.course_id)?.instructor_id === user.id)) && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={e => {
                    e.stopPropagation();
                    setEditingModule({ ...module });
                  }}
                  title="Editar modulo"
                >
                  <Pencil size={18} className="text-slate-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteModule(module.course_id, module.id);
                  }}
                  title="Excluir modulo"
                >
                  <Trash2 size={18} className="text-slate-400" />
                </Button>
              </>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 space-y-4 bg-slate-50/70 dark:bg-slate-950/20">
            {(user.role === 'MASTER' || (courses.find(c => c.id === module.course_id)?.instructor_id === user.id)) && (
              <div className="flex justify-end">
                <Button
                  disabled={busy}
                  variant="cyan"
                  size="sm"
                  onClick={() => setActiveModuleIdForLessonCreation(module.id)}
                  className="flex items-center gap-2"
                >
                  <Plus size={14} /> Criar aula
                </Button>
              </div>
            )}

            <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1C1E23] overflow-hidden">
              {lessons.map(lesson => {
                const isLessonActive = lesson.is_active !== false;

                return (
                <div key={lesson.id} className={cn(
                  "border-b border-slate-100 dark:border-white/5 last:border-0",
                  !isLessonActive && "opacity-60"
                )}>
                  <div
                    className={cn(
                      "p-4 flex items-start justify-between gap-4 transition",
                      canManageLesson(lesson, module.course_id) ? "hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer" : "opacity-80 cursor-default"
                    )}
                    onClick={() => canManageLesson(lesson, module.course_id) && openLessonDetail(lesson)}
                  >
                    <div className="min-w-0">
                      <p className={cn(
                        "text-sm font-black truncate",
                        isLessonActive ? "text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-500 line-through decoration-slate-500/60"
                      )}>{lesson.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {isLessonActive ? 'Ativa para aluno' : 'Inativa para aluno'} • Posicao: {lesson.position ?? 0}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2 truncate flex items-center gap-1.5">
                        <PlayCircle size={10} /> {lesson.video_url || 'Nenhum vídeo'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canManageLesson(lesson, module.course_id) && (
                        <>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isLessonActive}
                            disabled={busy}
                            onClick={e => {
                              e.stopPropagation();
                              handleToggleLessonAvailability(lesson);
                            }}
                            title={isLessonActive ? 'Inativar aula para alunos' : 'Ativar aula para alunos'}
                            className={cn(
                              "relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border transition-all disabled:opacity-60",
                              isLessonActive
                                ? "bg-emerald-500 border-emerald-400"
                                : "bg-slate-600 border-slate-500"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                                isLessonActive ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => {
                              e.stopPropagation();
                              setMovingLesson({ ...lesson });
                            }}
                            title="Mover aula"
                          >
                            <Maximize2 size={16} className="text-slate-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async e => {
                              e.stopPropagation();
                              try {
                                setBusy(true);
                                const detailedLesson = await ensureLessonDetails(lesson);
                                setEditingLesson({ ...detailedLesson });
                              } catch (err) {
                                setError((err as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                            title="Editar"
                          >
                            <Pencil size={16} className="text-slate-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteLesson(module.id, lesson.id);
                            }}
                            title="Excluir"
                          >
                            <Trash2 size={16} className="text-slate-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {activeLessonId === lesson.id && activeLesson && (
                    <div className="px-4 pb-4 bg-slate-50 dark:bg-black/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Título da Aula</label>
                          <input
                            value={activeLesson.title}
                            onChange={e => setActiveLesson({ ...activeLesson, title: e.target.value })}
                            disabled={!canManageLesson(activeLesson, module.id)}
                            placeholder="Titulo"
                            className="w-full bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none disabled:opacity-60"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Posição na Grade</label>
                          <input
                            value={activeLesson.position ?? 0}
                            onChange={e => setActiveLesson({ ...activeLesson, position: Number(e.target.value) })}
                            disabled={!canManageLesson(activeLesson, module.id)}
                            type="number"
                            min={0}
                            placeholder="Posicao"
                            className="w-full bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none disabled:opacity-60"
                          />
                        </div>
                      </div>

                        <Button
                          onClick={() => canManageLesson(activeLesson, module.id) && onOpenContentEditor?.(activeLesson)}
                          disabled={!canManageLesson(activeLesson, module.id)}
                          className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 mb-3 h-auto py-4 disabled:grayscale disabled:opacity-50"
                        >
                          <Pencil className="mr-3" />
                          <div className="text-left flex-1">
                            <div className="font-black text-sm">Editar Conteúdo da Aula</div>
                            <div className="text-[10px] font-normal opacity-80 uppercase tracking-wider">
                              {activeLesson.content
                                ? `${activeLesson.content.length} caracteres • Clique para editar`
                                : 'Adicionar texto de apoio à aula'}
                            </div>
                          </div>
                          <ChevronRight />
                        </Button>

                      <div className="flex justify-end">
                        <Button
                          disabled={busy || !canManageLesson(activeLesson, module.id)}
                          variant="emerald"
                          onClick={handleSaveActiveLesson}
                        >
                          Salvar aula
                        </Button>
                      </div>

                      <div className="mt-3 bg-slate-100 dark:bg-white/5 rounded-xl p-4 text-center border border-dashed border-slate-300 dark:border-white/10">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          Materiais & Downloads <br />
                          <span className="text-indigo-500">Gerenciar no Editor</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                  );
                })}
              {lessons.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Nenhuma aula para este modulo.</div>}
            </div>
          </div>
        )}
      </div>
    );
  };
  const renderModuleList = (course: CourseRecord) => {
    const modules = getModules(course.id);
    const isExpanded = expandedCourseId === course.id;

    // Modo Grade
    if (moduleViewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map(m => (
            <div key={m.id} className="group rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1C1E23] p-5 hover:border-cyan-400/50 dark:hover:border-cyan-500/50 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-cyan-500/5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
                    <h5 className="text-sm font-black text-slate-800 dark:text-white truncate">{m.title}</h5>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Módulo {m.position ?? 0}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingModule({ ...m })}
                    title="Editar">
                    <Pencil size={14} className="text-slate-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-red-500"
                    onClick={() => handleDeleteModule(m.course_id, m.id)}
                    title="Excluir">
                    <Trash2 size={14} className="text-slate-400" />
                  </Button>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 border-0"
                onClick={() => {
                  setExpandedModuleId(expandedModuleId === m.id ? '' : m.id);
                  if (!getLessons(m.id).length) refreshLessons(m.id);
                }}
              >
                <Layers size={14} className="mr-2" />
                {expandedModuleId === m.id ? 'Ocultar Aulas' : 'Ver Aulas'}
              </Button>
            </div>
          ))}
          {modules.length === 0 && <div className="col-span-full p-12 text-center text-sm text-slate-400 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">{isExpanded ? 'Nenhum modulo cadastrado' : ''}</div>}
        </div>
      );
    }

    // Modo Minimalista
    if (moduleViewMode === 'minimal') {
      return (
        <div className="space-y-2">
          {modules.map(m => (
            <div
              key={m.id}
              onClick={() => {
                setExpandedModuleId(expandedModuleId === m.id ? '' : m.id);
                if (!getLessons(m.id).length) refreshLessons(m.id);
              }}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${expandedModuleId === m.id
                ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800'
                : 'bg-white dark:bg-[#1C1E23] border border-slate-200 dark:border-white/5 hover:border-cyan-300 dark:hover:border-cyan-700'
                }`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expandedModuleId === m.id ? 'bg-cyan-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                  }`}>
                  <Layers size={14} />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{m.title}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingModule({ ...m })} title="Editar">
                  <Pencil size={12} className="text-slate-400" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500" onClick={() => handleDeleteModule(m.course_id, m.id)} title="Excluir">
                  <Trash2 size={12} className="text-slate-400" />
                </Button>
              </div>
            </div>
          ))}
          {modules.length === 0 && <div className="p-6 text-center text-sm text-slate-400">{isExpanded ? 'Nenhum modulo' : ''}</div>}
        </div>
      );
    }

    // Modo Lista (padrão)
    return (
      <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1C1E23] overflow-hidden">
        {modules.map(m => (
          <div key={m.id} className="p-3">
            {renderLessonList(m)}
          </div>
        ))}
        {modules.length === 0 && <div className="p-6 text-center text-sm text-slate-400">{isExpanded ? 'Nenhum modulo' : ''}</div>}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-full transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2">
            Admin / <span className="text-slate-800 dark:text-white">Gestao de Conteudo</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Gerenciamento de Conteudo</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Crie e organize cursos, modulos e aulas.</p>
        </div>
        <div className="text-xs font-bold text-slate-400">{busy ? 'Sincronizando...' : 'Supabase conectado'}</div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-2xl flex items-center gap-2">
          <i className="fas fa-exclamation-circle"></i>
          <span className="font-bold">Erro:</span> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#1C1E23] border border-slate-200 dark:border-white/5 p-6 rounded-3xl flex items-center justify-between group hover:border-indigo-500/30 transition-all shadow-sm"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <span className="text-3xl font-black text-slate-800 dark:text-white">{stat.value}</span>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-indigo-50/70 dark:bg-indigo-900/10 border border-indigo-200/60 dark:border-indigo-500/20 rounded-3xl p-6 text-sm text-slate-700 dark:text-slate-200">
        <p className="font-black text-slate-800 dark:text-white mb-2">Como criar conteudo</p>
        <p className="text-slate-600 dark:text-slate-300">
          1) Crie um curso &gt; 2) Clique no card para abrir modulos &gt; 3) Crie modulo &gt; 4) Abra o modulo para criar aulas.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Cursos</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Gerencie seus cursos e conteúdos educativos.</p>
          </div>
          <div className="flex items-center gap-4">
            <ViewModeToggle current={courseViewMode} onChange={toggleCourseViewMode} label="Visualização" />
            <div className="w-px h-8 bg-slate-200 dark:bg-white/5"></div>
            {user.role === 'MASTER' && (
              <Button
                disabled={busy}
                onClick={() => setIsCreateCourseModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus size={16} /> Criar curso
              </Button>
            )}
          </div>
        </div>

        <div className={courseViewMode === 'grid' ? "p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "divide-y divide-slate-100 dark:divide-white/5"}>
          {courses.map(course => {
            const isExpanded = expandedCourseId === course.id;
            const modules = getModules(course.id);

            if (courseViewMode === 'grid') {
              return (
                <div
                  key={course.id}
                  className={cn(
                    "group relative bg-white dark:bg-[#1C1E23] border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-indigo-500/30 dark:hover:border-white/10 hover:shadow-xl hover:shadow-indigo-500/5",
                    isExpanded && "ring-2 ring-indigo-500/50 border-indigo-500/50"
                  )}
                >
                  <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-800/50">
                    {course.image_url ? (
                      <img src={course.image_url} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                        <GraduationCap size={48} />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {course.color_legend && (
                        <span
                          className="px-2 py-0.5 rounded-lg text-[10px] font-black text-white shadow-lg backdrop-blur-md"
                          style={{ backgroundColor: course.color || '#6366f1' }}
                        >
                          {course.color_legend}
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(user.role === 'MASTER' || course.instructor_id === user.id) && (
                        <>
                          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm"
                            onClick={(e) => { e.stopPropagation(); setEditingCourse({ ...course }); }}>
                            <Pencil size={14} className="text-slate-600 dark:text-slate-400" />
                          </Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg bg-red-500/90 backdrop-blur-sm"
                            onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}>
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white line-clamp-1 mb-1">{course.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[3rem] mb-4">
                      {course.description || 'Sem descrição cadastrada'}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Modulos</span>
                          <span className="text-base font-black text-slate-700 dark:text-slate-200">{modules.length}</span>
                        </div>
                        <div className="w-px h-6 bg-slate-100 dark:bg-white/10" />
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aulas</span>
                          <span className="text-base font-black text-slate-700 dark:text-slate-200">{modules.reduce((acc, m) => acc + (lessonsByModule[m.id]?.length || 0), 0)}</span>
                        </div>
                      </div>
                      <Button
                        variant={isExpanded ? "secondary" : "default"}
                        size="default"
                        className="rounded-xl font-black px-6"
                        onClick={() => {
                          const next = isExpanded ? '' : course.id;
                          setExpandedCourseId(next);
                          setExpandedModuleId('');
                          if (!modules.length) refreshModules(course.id);
                        }}
                      >
                        {isExpanded ? 'Recolher' : 'Gerenciar'}
                        <ChevronRight size={16} className={cn("ml-2 transition-transform", isExpanded && "rotate-90")} />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="absolute inset-0 z-10 bg-white/95 dark:bg-[#1C1E23]/95 backdrop-blur-md overflow-y-auto p-5 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                          <Layers size={16} className="text-indigo-500" /> Modulos
                        </h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setExpandedCourseId('')}
                        >
                          <List size={16} />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {(user.role === 'MASTER' || course.instructor_id === user.id) && (
                          <Button
                            variant="outline"
                            className="w-full border-dashed border-2 py-6 flex flex-col items-center gap-1 group"
                            onClick={() => setActiveCourseIdForModuleCreation(course.id)}
                          >
                            <Plus size={20} className="group-hover:scale-110 transition-transform text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Novo Modulo</span>
                          </Button>
                        )}
                        {renderModuleList(course)}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            if (courseViewMode === 'minimal') {
              return (
                <div key={course.id} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                  <div
                    onClick={() => {
                      const next = isExpanded ? '' : course.id;
                      setExpandedCourseId(next);
                      setExpandedModuleId('');
                      if (!modules.length) refreshModules(course.id);
                    }}
                    style={isExpanded ? { backgroundColor: `${course.color || '#6366f1'}1a`, borderLeft: `4px solid ${course.color || '#6366f1'}` } : {}}
                    className={cn(
                      "flex items-center justify-between gap-4 p-4 cursor-pointer transition-all border-l-4 border-transparent",
                      !isExpanded && "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 flex-shrink-0 overflow-hidden">
                        {course.image_url ? (
                          <img src={course.image_url} className="w-full h-full object-cover" />
                        ) : <GraduationCap size={24} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white truncate">{course.title}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          {modules.length} Modulos • {modules.reduce((acc, m) => acc + (lessonsByModule[m.id]?.length || 0), 0)} Aulas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {(user.role === 'MASTER' || course.instructor_id === user.id) && (
                        <>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => setEditingCourse({ ...course })}>
                            <Pencil size={14} className="text-slate-400" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-500/10" onClick={() => handleDeleteCourse(course.id)}>
                            <Trash2 size={14} className="text-red-400" />
                          </Button>
                        </>
                      )}
                      <div className={cn("w-8 h-8 flex items-center justify-center transition-transform duration-300", isExpanded && "rotate-90 text-indigo-500")}>
                        <ChevronRight size={18} className="text-slate-300" />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-6 bg-slate-50/70 dark:bg-slate-950/20 animate-in slide-in-from-top-2 duration-300">
                      <div className="pt-5 flex items-center justify-between gap-4 mb-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modulos</h4>
                        {(user.role === 'MASTER' || course.instructor_id === user.id) && (
                          <Button
                            disabled={busy}
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveCourseIdForModuleCreation(course.id)}
                            className="h-7 text-[10px] font-black uppercase tracking-widest gap-2 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20"
                          >
                            <Plus size={12} /> Novo Modulo
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {renderModuleList(course)}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // Modo Lista (Padrão)
            return (
              <div key={course.id} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                <div
                  className={cn(
                    "p-6 flex items-start justify-between gap-6 cursor-pointer transition-all",
                    isExpanded ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.01]'
                  )}
                  onClick={() => {
                    const next = isExpanded ? '' : course.id;
                    setExpandedCourseId(next);
                    setExpandedModuleId('');
                    if (!modules.length) refreshModules(course.id);
                  }}
                >
                  <div className="flex gap-6 flex-1 min-w-0">
                    <div className="w-24 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden shadow-sm">
                      {course.image_url ? (
                        <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300"><GraduationCap size={24} /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        {course.color && (
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
                        )}
                        <h3 className="text-base font-black text-slate-800 dark:text-white truncate">
                          {course.title}
                        </h3>
                        {course.color_legend && (
                          <span
                            className="px-2 py-0.5 rounded-lg text-[10px] font-black text-white shadow-sm"
                            style={{ backgroundColor: course.color || '#6366f1' }}
                          >
                            {course.color_legend}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate">
                        {course.description || 'SEM DESCRICAO'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2">ID: {course.id}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(user.role === 'MASTER' || course.instructor_id === user.id) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => {
                              e.stopPropagation();
                              setEditingCourse({ ...course });
                            }}
                            title="Editar curso"
                          >
                            <Pencil size={18} className="text-slate-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteCourse(course.id);
                            }}
                            title="Excluir curso"
                          >
                            <Trash2 size={18} className="text-slate-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-6 bg-slate-50/70 dark:bg-slate-950/20">
                    <div className="pt-5">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <h4 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Modulos</h4>
                        <div className="flex items-center gap-3">
                          <ViewModeToggle current={moduleViewMode} onChange={toggleModuleViewMode} label="Visualização" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{modules.length}</span>
                          {(user.role === 'MASTER' || course.instructor_id === user.id) && (
                            <Button
                              disabled={busy}
                              variant="cyan"
                              size="sm"
                              onClick={() => setActiveCourseIdForModuleCreation(course.id)}
                              className="flex items-center gap-2"
                            >
                              <Plus size={14} /> Criar modulo
                            </Button>
                          )}
                        </div>
                      </div>

                      {renderModuleList(course)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {courses.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Nenhum curso criado ainda.</div>}
        </div>
      </div>

      {(editingCourse || editingModule || editingLesson) && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-[95%] md:max-w-2xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-lg font-black text-slate-800 dark:text-white">Editar</h4>
              <button
                className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => {
                  setEditingCourse(null);
                  setEditingModule(null);
                  setEditingLesson(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editingCourse && (
                <>
                  <input
                    value={editingCourse.title}
                    onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })}
                    placeholder="Titulo"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Imagem de Capa</label>

                    {/* Preview da imagem atual */}
                    {editingCourse.image_url && (
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                        <img src={editingCourse.image_url} alt="Capa atual" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditCourseFileSelect}
                        className="hidden"
                        id="edit-course-cover-upload"
                        disabled={isUploading}
                      />
                      <label
                        htmlFor="edit-course-cover-upload"
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer ${isUploading
                          ? 'opacity-50 cursor-not-allowed border-slate-300'
                          : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-slate-600 dark:text-slate-400'
                          }`}
                      >
                        {isUploading ? (
                          <>
                            <i className="fas fa-circle-notch animate-spin"></i>
                            <span className="text-sm font-medium">Enviando...</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-cloud-upload-alt"></i>
                            <span className="text-sm font-medium">Fazer Upload</span>
                          </>
                        )}
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">OU</span>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                    </div>

                    <input
                      value={editingCourse.image_url || ''}
                      onChange={e => setEditingCourse({ ...editingCourse, image_url: e.target.value })}
                      placeholder="Cole a URL da imagem aqui"
                      className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                      disabled={isUploading}
                    />
                  </div>
                  <input
                    value={editingCourse.description || ''}
                    onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                    placeholder="Descricao"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cor</label>
                      <div className="flex flex-wrap gap-2">
                        {['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#14b8a6', '#ec4899', '#14b8a6'].map(c => (
                          <button
                            key={c}
                            onClick={() => setEditingCourse({ ...editingCourse, color: c })}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${editingCourse.color === c ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Legenda</label>
                      <input
                        value={editingCourse.color_legend || ''}
                        onChange={e => setEditingCourse({ ...editingCourse, color_legend: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 text-sm outline-none"
                        placeholder="Ex: Exatas"
                      />
                    </div>
                  </div>
                </>
              )}

              {editingModule && (
                <>
                  <input
                    value={editingModule.title}
                    onChange={e => setEditingModule({ ...editingModule, title: e.target.value })}
                    placeholder="Titulo"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                  <input
                    value={editingModule.position ?? 0}
                    onChange={e => setEditingModule({ ...editingModule, position: Number(e.target.value) })}
                    type="number"
                    min={0}
                    placeholder="Posicao"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                </>
              )}

              {editingLesson && (
                <>
                  <input
                    value={editingLesson.title}
                    onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })}
                    placeholder="Titulo"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                  <input
                    value={editingLesson.video_url || ''}
                    onChange={e => setEditingLesson({ ...editingLesson, video_url: e.target.value })}
                    placeholder="URL do video"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                  <textarea
                    value={editingLesson.content || ''}
                    onChange={e => setEditingLesson({ ...editingLesson, content: e.target.value })}
                    placeholder="Texto da aula"
                    rows={5}
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none resize-y"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={editingLesson.duration_seconds ?? 0}
                      onChange={e => setEditingLesson({ ...editingLesson, duration_seconds: Number(e.target.value) })}
                      type="number"
                      min={0}
                      placeholder="Duracao (s)"
                      className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                    />
                    <input
                      value={editingLesson.position ?? 0}
                      onChange={e => setEditingLesson({ ...editingLesson, position: Number(e.target.value) })}
                      type="number"
                      min={0}
                      placeholder="Posicao"
                      className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingCourse(null);
                  setEditingModule(null);
                  setEditingLesson(null);
                }}
                className="px-4 py-3 rounded-xl font-black text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
              >
                Cancelar
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  if (editingCourse) handleUpdateCourse();
                  if (editingModule) handleUpdateModule();
                  if (editingLesson) handleUpdateLesson();
                }}
                className="px-4 py-3 rounded-xl font-black text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      <CreateCourseModal
        isOpen={isCreateCourseModalOpen}
        onClose={() => setIsCreateCourseModalOpen(false)}
        onConfirm={handleCreateCourse}
        isLoading={busy}
      />
      <CreateModuleModal
        isOpen={!!activeCourseIdForModuleCreation}
        onClose={() => setActiveCourseIdForModuleCreation(null)}
        onConfirm={async (title, position) => {
          if (activeCourseIdForModuleCreation) {
            await handleCreateModule(activeCourseIdForModuleCreation, title, position);
          }
        }}
        isLoading={busy}
        nextPosition={activeCourseIdForModuleCreation ? (modulesByCourse[activeCourseIdForModuleCreation]?.length || 0) + 1 : 1}
      />
      <CreateLessonModal
        isOpen={!!activeModuleIdForLessonCreation}
        onClose={() => setActiveModuleIdForLessonCreation(null)}
        onConfirm={async (data) => {
          if (activeModuleIdForLessonCreation) {
            await handleCreateLesson(activeModuleIdForLessonCreation, data);
          }
        }}
        isLoading={busy}
        nextPosition={activeModuleIdForLessonCreation ? (lessonsByModule[activeModuleIdForLessonCreation]?.length || 0) + 1 : 1}
      />
      {movingLesson && (
        <MoveLessonModal
          lesson={movingLesson}
          currentModuleTitle={
            Object.values(modulesByCourse).flat().find(m => m.id === movingLesson.module_id)?.title || 'Módulo desconhecido'
          }
          availableModules={
            (() => {
              const sourceModule = Object.values(modulesByCourse).flat().find(m => m.id === movingLesson.module_id);
              if (!sourceModule) return [];
              return modulesByCourse[sourceModule.course_id] || [];
            })()
          }
          busy={busy}
          onConfirm={(targetModuleId) => handleMoveLesson(movingLesson.id, movingLesson.module_id, targetModuleId)}
          onClose={() => setMovingLesson(null)}
        />
      )}
    </div>
  );
};

export default AdminContentManagement;


