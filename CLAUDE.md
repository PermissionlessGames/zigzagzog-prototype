# ZigZagZog Development Guide

## Workflow
- **IMPORTANT**: Discuss changes thoroughly before implementation
- **Changes**: Propose and get approval before applying significant modifications
- **Approach**: Take incremental steps rather than large-scale changes at once
- **Isolation**: Make one change at a time and isolate changes per commit
- **Clarity**: Keep commits focused on a single logical change for cleaner history

## Commands
- **Build**: `forge build` (contracts), `npm run build` (frontend)
- **Test**: `forge test -vvv` (all tests), `forge test -vvv --match-test testFunctionName` (single test)
- **Frontend Dev**: `cd frontend && npm run dev`
- **Lint**: `cd frontend && npm run lint`
- **Deploy**: See `scripts/deploy_testnet.md` for deployment instructions

## Code Style
- **Solidity**: Follow OpenZeppelin style - underscore prefix for private/internal variables
- **TypeScript**: Use explicit types, avoid `any`
- **Components**: Use functional components with TypeScript interfaces for props
- **Imports**: Group imports by external/internal, sort alphabetically
- **Error Handling**: Use try/catch for async operations, provide clear error messages
- **Naming**: camelCase for variables/functions, PascalCase for components/classes/interfaces
- **State Management**: Use React context for global state, local state for component-specific data
- **Comments**: Document complex logic, public interfaces, and contract interactions

## Project Structure
- Smart contracts in `src/`
- Frontend (Next.js) in `frontend/`
- Tests in `test/`
- Documentation in `docs/`