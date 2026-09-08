# Concerns & Potential Improvements

## 1. Massive Files (SRP Violation)
Several files are excessively large and likely handle too many responsibilities:
- `App.tsx` (~41KB): Likely contains too much routing/global logic. Should be broken down into layouts and sub-routes.
- `SupabaseCourseRepository.ts` (~51KB): Contains a massive amount of database logic. Should be split by entity or functional area.
- `SupabaseAdminRepository.ts` (~39KB): Same concern as Course Repository.

## 2. Performance & Bundle Size
The project includes several heavy dependencies:
- `pdfjs-dist`, `mammoth`, `dropbox`, `@google/genai`, `recharts`, `framer-motion`.
- **Recommendation**: Ensure these are code-split and only loaded when needed. Check `vite-plugin-compression` results.

## 3. Tech Debt
- `package.json` version is `0.0.0`.
- `ESTRATEGIA_NPM_AUDIT.md` indicates there might be known dependency vulnerabilities or audit requirements that need addressing.

## 4. Test Coverage
- While the structure for testing exists, the actual coverage of the complex repository logic should be verified.
- E2E tests are crucial given the heavy reliance on Supabase and external APIs.

## 5. Error Handling
- Verification is needed on how global errors (especially Supabase failures or API timeouts) are handled across the UI.
