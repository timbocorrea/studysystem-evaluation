import { supabaseClient as supabase } from '../services/Dependencies';
import { useBuddyStore, type BuddyThreadScope, type BuddyThreadScopeMode } from '../stores/useBuddyStore';
import { getStudentGoogleAiApiKey, STUDENT_GOOGLE_AI_DEFAULT_MODEL } from '../utils/studentGoogleAiApiKey';

export type BuddyScopeMode = BuddyThreadScopeMode;

interface UseBuddyClientProps {
    userId: string;
    systemContext?: string;
    currentContext?: string;
    userName?: string;
    threadTitle?: string;
    courseId?: string;
    lessonId?: string;
    buddyScopeMode?: BuddyScopeMode;
}

export const useBuddyClient = ({
    userId,
    systemContext = '',
    currentContext = '',
    userName = 'Estudante',
    threadTitle,
    courseId,
    lessonId,
    buddyScopeMode = lessonId ? 'lesson_scoped' : courseId ? 'course_scoped' : 'global_student_scoped'
}: UseBuddyClientProps) => {
    const { threadsByUser, activeThreadIdByUser, addMessage, setLoading } = useBuddyStore();

    const buddyContextKey = `${buddyScopeMode}:${courseId ?? 'no-course'}:${lessonId ?? 'no-lesson'}`;

    const threadScope: BuddyThreadScope = {
        contextKey: buddyContextKey,
        buddyScopeMode,
        ...(courseId ? { courseId } : {}),
        ...(lessonId ? { lessonId } : {})
    };

    const threads = threadsByUser[userId] || [];
    const activeThreadId = activeThreadIdByUser[userId];
    const activeThread = threads.find(t => t.id === activeThreadId && t.scope?.contextKey === buddyContextKey);
    const history = activeThread?.messages || [];

    const sendMessage = async (text: string, image?: string | null) => {
        if (!text.trim() && !image) return;

        const displayMessage = image ?
            (text ? `${text}\n[Imagem enviada]` : '[Imagem enviada]')
            : text;

        if (userId) {
            addMessage(userId, { role: 'user', text: displayMessage }, threadTitle, threadScope);
        }

        setLoading(true);

        const MAX_CONTEXT_LENGTH = 15000;
        const MAX_HISTORY_MESSAGES = 10;

        const truncatedContext = currentContext && currentContext.length > MAX_CONTEXT_LENGTH
            ? currentContext.substring(0, MAX_CONTEXT_LENGTH) + "\n...[conteúdo truncado]..."
            : currentContext;

        const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);

        const fullContext = `
      Contexto do Sistema: ${systemContext}
      Modo de escopo do Buddy: ${buddyScopeMode}
      Chave do contexto ativo: ${buddyContextKey}
      CourseId ativo: ${courseId ?? 'sem curso ativo'}
      LessonId ativo: ${lessonId ?? 'sem aula ativa'}
      ${truncatedContext ? `Conteúdo da Aula Atual: ${truncatedContext}` : ''}
    `;

        const scopeInstruction = buddyScopeMode === 'lesson_scoped'
            ? `
      ESCOPO DA RESPOSTA — AULA/MATÉRIA ATUAL:
      1. Responda somente com base no conteúdo da aula/matéria atual em tela, no contexto selecionado da mesma aula e no RAG autorizado para o mesmo lessonId.
      2. É proibido usar material de outra aula, outra matéria, outro curso, histórico anterior incompatível ou conhecimento externo para completar lacunas.
      3. Se a resposta não estiver no material disponível da aula/matéria atual em tela, responda: "Não encontrei essa informação no material disponível desta aula/curso."
      `
            : buddyScopeMode === 'course_scoped'
                ? `
      ESCOPO DA RESPOSTA — CURSO:
      1. Responda somente com base no curso ativo, nos materiais autorizados, no RAG autorizado ou no contexto explicitamente informado pelo aluno.
      2. Se não houver material suficiente para responder, oriente o aluno a abrir a aula correspondente ou informe que não encontrou essa informação no material disponível.
      3. Não atue como IA geral aberta.
      `
                : `
      ESCOPO DA RESPOSTA — BUDDY GLOBAL:
      1. Você está fora de uma aula específica. Não atue como IA geral aberta.
      2. Ajude somente com uso do StudySystem, organização de estudos dentro da plataforma, localização/retomada de conteúdos e dúvidas relacionadas aos cursos/aulas acessíveis ao aluno.
      3. Se a pergunta exigir conhecimento externo, genérico ou não vinculado ao StudySystem, responda: "Posso ajudar com conteúdos dos seus cursos no StudySystem. Abra uma aula ou informe o curso/matéria para eu responder com base no material disponível."
      `;

        const systemInstruction = `
      Você é o 'Study Buddy', um assistente inteligente integrado à plataforma de ensino.
      Seu objetivo é ajudar o usuário ${userName} dentro do escopo educacional autorizado do StudySystem.
      
      Diretrizes:
      1. Responda de forma didática e DIRETA. SEMPRE comece respondendo à pergunta imediatamente quando ela estiver dentro do escopo.
      2. PROIBIDO: Não use frases de introdução como "Olá", "Que bom que perguntou", "Entendo sua dúvida", etc. Corte todo o "fluff".
      3. Se a pergunta for sobre o sistema, guie o usuário com base no contexto do sistema.
      4. Responda em português do Brasil.
      5. Mantenha a resposta CONCISA (máx 3-4 parágrafos). Priorize a informação essencial.
      6. VISÃO: Analise imagens se fornecidas, desde que a solicitação esteja dentro do escopo educacional autorizado.
      7. ACESSIBILIDADE: Use aspas duplas ("") em vez de asteriscos para destaque.

      ${scopeInstruction}

      CRÍTICO — FORMATO DA RESPOSTA:
      1. Se o usuário pedir "responda somente X", responda apenas X, sem explicações, sem saudação e sem sugestões.
      2. Se o usuário pedir "sem sugestões", "sem perguntas adicionais" ou formato fechado, não inclua bloco de sugestões.
      3. Se o usuário pedir quantidade exata de frases, tópicos ou palavras, respeite exatamente essa restrição.
      4. Só inclua sugestões de continuidade quando o usuário não tiver limitado o formato da resposta.
      5. Quando incluir sugestões, mantenha no máximo uma pergunta curta ao final.
    `;

        try {
            const studentApiKey = getStudentGoogleAiApiKey();
            const ragScope = {
                ...(courseId ? { courseId } : {}),
                ...(lessonId ? { lessonId } : {})
            };

            const { data, error } = await supabase.functions.invoke('ask-ai', {
                body: {
                    messages: [
                        { role: 'system', text: `${systemInstruction}\nContexto: ${fullContext}` },
                        ...recentHistory.map(m => ({ role: m.role, text: m.text })),
                        { role: 'user', text: text || 'Analise a imagem.', image: image }
                    ],
                    model: STUDENT_GOOGLE_AI_DEFAULT_MODEL,
                    buddyScopeMode,
                    ...(Object.keys(ragScope).length > 0 ? { ragScope } : {}),
                    ...(studentApiKey ? { apiKey: studentApiKey } : {})
                }
            });

            if (error) {
                let remoteError = error.message;
                let remoteCode = '';

                try {
                    if (error instanceof Error && (error as any).context) {
                        const body = await (error as any).context.json();
                        if (body.error) remoteError = body.error;
                        if (body.code) remoteCode = body.code;
                    }
                } catch (e) {
                    /* ignore parse error */
                }

                const normalizedError = new Error(remoteError) as Error & { code?: string };
                normalizedError.code = remoteCode;
                throw normalizedError;
            }

            const aiResponse = data.response;

            const actionMatch = aiResponse.match(/\[\[RESUME:(.+?):(.+?)\]\]/);
            let action: { label: string; courseId: string; lessonId: string } | undefined = undefined;

            let cleanResponse = aiResponse;

            if (actionMatch) {
                cleanResponse = aiResponse.replace(actionMatch[0], '');
                action = {
                    label: 'Retomar aula 🚀',
                    courseId: actionMatch[1],
                    lessonId: actionMatch[2]
                };
            }

            if (userId) {
                addMessage(userId, { role: 'ai', text: cleanResponse, action }, threadTitle, threadScope);
            }

        } catch (error: any) {
            let errorMessage = error.message || "Erro desconhecido ao falar com a IA.";
            const errorCode = error.code || '';

            const isSharedLimitError = errorCode === 'BUDDY_SHARED_LIMIT_REACHED';
            const isStudentKeyRequired = errorCode === 'STUDENT_KEY_REQUIRED';
            const isSharedUnavailable = errorCode === 'BUDDY_SHARED_PROVIDER_UNAVAILABLE';
            const isQuotaError = errorCode === 'LIMITE_GEMINI_ATINGIDO' || errorCode === 'LIMITE_GROQ_ATINGIDO' || errorMessage.includes('Quota exceeded') || errorMessage.includes('429') || errorMessage.includes('Too Many Requests');
            const isAuthError = errorCode === 'NAO_AUTORIZADO_CHAVE_GEMINI' || errorCode === 'NAO_AUTORIZADO_CHAVE_GROQ' || errorCode === 'NAO_AUTORIZADO_CHAVE_OPENAI';
            const isModelError = errorCode === 'MODELO_GEMINI_INDISPONIVEL' || errorCode === 'MODELO_GROQ_INDISPONIVEL' || errorCode === 'MODELO_OPENAI_INDISPONIVEL';
            const isUnavailableError = errorCode === 'GEMINI_INDISPONIVEL' || errorCode === 'GROQ_INDISPONIVEL' || errorCode === 'OPENAI_INDISPONIVEL';

            if (userId) {
                if (isSharedLimitError) {
                    addMessage(userId, {
                        role: 'ai',
                        text: `⏳ **Limite gratuito compartilhado atingido**\n\nO limite gratuito compartilhado do Buddy foi atingido. Para continuar agora, adicione sua chave de API no Perfil ou tente novamente mais tarde.`
                    }, threadTitle, threadScope);
                } else if (isStudentKeyRequired || isSharedUnavailable) {
                    addMessage(userId, {
                        role: 'ai',
                        text: `**Buddy gratuito indisponível no momento**\n\n${errorMessage}\n\nA chave própria é opcional, mas pode ser usada para continuar quando o limite compartilhado acabar.`
                    }, threadTitle, threadScope);
                } else if (isQuotaError) {
                    addMessage(userId, {
                        role: 'ai',
                        text: `⏳ **Limite de uso atingido**\n\n${errorMessage}\n\nSe estiver usando uma chave própria, aguarde a liberação da cota ou tente outra chave no Perfil.`
                    }, threadTitle, threadScope);
                } else if (isAuthError || isModelError || isUnavailableError) {
                    addMessage(userId, {
                        role: 'ai',
                        text: `**O Buddy encontrou um problema:**\n${errorMessage}`
                    }, threadTitle, threadScope);
                } else {
                    addMessage(userId, {
                        role: 'ai',
                        text: `❌ **O Buddy encontrou um problema:**\n${errorMessage}`
                    }, threadTitle, threadScope);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    return { sendMessage, history };
};
