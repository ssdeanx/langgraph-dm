---
description: AI rules derived by SpecStory from the project AI interaction history
globs: *
---

## Headers

## PROJECT DOCUMENTATION & CONTEXT SYSTEM

## TECH STACK

## CODING STANDARDS

### Environment Variables

*   Avoid direct use of `process.env` in the main code.
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
*   All usages of environment variables must go through the designated utility function (e.g., `getEnvVar`). Direct access via `process.env` elsewhere in the code is prohibited. Only the designated utility function (e.g. `getEnvVar`) should directly access `process.env`.

## DEBUGGING

## WORKFLOW & RELEASE RULES