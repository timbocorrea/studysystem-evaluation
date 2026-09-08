import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Buddy strict response prompt control', () => {
  it('backend ask-ai prompt prioritizes explicit safe formatting limits', () => {
    const source = readProjectFile('supabase/functions/ask-ai/index.ts');

    expect(source).toContain('responda somente X');
    expect(source).toContain('sem sugestões');
    expect(source).toContain('não inclua sugestões');
    expect(source).toContain('número exato de frases');
  });

  it('Buddy frontend prompts no longer force suggestions unconditionally', () => {
    const files = [
      'hooks/useBuddyClient.ts',
      'components/BuddyContextModal.tsx'
    ];

    for (const file of files) {
      const source = readProjectFile(file);

      expect(source).not.toContain('SEMPRE adicione');
      expect(source).toContain('responda somente X');
      expect(source).toContain('sem sugestões');
      expect(source).toContain('Só');
    }
  });
});
