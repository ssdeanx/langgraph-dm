
import { BaseMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";

/**
 * Represents the state for a Self-RAG workflow.
 * @interface
 */
export type SelfRagState = {
  /**
   * The user's question.
   * @type {string}
   */
  question: string;
  /**
   * Retrieved documents.
   * @type {Document[]}
   */
  documents: Document[];
  /**
   * Generated response.
   * @type {string}
   */
  generation: string;
  /**
   * Grade for relevance of retrieved documents to the question.
   * @type {string}
   */
  generationVQuestionGrade: string;
  /**
   * Grade for whether the generation is supported by documents.
   * @type {string}
   */
  generationVDocumentsGrade: string;
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
