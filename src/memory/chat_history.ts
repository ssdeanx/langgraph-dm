import {
  Collection,
  Document as MongoDBDocument,
  type PushOperator,
} from "mongodb";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import {
  BaseMessage,
  StoredMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from "@langchain/core/messages";
import { getMongoCollection } from "./storage.js";


export interface MongoDBChatMessageHistoryInput {
  sessionId: string;
  dbName?: string;
  collectionName?: string;
}

/**
 * @example
 * ```typescript
 * const chatHistory = new MongoDBChatMessageHistory({
 *   collection: myCollection,
 *   sessionId: 'unique-session-id',
 * });
 * const messages = await chatHistory.getMessages();
 * await chatHistory.clear();
 * ```
 */
export class MongoDBChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace = ["langchain", "stores", "message", "mongodb"];

  private collection: Collection<MongoDBDocument> | null = null;

  private sessionId: string;

  private dbName: string;

  private collectionName: string;

  private idKey = "sessionId";

  constructor({ sessionId, dbName = "langgraph", collectionName = "chat_history" }: MongoDBChatMessageHistoryInput) {
    super();
    this.sessionId = sessionId;
    this.dbName = dbName;
    this.collectionName = collectionName;
  }

  private async getCollection(): Promise<Collection<MongoDBDocument>> {
    if (!this.collection) {
      try {
        this.collection = await getMongoCollection(this.dbName, this.collectionName);
      } catch (error) {
        throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    return this.collection;
  }

  async getMessages(): Promise<BaseMessage[]> {
    const collection = await this.getCollection();
    const document = await collection.findOne({
      [this.idKey]: this.sessionId,
    });
    const messages = document?.messages || [];
    return mapStoredMessagesToChatMessages(messages);
  }

  async addMessage(message: BaseMessage): Promise<void> {
    const collection = await this.getCollection();
    const messages = mapChatMessagesToStoredMessages([message]);
    await collection.updateOne(
      { [this.idKey]: this.sessionId },
      {
        $push: { messages: { $each: messages } } as PushOperator<{
          messages: StoredMessage[];
        }>,
      },
      { upsert: true }
    );
  }

  async clear(): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteOne({ [this.idKey]: this.sessionId });
  }
}
