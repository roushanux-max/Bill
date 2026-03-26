# Testing & Quality Guide

This project uses a multi-layered testing strategy to ensure "precise and smooth" development.

## 🛠️ Tools & Extensions

### 1. Unit & Component Testing (Vitest)
- **Framework**: [Vitest](https://vitest.dev/)
- **Integration**: React Testing Library + JSDOM
- **Command**: `npm test`
- **UI Mode**: `npm run test:ui` (Excellent for visual debugging of tests)

### 2. End-to-End Testing (Playwright)
- **Framework**: [Playwright](https://playwright.dev/)
- **Command**: `npm run test:e2e`
- **Use Case**: Verifying full flows (like creating an invoice and downloading the PDF).

### 3. Code Quality (ESLint & Prettier)
- **Linting**: `npm run lint` (Checks for logical errors and best practices)
- **Formatting**: `npm run format` (Ensures consistent, premium code style using Prettier)

## 🐞 Debugging (VS Code)

I've added `.vscode/launch.json` with pre-configured debuggers:
- **Debug Application (Chrome)**: Attach to the running app.
- **Debug Vitest**: Run and pause on breakpoints in unit tests.
- **Debug Playwright**: Run and pause on breakpoints in E2E tests.

*Tip: Use the "Run and Debug" side bar (Ctrl+Shift+D) and select the desired configuration.*

## 📁 Testing Structure
- `src/**/*.test.tsx`: Unit/Component tests next to the source files.
- `src/test/setup.ts`: Global test setup (mocks for Supabase, LocalStorage, etc.)
- `src/test/e2e/`: Playwright end-to-end test suites.

## 🚀 Best Practices
1. **Format Before Committing**: Run `npm run format` to keep the codebase clean.
2. **Mock External Services**: Use the mocks in `src/test/setup.ts` to prevent tests from hitting real APIs.
3. **Use Vitest UI**: It provides a real-time reactive environment for writing tests.
