"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import { PaperclipIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  type PromptInputMessage,
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

type AttachmentUIPart = FileUIPart & {
  id?: string;
  name?: string;
  contentType?: string;
  url?: string;
  data?: string;
  inlineData?: {
    data: string;
    mediaType?: string;
  };
};

const isAttachmentPart = (part: unknown): part is AttachmentUIPart =>
  typeof part === "object" &&
  part !== null &&
  "type" in part &&
  (part as { type?: string }).type === "file";

const getAttachmentMediaType = (part: AttachmentUIPart) =>
  part.mediaType ?? part.contentType ?? part.inlineData?.mediaType ?? "";

const getAttachmentUrl = (part: AttachmentUIPart) => {
  if (typeof part.url === "string") {
    return part.url;
  }

  const inlineData = part.inlineData;
  if (inlineData?.data) {
    if (inlineData.data.startsWith("data:")) {
      return inlineData.data;
    }

    const mediaType =
      inlineData.mediaType ??
      part.mediaType ??
      part.contentType ??
      "application/octet-stream";

    return `data:${mediaType};base64,${inlineData.data}`;
  }

  const blobData = part.data;
  if (blobData) {
    const mediaType =
      getAttachmentMediaType(part) || "application/octet-stream";
    if (blobData.startsWith("data:")) {
      return blobData;
    }
    return `data:${mediaType};base64,${blobData}`;
  }

  return undefined;
};

const getAttachmentName = (part: AttachmentUIPart, fallbackIndex: number) =>
  part.filename ?? part.name ?? `Attachment ${fallbackIndex + 1}`;

const AttachmentPreview = ({
  part,
  index,
}: {
  part: AttachmentUIPart;
  index: number;
}) => {
  const mediaType = getAttachmentMediaType(part);
  const url = getAttachmentUrl(part);
  const name = getAttachmentName(part, index);
  const isImage = Boolean(url && mediaType.startsWith("image/"));

  if (isImage && url) {
    return (
      <a
        aria-label={name}
        className="relative block max-w-[14rem] overflow-hidden rounded-lg border border-border bg-background/40 shadow-sm transition hover:brightness-95"
        href={url}
        rel="noreferrer"
        target="_blank"
      >
        <Image
          alt={name}
          className="h-40 w-full object-cover"
          height={160}
          src={url}
          unoptimized
          width={224}
        />
      </a>
    );
  }

  const content = (
    <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground transition group-hover:bg-background/70">
      <PaperclipIcon aria-hidden className="size-4 shrink-0" />
      <span className="line-clamp-2 min-w-0 break-words">{name}</span>
    </div>
  );

  if (url) {
    return (
      <a
        aria-label={name}
        className="group block max-w-xs"
        href={url}
        rel="noreferrer"
        target="_blank"
      >
        {content}
      </a>
    );
  }

  return <div className="group block max-w-xs">{content}</div>;
};

export default function Chat() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [text, setText] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage({
      text: message.text || "Sent with attachments",
      files: message.files,
    });
    setText("");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <h1 className="text-2xl font-semibold">Medical RAG Chat</h1>

      <Conversation className="flex-none grow shrink-1">
        <ConversationContent>
          {messages.map((m) => {
            const parts = m.parts ?? [];
            const renderedParts: ReactNode[] = [];
            const attachmentsBuffer: AttachmentUIPart[] = [];

            parts.forEach((part, idx) => {
              if (isAttachmentPart(part)) {
                attachmentsBuffer.push(part);
                const next = parts[idx + 1];
                if (!isAttachmentPart(next)) {
                  const attachmentsToRender = [...attachmentsBuffer];
                  attachmentsBuffer.length = 0;
                  renderedParts.push(
                    <div
                      className="flex flex-wrap gap-2"
                      key={`${m.id}-attachments-${idx}`}
                    >
                      {attachmentsToRender.map(
                        (attachment, attachmentIndex) => (
                          <AttachmentPreview
                            index={attachmentIndex}
                            key={
                              attachment.id ??
                              attachment.url ??
                              `${m.id}-attachment-${idx}-${attachmentIndex}`
                            }
                            part={attachment}
                          />
                        )
                      )}
                    </div>
                  );
                }
                return;
              }

              if (part.type === "text") {
                renderedParts.push(
                  <Response key={`${m.id}-${idx}`}>{part.text}</Response>
                );
                return;
              }

              if (part.type === "tool-getInformation") {
                renderedParts.push(
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
            });

            if (attachmentsBuffer.length) {
              const attachmentsToRender = [...attachmentsBuffer];
              attachmentsBuffer.length = 0;
              renderedParts.push(
                <div
                  className="flex flex-wrap gap-2"
                  key={`${m.id}-attachments-tail`}
                >
                  {attachmentsToRender.map((attachment, attachmentIndex) => (
                    <AttachmentPreview
                      index={attachmentIndex}
                      key={
                        attachment.id ??
                        attachment.url ??
                        `${m.id}-attachment-tail-${attachmentIndex}`
                      }
                      part={attachment}
                    />
                  ))}
                </div>
              );
            }

            return (
              <Message key={m.id} from={m.role}>
                <MessageContent>{renderedParts}</MessageContent>
              </Message>
            );
          })}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="bg-background/80 backdrop-blur border-t">
        <div className="mx-auto max-w-3xl p-4">
          <PromptInput
            onSubmit={handleSubmit}
            className="mt-4"
            globalDrop
            multiple
          >
            <PromptInputBody>
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
              <PromptInputTextarea
                onChange={(e) => setText(e.target.value)}
                ref={textareaRef}
                value={text}
              />
            </PromptInputBody>
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
              </PromptInputTools>
              <PromptInputSubmit disabled={!text && !status} status={status} />
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
