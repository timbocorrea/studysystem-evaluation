# Project: Sistema de Estudos (Study System)

## Vision
Um ecossistema educacional inteligente que integra gestão de conteúdo, gamificação e inteligência artificial (Google Gemini) para otimizar o processo de aprendizagem.

## Context
Este é um projeto existente (brownfield) que utiliza uma arquitetura robusta baseada em Repositórios e Serviços, mas que apresenta desafios de manutenção devido ao crescimento acelerado de arquivos núcleo (`App.tsx`, `SupabaseCourseRepository.ts`).

## Core Objectives
1. **Refatoração Estrutural**: Decompor arquivos massivos para melhorar a manutenibilidade.
2. **Estabilização da IA**: Garantir que o "Study Buddy" (Gemini) funcione de forma fluida e segura.
3. **Gestão de Conteúdo**: Refinar a experiência de visualização de aulas e realização de quizzes.
4. **Gamificação**: Implementar/Melhorar sistemas de progresso e recompensas.

## Tech Stack
- **Frontend**: React 19 + Vite + TypeScript.
- **Backend**: Supabase (Auth, DB, Storage).
- **IA**: Google Gemini API.
- **State**: Zustand + React Query.
- **Styles**: Tailwind CSS + Framer Motion.
