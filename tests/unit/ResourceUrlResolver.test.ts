import { describe, expect, it } from 'vitest';
import {
  canEmbedResolvedUrl,
  canOpenResolvedUrlInNewTab,
  getSanitizedUrlErrorMessage,
  inferLessonResourceKind,
  resolveLessonResourceUrl,
} from '../../services/ResourceUrlResolver';

describe('ResourceUrlResolver', () => {
  it('classifies legacy public Supabase Storage URLs', () => {
    const resolved = resolveLessonResourceUrl(
      'https://example.supabase.co/storage/v1/object/public/lesson-resources/pdfs/abc-123.pdf'
    );

    expect(resolved.isSafe).toBe(true);
    expect(resolved.sourceType).toBe('supabase_public_legacy');
    expect(resolved.provider).toBe('supabase_storage');
    expect(resolved.expiresAt).toBeNull();
  });

  it('extracts bucket and bucket-relative path for lesson-resources', () => {
    const resolved = resolveLessonResourceUrl(
      'https://example.supabase.co/storage/v1/object/public/lesson-resources/images/course-cover.png'
    );

    expect(resolved.bucket).toBe('lesson-resources');
    expect(resolved.path).toBe('images/course-cover.png');
    expect(resolved.displayUrl).toContain('/storage/v1/object/public/lesson-resources/images/course-cover.png');
  });

  it('keeps valid external HTTPS URLs compatible', () => {
    const resolved = resolveLessonResourceUrl('https://cdn.example.com/material.pdf');

    expect(resolved.isSafe).toBe(true);
    expect(resolved.sourceType).toBe('external_url');
    expect(resolved.displayUrl).toBe('https://cdn.example.com/material.pdf');
    expect(canOpenResolvedUrlInNewTab(resolved)).toBe(true);
    expect(canEmbedResolvedUrl(resolved)).toBe(true);
  });

  it('blocks script protocol URLs without echoing the full URL in errors', () => {
    const blockedUrl = ['java', 'script:alert(1)'].join('');
    const resolved = resolveLessonResourceUrl(blockedUrl);

    expect(resolved.isSafe).toBe(false);
    expect(resolved.displayUrl).toBeNull();
    expect(resolved.reason).toBe('blocked_protocol');
    expect(getSanitizedUrlErrorMessage(resolved)).not.toContain(blockedUrl);
  });

  it('blocks inline data URLs', () => {
    const blockedUrl = ['da', 'ta:text/html;base64,PGgxPkJsb2NrZWQ8L2gxPg=='].join('');
    const resolved = resolveLessonResourceUrl(blockedUrl);

    expect(resolved.isSafe).toBe(false);
    expect(resolved.reason).toBe('blocked_protocol');
  });

  it('blocks local file URLs', () => {
    const blockedUrl = ['fi', 'le:///blocked/local/resource'].join('');
    const resolved = resolveLessonResourceUrl(blockedUrl);

    expect(resolved.isSafe).toBe(false);
    expect(resolved.reason).toBe('blocked_protocol');
  });

  it('treats invalid URLs as unsafe unknown values', () => {
    const resolved = resolveLessonResourceUrl('not a valid url');

    expect(resolved.isSafe).toBe(false);
    expect(resolved.sourceType).toBe('unknown');
    expect(resolved.reason).toBe('invalid_url');
  });

  it('does not generate signed URLs or expiration metadata', () => {
    const resolved = resolveLessonResourceUrl(
      'https://example.supabase.co/storage/v1/object/public/lesson-resources/audios/aula.mp3'
    );

    expect(resolved.displayUrl).not.toContain('token=');
    expect(resolved.downloadUrl).not.toContain('token=');
    expect(resolved.expiresAt).toBeNull();
  });

  it('infers common resource kinds without calling Supabase', () => {
    expect(inferLessonResourceKind('https://cdn.example.com/file.pdf')).toBe('pdf');
    expect(inferLessonResourceKind('https://cdn.example.com/audio.mp3')).toBe('audio');
    expect(inferLessonResourceKind('https://cdn.example.com/image.webp')).toBe('image');
    expect(inferLessonResourceKind('https://cdn.example.com/slides.pptx')).toBe('document');
    expect(inferLessonResourceKind('https://example.com/page')).toBe('link');
  });

  it('preserves current public URL compatibility', () => {
    const currentPublicUrl = 'https://example.supabase.co/storage/v1/object/public/lesson-resources/pdfs/current.pdf';
    const resolved = resolveLessonResourceUrl(currentPublicUrl);

    expect(resolved.displayUrl).toBe(currentPublicUrl);
    expect(resolved.downloadUrl).toBe(currentPublicUrl);
  });
});
