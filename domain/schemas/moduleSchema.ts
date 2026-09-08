import { z } from 'zod';

/**
 * Schema de validação para criação/edição de módulo
 */
export const moduleSchema = z.object({
    title: z
        .string()
        .min(3, 'Título deve ter no mínimo 3 caracteres')
        .max(200, 'Título muito longo'),
    position: z
        .number()
        .int('Posição deve ser um número inteiro')
        .min(0, 'Posição não pode ser negativa')
        .optional()
});

/**
 * Tipo TypeScript inferido do schema
 */
export type ModuleFormData = z.infer<typeof moduleSchema>;
