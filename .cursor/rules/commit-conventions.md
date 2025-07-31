# Commit & Branch Conventions

## Commit Messages

Use conventional commits with concise descriptions:

- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `style:` - UI/UX improvements
- `perf:` - Performance improvements
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

**Format:** `type: description`

**Examples:**

- `feat: add generation parameters for global admins`
- `fix: resolve session validation issue`
- `refactor: simplify component structure`
- `style: improve debug info visibility`

## Branch Names

Use descriptive, kebab-case names:

- `feature/gallery-admin-params`
- `fix/auth-session-bug`
- `refactor/ui-components`
- `docs/api-documentation`

## Branch Strategy

- Create feature branches from `main`
- Use descriptive branch names
- Keep commits atomic and focused
- Squash commits before merging to `main`
