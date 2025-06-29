
import { BaseMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";

/**
 * Represents the state for a Corrective RAG (CRAG) workflow.
 * @interface
 */
export type CragState = {
  /**
   * The user's question.
   * @type {string}
   */
  question: string;
  /**
   * Retrieved documents from the vector store.
   * @type {Document[]}
   */
  documents: Document[];
  /**
   * Web search results.
   * @type {string}
   */
  web_search_results: string;
  /**
   * The final generated answer.
   * @type {string}
   */
  generation: string;
  /**
   * Grade for the relevance of retrieved documents.
   * @type {string}
   */
  documents_grade: string;
  /**
   * The next node to execute in the workflow.
   * @type {string}
   */
  next: string;
  /**
   * Messages exchanged during the workflow.
   * @type {BaseMessage[]}
   */
  messages: BaseMessage[];
};
