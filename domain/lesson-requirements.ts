/**
 * Lesson Progress Requirements
 * Domain entity para requisitos de progresso configuráveis por aula
 */

export interface ILessonProgressRequirements {
    lessonId: string;
    videoRequiredPercent: number;
    textBlocksRequiredPercent: number;
    requiredPdfs: string[];
    requiredAudios: string[];
    requiredMaterials: string[];
    minEvaluationQuestions?: number; // Minimum questions for evaluation mode to earn XP
    evaluationPassingScore?: number; // Passing score percentage for evaluation mode
}

export class LessonProgressRequirements {
    constructor(
        public readonly lessonId: string,
        public readonly videoRequiredPercent: number = 90,
        public readonly textBlocksRequiredPercent: number = 0,
        public readonly requiredPdfs: string[] = [],
        public readonly requiredAudios: string[] = [],
        public readonly requiredMaterials: string[] = [],
        public readonly minEvaluationQuestions: number = 10, // Default: 10 questões mínimas
        public readonly evaluationPassingScore: number = 70 // Default: 70% para aprovação
    ) {
        // Validações
        if (videoRequiredPercent < 0 || videoRequiredPercent > 100) {
            throw new Error('Video percent must be between 0 and 100');
        }
        if (textBlocksRequiredPercent < 0 || textBlocksRequiredPercent > 100) {
            throw new Error('Text blocks percent must be between 0 and 100');
        }
        if (minEvaluationQuestions < 1) {
            throw new Error('Min evaluation questions must be at least 1');
        }
        if (evaluationPassingScore < 0 || evaluationPassingScore > 100) {
            throw new Error('Evaluation passing score must be between 0 and 100');
        }
    }

    /**
     * Verifica se o progresso do aluno atende aos requisitos
     */
    public meetsRequirements(
        videoProgress: number,
        textBlocksRead: string[],
        totalBlocks: number,
        pdfsViewed: string[],
        audiosPlayed: string[]
    ): { meets: boolean; missing: MissingRequirement[] } {
        const missing: MissingRequirement[] = [];

        // Verificar vídeo
        if (videoProgress < this.videoRequiredPercent) {
            missing.push({
                type: 'video',
                message: `Vídeo: ${videoProgress.toFixed(0)}% / ${this.videoRequiredPercent}% necessário`,
                current: videoProgress,
                required: this.videoRequiredPercent
            });
        }

        // Verificar blocos de texto
        const textPercent = totalBlocks > 0 ? (textBlocksRead.length / totalBlocks) * 100 : 100;
        if (textPercent < this.textBlocksRequiredPercent) {
            missing.push({
                type: 'text_blocks',
                message: `Blocos: ${textBlocksRead.length}/${totalBlocks} (${textPercent.toFixed(0)}% / ${this.textBlocksRequiredPercent}% necessário)`,
                current: textPercent,
                required: this.textBlocksRequiredPercent
            });
        }

        // Verificar PDFs obrigatórios
        const missingPdfs = this.requiredPdfs.filter(pdfId => !pdfsViewed.includes(pdfId));
        if (missingPdfs.length > 0) {
            missing.push({
                type: 'pdfs',
                message: `${missingPdfs.length} PDF(s) obrigatório(s) não visualizado(s)`,
                current: pdfsViewed.length,
                required: this.requiredPdfs.length
            });
        }

        // Verificar áudios obrigatórios
        const missingAudios = this.requiredAudios.filter(audioId => !audiosPlayed.includes(audioId));
        if (missingAudios.length > 0) {
            missing.push({
                type: 'audios',
                message: `${missingAudios.length} áudio(s) obrigatório(s) não reproduzido(s)`,
                current: audiosPlayed.length,
                required: this.requiredAudios.length
            });
        }

        return {
            meets: missing.length === 0,
            missing
        };
    }

    /**
     * Retorna descrição dos requisitos para exibição ao aluno
     */
    public getRequirementsDescription(): string[] {
        const desc: string[] = [];

        if (this.videoRequiredPercent > 0) {
            desc.push(`Assistir ${this.videoRequiredPercent}% do vídeo`);
        }

        if (this.textBlocksRequiredPercent > 0) {
            desc.push(`Ler ${this.textBlocksRequiredPercent}% dos blocos de texto`);
        }

        if (this.requiredPdfs.length > 0) {
            desc.push(`Visualizar ${this.requiredPdfs.length} PDF(s) obrigatório(s)`);
        }

        if (this.requiredAudios.length > 0) {
            desc.push(`Reproduzir ${this.requiredAudios.length} áudio(s) obrigatório(s)`);
        }

        return desc;
    }
}

export interface MissingRequirement {
    type: 'video' | 'text_blocks' | 'pdfs' | 'audios';
    message: string;
    current: number;
    required: number;
}
