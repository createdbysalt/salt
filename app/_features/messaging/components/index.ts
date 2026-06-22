export { MessageThread } from "./MessageThread";
export { MessageComposer } from "./MessageComposer";
export { ConversationListItem } from "./ConversationListItem";
export { MessageSearchInput } from "./MessageSearchInput";
export { MessageSearchResults } from "./MessageSearchResults";
export { RichMarkdownEditor } from "./RichMarkdownEditor";
export { MarkdownRenderer } from "./MarkdownRenderer";
export { KnowledgeMentionPicker, KnowledgeMentionChip } from "./KnowledgeMentionPicker";
export type { KnowledgeMention, KnowledgeMentionPickerProps, KnowledgeMentionChipProps } from "./KnowledgeMentionPicker";

// Chat components (unified messaging)
export { ChatMessage } from "./ChatMessage";
export type { ChatMessageData } from "./ChatMessage";
export { ChatComposer } from "./ChatComposer";
export { ChatThread } from "./ChatThread";
export { ConversationPanel, ConversationPanelEmpty } from "./ConversationPanel";
export { ConversationSidebar } from "./ConversationSidebar";
export type { Conversation, ConversationType, ConversationMember } from "./ConversationListItem";

// Smart messaging with email support
export { SmartComposer } from "./SmartComposer";
export type { MessageMode, ContactCapabilities } from "./SmartComposer";
export { EmailFields } from "./EmailFields";
export type { GmailAccount, EmailRecipient } from "./EmailFields";
export { EmptyConversation } from "./EmptyConversation";
export { ChannelBadge } from "./ChannelBadge";
export type { MessageChannel } from "./ChannelBadge";
export { DeliveryStatus } from "./DeliveryStatus";
export type { DeliveryStatusType } from "./DeliveryStatus";

// Unified message components
export { UnifiedMessageCard } from "./UnifiedMessageCard";
export type { UnifiedMessage } from "./UnifiedMessageCard";
export { UnifiedMessageThread } from "./UnifiedMessageThread";
