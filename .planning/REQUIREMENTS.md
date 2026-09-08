# Requirements

## Functional Requirements
- **FR1: Gestão de Cursos**: Listar, visualizar detalhes e gerenciar progresso em cursos.
- **FR2: Player de Aula**: Suporte a vídeo, áudio (via Dropbox) e documentos (PDF/DOCX).
- **FR3: Study Buddy (IA)**: Chatbot integrado com contexto da aula para tirar dúvidas.
- **FR4: Fórum e Notas**: Sistema de discussão por aula e anotações pessoais.
- **FR5: Dashboard Administrativo**: Gestão de conteúdo para administradores.

## Non-Functional Requirements (Performance & Quality)
- **NFR1: Modularidade**: Nenhum arquivo deve exceder 500 linhas de código (Refatoração SRP).
- **NFR2: Performance**: Carregamento preguiçoso (lazy loading) de componentes pesados (PDF, Recharts).
- **NFR3: Segurança**: RLS (Row Level Security) rigoroso no Supabase.
- **NFR4: Resiliência**: Fallbacks claros para falhas na API do Gemini ou Supabase.

## User Experience
- Interface responsiva com foco em acessibilidade e micro-animações (Framer Motion).
