# CLAUDE.md - Dental Diamond Link Project

This file provides project-specific instructions for Claude Code to help with development, debugging, and code creation.

## Project Overview

**Project Name:** Dental Diamond Link
**Type:** Dental Clinic Management Web Application
**Tech Stack:** Next.js 15, TypeScript, Supabase, Clerk Authentication, Tailwind CSS
**Description:** A comprehensive dental clinic management system with patient records, appointments, treatments, and billing features.

## Critical Rules

### 1. Code Organization
- Use the Next.js App Router structure (`app/` directory)
- Keep components in `components/` folder, organized by feature
- Use `lib/` or `utils/` for utility functions
- Keep pages under `app/(auth)/` for authenticated routes

### 2. Code Style
- Use TypeScript for all new files
- Follow existing patterns in the codebase
- Use Zod for form validation
- Use React Hook Form for forms
- Tailwind CSS for styling (no custom CSS unless necessary)

### 3. Database
- Supabase for database (PostgreSQL)
- Use Supabase client from `@supabase/supabase-js`
- Follow RLS (Row Level Security) policies
- migrations are in `database/migrations/`

### 4. Authentication
- Clerk for authentication (`@clerk/nextjs`)
- Use `<ClerkProvider>` wrapper
- Protected routes use `(auth)/` layout pattern

### 5. State Management
- React Context for global state (see `contexts/` folder)
- Local state with `useState` for component-specific state

## Available Commands

The following slash commands are available for development workflows:

- `/tdd` - Test-driven development workflow
- `/build-fix` - Fix build errors
- `/code-review` - Review code quality
- `/refactor-clean` - Clean up and refactor code
- `/e2e` - End-to-end testing workflow

## Project Structure

```
app/
├── (auth)/              # Authenticated routes
│   ├── dashboard/      # Main dashboard
│   └── patient-preview/# Patient details
├── api/                # API routes
components/
├── ui/                 # Reusable UI components
├── calendar/           # Calendar components
contexts/               # React Context providers
lib/                    # Utility functions
services/               # Business logic services
database/
├── migrations/         # SQL migrations
```

## Key Patterns

### API Response Format
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

### Database Queries
```typescript
// Always handle errors with try/catch
const { data, error } = await supabase.from('table').select('*')
if (error) throw new Error(error.message)
```

## Environment Variables

Required variables (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

## Testing

Run tests with:
```bash
npm run lint     # ESLint
npm run build   # Production build
npm run dev     # Development server
```

## Git Workflow

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- Create feature branches for new features
- All tests must pass before merging
