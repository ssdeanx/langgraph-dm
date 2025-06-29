import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as math from "mathjs";
import logger from "../config/logger.js";
import { ToolExecutionError } from "../config/errors.js";

/**
 * @module CalculatorTools
 * @description A collection of tools for performing various mathematical operations safely.
 */

/**
 * Evaluates a mathematical expression.
 */
export const evaluateExpressionTool = tool(
  async (input) => {
    logger.info("Evaluating mathematical expression", { expression: input.expression });
    try {
      const result = math.evaluate(input.expression);
      logger.info("Expression evaluated successfully", { expression: input.expression, result });
      return String(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error evaluating expression", { expression: input.expression, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to evaluate expression: ${errorMessage}`,
        "evaluate_expression",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "evaluate_expression",
    description: "Evaluates a mathematical expression safely.",
    schema: z.object({
      expression: z.string().describe("The mathematical expression to evaluate."),
    }),
  }
);

/**
 * Adds two numbers.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.a - The first number.
 * @param {number} input.b - The second number.
 * @returns {Promise<number | string>} The sum or an error message.
 */
export const addNumbersTool = tool(
  async (input) => {
    logger.info("Adding numbers", { a: input.a, b: input.b });
    try {
      const result = math.add(input.a, input.b);
      logger.info("Numbers added successfully", { a: input.a, b: input.b, result });
      return String(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error adding numbers", { a: input.a, b: input.b, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to add numbers: ${errorMessage}`,
        "add_numbers",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "add_numbers",
    description: "Adds two numbers.",
    schema: z.object({
      a: z.number().describe("The first number."),
      b: z.number().describe("The second number."),
    }),
  }
);

/**
 * Subtracts two numbers.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.a - The first number.
 * @param {number} input.b - The second number.
 * @returns {Promise<number | string>} The difference or an error message.
 */
export const subtractNumbersTool = tool(
  (input) => {
    try {
      const result = math.subtract(input.a, input.b);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error subtracting numbers: ${errorMessage}`);
    }
  },
  {
    name: "subtract_numbers",
    description: "Subtracts two numbers.",
    schema: z.object({
      a: z.number().describe("The first number."),
      b: z.number().describe("The second number."),
    }),
  }
);

/**
 * Multiplies two numbers.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.a - The first number.
 * @param {number} input.b - The second number.
 * @returns {Promise<number | string>} The product or an error message.
 */
export const multiplyNumbersTool = tool(
  (input) => {
    try {
      const result = math.multiply(input.a, input.b);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error multiplying numbers: ${errorMessage}`);
    }
  },
  {
    name: "multiply_numbers",
    description: "Multiplies two numbers.",
    schema: z.object({
      a: z.number().describe("The first number."),
      b: z.number().describe("The second number."),
    }),
  }
);

/**
 * Divides two numbers.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.a - The numerator.
 * @param {number} input.b - The denominator.
 * @returns {Promise<number | string>} The quotient or an error message.
 */
export const divideNumbersTool = tool(
  (input) => {
    try {
      if (input.b === 0) {
        throw new Error("Division by zero");
      }
      const result = math.divide(input.a, input.b);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error dividing numbers: ${errorMessage}`);
    }
  },
  {
    name: "divide_numbers",
    description: "Divides two numbers.",
    schema: z.object({
      a: z.number().describe("The numerator."),
      b: z.number().describe("The denominator."),
    }),
  }
);

/**
 * Calculates the power of a number.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.base - The base number.
 * @param {number} input.exponent - The exponent.
 * @returns {Promise<number | string>} The result or an error message.
 */
export const powerTool = tool(
  (input) => {
    try {
      const result = math.pow(input.base, input.exponent);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error calculating power: ${errorMessage}`);
    }
  },
  {
    name: "power",
    description: "Calculates the power of a number.",
    schema: z.object({
      base: z.number().describe("The base number."),
      exponent: z.number().describe("The exponent."),
    }),
  }
);

/**
 * Calculates the square root of a number.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.value - The number.
 * @returns {Promise<number | string>} The square root or an error message.
 */
export const sqrtTool = tool(
  (input) => {
    try {
      const result = math.sqrt(input.value);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error calculating square root: ${errorMessage}`);
    }
  },
  {
    name: "sqrt",
    description: "Calculates the square root of a number.",
    schema: z.object({
      value: z.number().describe("The number."),
    }),
  }
);

/**
 * Calculates the sine of an angle in radians.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.angle - The angle in radians.
 * @returns {Promise<number | string>} The sine value or an error message.
 */
export const sinTool = tool(
  (input) => {
    try {
      const result = math.sin(input.angle);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error calculating sine: ${errorMessage}`);
    }
  },
  {
    name: "sin",
    description: "Calculates the sine of an angle in radians.",
    schema: z.object({
      angle: z.number().describe("The angle in radians."),
    }),
  }
);

/**
 * Calculates the cosine of an angle in radians.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.angle - The angle in radians.
 * @returns {Promise<number | string>} The cosine value or an error message.
 */
export const cosTool = tool(
  (input) => {
    try {
      const result = math.cos(input.angle);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error calculating cosine: ${errorMessage}`);
    }
  },
  {
    name: "cos",
    description: "Calculates the cosine of an angle in radians.",
    schema: z.object({
      angle: z.number().describe("The angle in radians."),
    }),
  }
);

/**
 * Calculates the tangent of an angle in radians.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.angle - The angle in radians.
 * @returns {Promise<number | string>} The tangent value or an error message.
 */
export const tanTool = tool(
  (input) => {
    try {
      const result = math.tan(input.angle);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error calculating tangent: ${errorMessage}`);
    }
  },
  {
    name: "tan",
    description: "Calculates the tangent of an angle in radians.",
    schema: z.object({
      angle: z.number().describe("The angle in radians."),
    }),
  }
);

/**
 * Calculates the natural logarithm of a number.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.value - The number.
 * @returns {Promise<number | string>} The logarithm value or an error message.
 */
export const logTool = tool(
  (input) => {
    try {
      const result = math.log(input.value);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error calculating natural logarithm: ${errorMessage}`);
    }
  },
  {
    name: "log",
    description: "Calculates the natural logarithm of a number.",
    schema: z.object({
      value: z.number().describe("The number."),
    }),
  }
);

/**
 * Calculates the absolute value of a number.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.value - The number.
 * @returns {Promise<number | string>} The absolute value or an error message.
 */
export const absTool = tool(
  (input) => {
    try {
      const result = math.abs(input.value);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error calculating absolute value: ${errorMessage}`);
    }
  },
  {
    name: "abs",
    description: "Calculates the absolute value of a number.",
    schema: z.object({
      value: z.number().describe("The number."),
    }),
  }
);

/**
 * Rounds a number to the nearest integer.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.value - The number.
 * @returns {Promise<number | string>} The rounded value or an error message.
 */
export const roundTool = tool(
  (input) => {
    try {
      const result = math.round(input.value);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error rounding number: ${errorMessage}`);
    }
  },
  {
    name: "round",
    description: "Rounds a number to the nearest integer.",
    schema: z.object({
      value: z.number().describe("The number."),
    }),
  }
);

/**
 * Rounds a number down to the nearest integer.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.value - The number.
 * @returns {Promise<number | string>} The floored value or an error message.
 */
export const floorTool = tool(
  (input) => {
    try {
      const result = math.floor(input.value);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error flooring number: ${errorMessage}`);
    }
  },
  {
    name: "floor",
    description: "Rounds a number down to the nearest integer.",
    schema: z.object({
      value: z.number().describe("The number."),
    }),
  }
);

/**
 * Rounds a number up to the nearest integer.
 * @function
 * @param {object} input - The input object.
 * @param {number} input.value - The number.
 * @returns {Promise<number | string>} The ceiled value or an error message.
 */
export const ceilTool = tool(
  (input) => {
    try {
      const result = math.ceil(input.value);
      return Promise.resolve(String(result));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(`Error ceiling number: ${errorMessage}`);
    }
  },
  {
    name: "ceil",
    description: "Rounds a number up to the nearest integer.",
    schema: z.object({
      value: z.number().describe("The number."),
    }),
  }
);

