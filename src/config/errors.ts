import logger from './logger.js';

export class AgentError extends Error {
  constructor(message: string, public code: string = 'AGENT_ERROR') {
    super(message);
    this.name = 'AgentError';
  }
}

export class ToolExecutionError extends AgentError {
  constructor(message: string, public toolName: string, public originalError?: Error) {
    super(message, 'TOOL_EXECUTION_ERROR');
    this.name = 'ToolExecutionError';
  }
}

export class ModelInvocationError extends AgentError {
  constructor(message: string, public modelName: string, public originalError?: Error) {
    super(message, 'MODEL_INVOCATION_ERROR');
    this.name = 'ModelInvocationError';
  }
}

// Global error handler (conceptual - actual implementation depends on execution environment)
export function handleGlobalError(error: unknown) {
  if (error instanceof AgentError) {
    logger.error(`Custom Agent Error [${error.code}]: ${error.message}`, { stack: error.stack, details: error });
  } else if (error instanceof Error) {
    logger.error(`Unhandled Error: ${error.message}`, { stack: error.stack });
  } else {
    logger.error(`Unknown Error: ${JSON.stringify(error)}`);
  }
}
