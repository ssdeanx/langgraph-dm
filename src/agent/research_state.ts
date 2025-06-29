
import { BaseMessage } from "@langchain/core/messages";

/**
 * Represents the state for a research and reporting workflow.
 * @interface
 */
export type ResearchState = {
  /**
   * The user's initial query for the research.
   * @type {string}
   */
  query: string;
  /**
   * Messages exchanged during the research process.
   * @type {BaseMessage[]}
   */
  messages: BaseMessage[];
  /**
   * Collected research data (e.g., search results, document content).
   * @type {string[]}
   */
  research_data: string[];
  /**
   * The summarized research findings.
   * @type {string}
   */
  summary: string;
  /**
   * The final report generated from the research.
   * @type {string}
   */
  report: string;
  /**
   * The next step or agent to execute in the workflow.
   * @type {string}
   */
  next: string;
};
