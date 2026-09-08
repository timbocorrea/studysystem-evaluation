# Project Structure

```text
/
├── .agent/              # AI Agent configuration and rules
├── .planning/           # GSD planning and codebase map
├── __tests__/           # Shared or integration tests
├── components/          # React UI components
├── contexts/            # React Contexts
├── domain/              # Business entities and schemas
│   └── schemas/         # Zod validation schemas
├── hooks/               # Custom React hooks
├── lib/                 # Third-party configurations (e.g. Supabase client)
├── repositories/        # Data access layer (Interfaces and Supabase implementations)
├── services/            # Business logic orchestration
├── stores/              # Zustand global state stores
├── tests/               # E2E or specific unit tests
├── types/               # TypeScript type definitions
└── utils/               # Helper functions
```

## Key Files
- `App.tsx`: Main entry point and routing.
- `index.tsx`: Application mounting.
- `package.json`: Dependencies and scripts.
- `vite.config.ts`: Vite configuration.
- `tailwind.config.cjs`: Tailwind CSS tokens.
- `vercel.json`: Deployment settings.
