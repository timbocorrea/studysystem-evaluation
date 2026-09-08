import { z } from 'zod';

/**
 * Schema de validação para criação/edição de curso
 */
export const courseSchema = z.object({
    title: z
        .string()
        .min(3, 'Título deve ter no mínimo 3 caracteres')
        .max(200, 'Título muito longo'),
    description: z
        .string()
        .min(10, 'Descrição deve ter no mínimo 10 caracteres')
        .max(1000, 'Descrição muito longa')
        .optional()
        .or(z.literal(''))
});

/**
 * Tipo TypeScript inferido do schema
 */
export type CourseFormData = z.infer<typeof courseSchema>;
