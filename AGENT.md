# LangGraph.js Development Guidelines

## Commands

- **Build**: `npm run build` (TypeScript compilation)
- **Test**: `npm run test` (unit tests), `npm run test:int` (integration tests)
- **Single test**: `node --experimental-vm-modules node_modules/jest/bin/jest.js --testPathPattern=filename`
- **Lint**: `npm run lint`, `npm run lint:all` (includes format check)
- **Format**: `npm run format` (Prettier)
- **Dev server**: `npx @langchain/langgraph-cli dev`

## Architecture

- **Main entry**: `src/agent/graph.ts:graph` (LangGraph workflow)
- **Key directories**: `src/agent/` (states/graphs), `src/tools/` (LangChain tools), `src/memory/` (storage/embeddings), `src/workflows/` (complex flows)
- **Config**: `langgraph.json` defines graph exports, uses Node.js 20
- **State management**: Multiple state types (collaboration, research, reflection, etc.)

## Code Style

- **ESM modules**: Use `.js` extensions in imports for TypeScript files
- **Environment variables**: Use utility functions, avoid direct `process.env` access (see copilot-instructions.md)
- **Strict TypeScript**: noUnusedLocals/Parameters enabled, prefer interfaces over types
- **LangChain patterns**: Use `tool()` from `@langchain/core/tools`, follow async/await patterns
- **Error handling**: Custom `ToolExecutionError` class for tool failures
- **Imports**: Group by external libs, then relative imports with `.js` extensions
