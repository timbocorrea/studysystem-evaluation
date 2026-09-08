import { z } from 'zod';

/**
 * Schema de validação para criação/edição de aula
 */
export const lessonSchema = z.object({
    title: z
        .string()
        .min(3, 'Título deve ter no mínimo 3 caracteres')
        .max(200, 'Título muito longo'),
    content: z
        .string()
        .max(5000, 'Conteúdo muito longo')
        .optional()
        .or(z.literal('')),
    videoUrl: z
        .string()
        .url('URL de vídeo inválida')
        .optional()
        .or(z.literal('')),
    audioUrl: z
        .string()
        .url('URL de áudio inválida')
        .optional()
        .or(z.literal('')),
    imageUrl: z
        .string()
        .url('URL de imagem inválida')
        .optional()
        .or(z.literal('')),
    durationSeconds: z
        .number()
        .int('Duração deve ser um número inteiro')
        .min(0, 'Duração não pode ser negativa')
        .max(86400, 'Duração não pode exceder 24 horas')
        .optional(),
    position: z
        .number()
        .int('Posição deve ser um número inteiro')
        .min(0, 'Posição não pode ser negativa')
        .optional(),
    contentBlocks: z.array(z.object({
        id: z.string(),
        text: z.string().min(1, 'Texto do bloco não pode ser vazio'),
        audioUrl: z.string().url('URL de áudio inválida').optional().or(z.literal('')),
        spacing: z.number().int('Espacamento deve ser um numero inteiro').min(0).optional()
    })).optional()
});

/**
 * Schema de validação para recurso de aula
 */
export const lessonResourceSchema = z.object({
    title: z
        .string()
        .min(2, 'Título deve ter no mínimo 2 caracteres')
        .max(200, 'Título muito longo'),
    resourceType: z.enum(['PDF', 'AUDIO', 'IMAGE', 'LINK', 'FILE']),
    url: z
        .string()
        .url('URL do recurso inválida'),
    position: z
        .number()
        .int('Posição deve ser um número inteiro')
        .min(0, 'Posição não pode ser negativa')
        .optional()
});

/**
 * Tipos TypeScript inferidos dos schemas
 */
export type LessonFormData = z.infer<typeof lessonSchema>;
export type LessonResourceFormData = z.infer<typeof lessonResourceSchema>;
