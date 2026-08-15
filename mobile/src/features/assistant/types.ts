export type ChatRole = "user" | "assistant";
export type ChatStatus = "sent" | "failed";
export interface ChatMessage { id: string; role: ChatRole; content: string; createdAt: number; status: ChatStatus; retryQuestion?: string }
