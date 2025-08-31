"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isLoading, error } = useChat();
  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto p-6 min-h-screen">
      <h1 className="text-2xl font-semibold mb-4">Medical RAG Chat</h1>
      <div className="flex-1 space-y-4 mb-24">
        {messages.map((m: any) => (
          <div key={m.id} className="whitespace-pre-wrap p-3 rounded border">
            <div className="text-xs uppercase text-gray-500 mb-1">{m.role}</div>
            {m.content ? (
              <p>{m.content}</p>
            ) : m.parts ? (
              (m.parts as any[]).map((part: any, idx: number) => {
                if (part.type === "text") return <p key={idx}>{part.text}</p>;
                if (part.type?.startsWith("tool-")) {
                  return (
                    <div key={idx}>
                      <div className="text-sm text-gray-600">Tool: {part.type}</div>
                      <pre className="my-2 bg-gray-100 p-2 rounded text-xs overflow-auto">{JSON.stringify(part.input ?? part, null, 2)}</pre>
                    </div>
                  );
                }
                return null;
              })
            ) : null}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          // Encourage retrieval use by instructing the model to use the tool
          sendMessage({ text: input });
          setInput("");
        }}
        className="fixed bottom-0 left-0 right-0 bg-white border-t"
      >
        <div className="mx-auto max-w-2xl p-4 flex gap-2">
          <input
            className="flex-1 p-2 border rounded"
            value={input}
            placeholder="Ask a medical question…"
            onChange={(e) => setInput(e.currentTarget.value)}
          />
          <button
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            disabled={isLoading}
            type="submit"
          >
            Send
          </button>
        </div>
        {error ? (
          <div className="mx-auto max-w-2xl text-sm text-red-600 p-2">{String(error)}</div>
        ) : null}
      </form>
    </div>
  );
}
