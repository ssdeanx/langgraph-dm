---
description: AI rules derived by SpecStory from the project AI interaction history
globs: *
---

## Headers

## PROJECT DOCUMENTATION & CONTEXT SYSTEM

## TECH STACK

## CODING STANDARDS

### Environment Variables

*   Avoid direct use of `process.env` or `import.meta.env` in the main code.
*   Use a configuration module or utility function to safely access environment variables.
*   Implement error handling to ensure that required environment variables are set. For example:

    ```typescript
    function getEnvVar(name: string): string {
      const value = process.env[name];
      if (!value) {
        throw new Error(`${name} environment variable is not set.`);
      }
      return value;
    }

    const GOOGLE_API_KEY = getEnvVar("GOOGLE_API_KEY");
    ```
*   All usages of environment variables must go through the designated utility function (e.g., `getEnvVar`). Direct access via `process.env` or `import.meta.env` elsewhere in the code is prohibited. Only the designated utility function (e.g. `getEnvVar`) should directly access `process.env`.
*   In Node.js environments, use `process.env` instead of `import.meta.env` to access environment variables.
*   When using external libraries, ensure that API keys or other sensitive configuration parameters are not passed directly as properties in constructors, if the library does not expect it. Instead, rely on environment variables or the library's recommended approach for authentication.
*   When using the `ExaSearchResults` class from the `@langchain/exa` library, the API key should not be passed directly to the constructor. Instead, ensure the `EXA_API_KEY` environment variable is set, and instantiate `ExaSearchResults` without the `apiKey` argument in the constructor. The library automatically uses the environment variable if set.

## DEBUGGING

## WORKFLOW & RELEASE RULES