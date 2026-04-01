export const MAX_CONVERSATION_TURNS = 10;

export function trimConversationMemoryMessages<T>(messages: T[], turns = MAX_CONVERSATION_TURNS) {
  const maxMessages = Math.max(2, turns * 2);
  if (!Array.isArray(messages)) return [] as T[];
  if (messages.length <= maxMessages) return messages;
  return messages.slice(messages.length - maxMessages);
}
