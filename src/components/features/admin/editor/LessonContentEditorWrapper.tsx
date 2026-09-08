import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ModernLoader } from '@/components/ModernLoader';
import LessonContentEditorPage from '@/components/LessonContentEditorPage';
import { AdminService } from '@/services/AdminService';
import { LessonRecord } from '@/domain/admin';

interface LessonContentEditorWrapperProps {
  adminService: AdminService;
}

const LessonContentEditorWrapper: React.FC<LessonContentEditorWrapperProps> = ({ adminService }) => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (lessonId) {
      setLoading(true);
      
      const checkAccess = async () => {
        try {
          const [lessonData, hasAccess] = await Promise.all([
            adminService.getLesson(lessonId),
            adminService.canEditLesson(lessonId)
          ]);
          setLesson(lessonData);
          setIsAuthorized(hasAccess);
        } catch (err) {
          console.error(err);
          toast.error("Erro ao verificar permissões da aula.");
          navigate('/admin/content');
        } finally {
          setLoading(false);
        }
      };

      checkAccess();
    }
  }, [lessonId, adminService, navigate]);

  if (loading) return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white dark:bg-[#0a0e14]">
      <ModernLoader message="Verificando permissões..." />
    </div>
  );

  if (isAuthorized === false) return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white dark:bg-[#0a0e14]">
      <div className="text-center p-8 bg-red-500/10 rounded-2xl border border-red-500/20 max-w-sm">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-user-lock text-3xl text-red-500"></i>
        </div>
        <h2 className="text-xl font-black text-white mb-2">Acesso Negado</h2>
        <p className="text-sm text-slate-400 mb-6 font-medium">Você não tem permissão para editar esta aula específica. Entre em contato com o Master para solicitar acesso.</p>
        <button 
          onClick={() => navigate('/admin/content')}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all text-xs"
        >
          Voltar para Gestão
        </button>
      </div>
    </div>
  );

  if (!lesson) return <div className="p-8 text-slate-500">Aula não encontrada.</div>;

  return (
    <div className="absolute inset-0 z-50 bg-white dark:bg-[#0a0e14] overflow-y-auto">
      <LessonContentEditorPage
        lesson={lesson}
        onSave={async (content, metadata: any) => {
          await adminService.updateLesson(lesson.id, {
            content: content,
            title: metadata?.title,
            videoUrl: metadata?.video_url,
            videoUrls: metadata?.video_urls,
            audioUrl: metadata?.audio_url,
            imageUrl: metadata?.image_url,
            durationSeconds: metadata?.duration_seconds,
            position: metadata?.position,
            contentBlocks: metadata?.content_blocks
          });
        }}
        onCancel={() => navigate('/admin/content')}
      />
    </div>
  );
};

export default LessonContentEditorWrapper;
