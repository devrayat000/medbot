"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/message";
import { Response } from "@/components/response";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/prompt-input";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/tool";

export default function Chat() {
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto p-6 min-h-screen">
      <h1 className="text-2xl font-semibold mb-4">Medical RAG Chat</h1>

      <Conversation>
        <ConversationContent>
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageAvatar
                src={m.role === "user" ? "/avatar-user.png" : "/avatar-bot.png"}
                name={m.role === "user" ? "You" : "MedBot"}
              />
              <MessageContent>
                {m.parts?.map((part: any, idx: number) => {
                  if (part.type === "text") {
                    return <Response key={idx}>{part.text}</Response>;
                  }
                  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
                    return (
                      <Tool key={idx}>
                        <ToolHeader type={part.type} state={part.state} />
                        <ToolContent>
                          <ToolInput input={part.input} />
                          <ToolOutput
                            errorText={part.errorText}
                            output={
                              part.output ? (
                                <pre className="p-2 text-xs overflow-auto">{JSON.stringify(part.output, null, 2)}</pre>
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

      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur border-t">
        <div className="mx-auto max-w-3xl p-4">
          <PromptInput
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim()) return;
              sendMessage({ text: input });
              setInput("");
            }}
          >
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder="Ask a medical question…"
            />
            <PromptInputToolbar>
              <PromptInputTools>{/* extra tools can go here */}</PromptInputTools>
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
            <div className="text-sm text-red-600 p-2">{String(error)}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
