
import { BaseMessage } from "@langchain/core/messages";

/**
 * Represents the state for a multi-agent collaboration workflow.
 * @interface
 */
export type CollaborationState = {
  /**
   * Messages exchanged during the collaboration.
   * @type {BaseMessage[]}
   */
  messages: BaseMessage[];
  /**
   * The name of the agent that sent the last message.
   * @type {string}
   */
  sender: string;
  /**
   * The next node to execute in the workflow.
   * @type {string}
   */
  next: string;
};
