"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, ToolUIPart } from "ai";
import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

type RetrievalToolInput = {
  location: string;
  units: "celsius" | "fahrenheit";
};

type RetrievalToolOutput = {
  location: string;
  temperature: string;
  conditions: string;
  humidity: string;
  windSpeed: string;
  lastUpdated: string;
};

type RetrievalToolUIPart = ToolUIPart<{
  getInformation: {
    input: RetrievalToolInput;
    output: RetrievalToolOutput;
  };
}>;

export default function Chat() {
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <h1 className="text-2xl font-semibold">Medical RAG Chat</h1>

      <Conversation className="flex-none grow shrink-1">
        <ConversationContent>
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent>
                {m.parts?.map((part, idx) => {
                  if (part.type === "text") {
                    return (
                      <Response key={`${m.id}-${idx}`}>{part.text}</Response>
                    );
                  }

                  if (part.type === "tool-getInformation") {
                    return (
                      <Tool key={`${m.id}-${idx}`}>
                        <ToolHeader type={part.type} state={part.state} />
                        <ToolContent>
                          <ToolInput input={part.input} />
                          <ToolOutput
                            errorText={part.errorText}
                            output={
                              part.output ? (
                                <pre className="p-2 text-xs overflow-auto">
                                  {JSON.stringify(part.output, null, 2)}
                                </pre>
                              ) : undefined
                            }
                          />
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="bg-background/80 backdrop-blur border-t">
        <div className="mx-auto max-w-3xl p-4">
          <PromptInput
            onSubmit={(message, e) => {
              const hasText = Boolean(message.text);
              const hasAttachments = Boolean(message.files?.length);

              if (!(hasText || hasAttachments)) {
                return;
              }

              if (!input.trim()) return;
              sendMessage({ text: message.text || input });
              setInput("");
            }}
          >
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder="Ask a medical question…"
            />
            <PromptInputToolbar>
              <PromptInputTools>
                {/* extra tools can go here */}
              </PromptInputTools>
              <div className="flex items-center gap-2">
                {status === "streaming" ? (
                  <PromptInputSubmit status={status} onClick={() => stop()} />
                ) : (
                  <PromptInputSubmit status={status} />
                )}
              </div>
            </PromptInputToolbar>
          </PromptInput>
          {error ? (
            <div className="text-sm text-red-600 p-2">{error.message}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
