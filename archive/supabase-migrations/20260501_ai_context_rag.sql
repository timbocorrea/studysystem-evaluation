-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create table for lesson content embeddings
CREATE TABLE IF NOT EXISTS public.lesson_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768), -- Gemini embedding-004 uses 768 dimensions (or 1536 for others, adjusting to 768 for flash/pro defaults)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Function for similarity search
CREATE OR REPLACE FUNCTION public.match_lesson_content (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_lesson_id UUID DEFAULT NULL -- Opcional: filtrar por aula específica ou buscar em tudo
)
RETURNS TABLE (
  id UUID,
  lesson_id UUID,
  content TEXT,
  similarity float,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    le.id,
    le.lesson_id,
    le.content,
    1 - (le.embedding <=> query_embedding) AS similarity,
    le.metadata
  FROM public.lesson_embeddings le
  WHERE (1 - (le.embedding <=> query_embedding) > match_threshold)
    AND (p_lesson_id IS NULL OR le.lesson_id = p_lesson_id)
  ORDER BY le.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS lesson_embeddings_idx ON public.lesson_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
