import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Buddy scope control prompt policy', () => {
  it('frontend sends explicit Buddy scope modes to ask-ai', () => {
    const client = readProjectFile('hooks/useBuddyClient.ts');
    const fullPage = readProjectFile('components/BuddyFullPage.tsx');
    const widget = readProjectFile('components/GeminiBuddy.tsx');
    const modal = readProjectFile('components/BuddyContextModal.tsx');

    expect(client).toContain('buddyScopeMode');
    expect(client).toContain('global_student_scoped');
    expect(client).toContain('lesson_scoped');
    expect(fullPage).toContain("buddyScopeMode: 'global_student_scoped'");
    expect(widget).toContain("'lesson_scoped'");
    expect(widget).toContain("'course_scoped'");
    expect(modal).toContain("buddyScopeMode: 'lesson_scoped'");
  });

  it('backend enforces scoped Buddy behavior instead of open general AI behavior', () => {
    const source = readProjectFile('supabase/functions/ask-ai/index.ts');

    expect(source).toContain('POLÍTICA DE ESCOPO — AULA/CURSO');
    expect(source).toContain('POLÍTICA DE ESCOPO — BUDDY GLOBAL');
    expect(source).toContain('Não encontrei essa informação no material disponível desta aula/curso.');
    expect(source).toContain('Posso ajudar com conteúdos dos seus cursos no StudySystem.');
    expect(source).toContain('Responde apenas dentro da POLÍTICA DE ESCOPO aplicável');
    expect(source).not.toContain('Responde apenas a questões relacionadas com estudo, matérias do curso ou tecnologia');
  });

  it('preserves strict response formatting safeguards from Issue #5', () => {
    const source = readProjectFile('supabase/functions/ask-ai/index.ts');

    expect(source).toContain('responda somente X');
    expect(source).toContain('sem sugestões');
    expect(source).toContain('sem perguntas adicionais');
    expect(source).toContain('número exato de frases');
  });
});
