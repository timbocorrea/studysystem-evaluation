import { SupabaseClient } from '@supabase/supabase-js';
import {
  getStudentGoogleAiApiKey,
  STUDENT_GOOGLE_AI_DEFAULT_MODEL
} from '../utils/studentGoogleAiApiKey';

export class AIService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Embeddings must be generated in a server-side routine. Keeping this method
   * as a guarded API prevents accidentally reintroducing browser-side AI keys.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    void text;
    throw new Error('A sincronizacao RAG deve ser executada no backend autenticado. Chaves institucionais nao rodam no navegador.');
  }

  /**
   * RAG sync is intentionally blocked in the browser because it would require
   * model credentials and write access to lesson_embeddings.
   */
  async syncLessonEmbeddings(lessonId: string, content?: string, title?: string): Promise<void> {
    void lessonId;
    void content;
    void title;
    throw new Error('A sincronizacao RAG foi bloqueada no navegador. Use uma rotina server-side autenticada para gerar embeddings.');
  }

  /**
   * Generates a quiz through the authenticated Edge Function using the local
   * student/device key when configured. No institutional key is bundled.
   */
  async generateQuizFromLesson(lessonId: string, numQuestions: number = 5): Promise<any> {
    const { data } = await this.supabase
      .from('lessons')
      .select('title, rich_text_content')
      .eq('id', lessonId)
      .single();

    if (!data || !data.rich_text_content) {
      throw new Error('Conteudo da aula nao encontrado para gerar quiz.');
    }

    const studentApiKey = getStudentGoogleAiApiKey();
    if (!studentApiKey) {
      throw new Error('Configure sua chave Google AI no Perfil para gerar quiz com IA.');
    }

    const prompt = `
Voce e um professor criando um quiz de validacao de conhecimento sobre a aula "${data.title}".
Com base no conteudo abaixo, gere um quiz com ${numQuestions} questoes de multipla escolha.
Retorne APENAS um JSON valido seguindo este formato EXATO:
{
  "title": "Quiz sobre a aula ${data.title}",
  "description": "Teste rapido sobre os conceitos apresentados.",
  "questions": [
    {
      "questionText": "Texto da pergunta",
      "options": [
        {"optionText": "Opcao 1", "isCorrect": true},
        {"optionText": "Opcao 2", "isCorrect": false},
        {"optionText": "Opcao 3", "isCorrect": false},
        {"optionText": "Opcao 4", "isCorrect": false}
      ]
    }
  ]
}

Conteudo:
${data.rich_text_content}
    `;

    const { data: aiData, error } = await this.supabase.functions.invoke('ask-ai', {
      body: {
        model: STUDENT_GOOGLE_AI_DEFAULT_MODEL,
        messages: [{ role: 'user', text: prompt }],
        apiKey: studentApiKey,
        ragScope: { lessonId }
      }
    });

    if (error || !aiData?.response) {
      throw new Error('Falha ao gerar quiz estruturado.');
    }

    try {
      const jsonStr = String(aiData.response).replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch {
      throw new Error('Falha ao gerar quiz estruturado.');
    }
  }

  /**
   * Generates an optional Buddy recommendation through the Edge Function.
   */
  async analyzeQuizPerformance(
    lessonTitle: string,
    wrongAnswers: Array<{ question: string; userAnswer: string; correctAnswer: string }>
  ): Promise<string> {
    const studentApiKey = getStudentGoogleAiApiKey();
    if (!studentApiKey) {
      return 'Configure sua chave Google AI no Perfil para receber uma recomendacao personalizada do Buddy.';
    }

    const errorsContext = wrongAnswers.map(w =>
      `- Pergunta: ${w.question}\n  Resposta do Aluno: ${w.userAnswer}\n  Resposta Correta: ${w.correctAnswer}`
    ).join('\n\n');

    const prompt = `
Voce e o "Buddy", um tutor virtual encorajador e especialista.
O aluno acabou de terminar o quiz da aula "${lessonTitle}" e errou algumas questoes.

Com base nestes erros, gere um resumo amigavel, direto e em portugues do Brasil explicando brevemente os conceitos que o aluno se confundiu.
Nao seja punitivo. Aja como um mentor. Sugira que ele revise esses conceitos.
Mantenha a resposta curta (maximo 3 paragrafos) usando markdown simples.

Erros do aluno:
${errorsContext}
    `;

    const { data, error } = await this.supabase.functions.invoke('ask-ai', {
      body: {
        model: STUDENT_GOOGLE_AI_DEFAULT_MODEL,
        messages: [{ role: 'user', text: prompt }],
        apiKey: studentApiKey
      }
    });

    if (error || !data?.response) {
      return 'Continue estudando! Nao conseguimos gerar a recomendacao agora.';
    }

    return data.response;
  }
}
