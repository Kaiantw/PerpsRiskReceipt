"use client";

import { useMemo, useState } from "react";

import type { normalized_account_snapshot } from "@/lib/perps/types.ts";
import {
  answerRiskQuestion,
  getRiskAssistantSuggestions,
  type risk_assistant_response,
} from "@/lib/assistant/risk-assistant.ts";

type assistant_message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
};

function messageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toAssistantMessage(response: risk_assistant_response): assistant_message {
  return {
    id: messageId("assistant"),
    role: "assistant",
    content: response.answer,
    citations: response.citations,
  };
}

export function RiskAssistantPanel({
  snapshot,
}: {
  snapshot: normalized_account_snapshot;
}) {
  const suggestions = useMemo(
    () => getRiskAssistantSuggestions(snapshot),
    [snapshot],
  );
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<assistant_message[]>(() => {
    const openingResponse = answerRiskQuestion({
      snapshot,
      question: "summarize this account",
    });

    return [toAssistantMessage(openingResponse)];
  });

  function submitQuestion(rawQuestion: string) {
    const trimmedQuestion = rawQuestion.trim();

    if (!trimmedQuestion) {
      return;
    }

    const response = answerRiskQuestion({
      snapshot,
      question: trimmedQuestion,
    });

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: messageId("user"),
        role: "user",
        content: trimmedQuestion,
      },
      toAssistantMessage(response),
    ]);
    setQuestion("");
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white">
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Risk assistant</h2>
          <p className="text-sm text-stone-600">
            Explains the loaded snapshot only. No trade recommendations.
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_minmax(260px,360px)]">
        <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <article
              className={`rounded-lg border p-3 text-sm ${
                message.role === "assistant"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-stone-200 bg-stone-50 text-stone-950"
              }`}
              key={message.id}
            >
              <p className="text-xs font-semibold uppercase text-stone-500">
                {message.role === "assistant" ? "Assistant" : "You"}
              </p>
              <p className="mt-2 leading-6">{message.content}</p>
              {message.citations && message.citations.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.citations.map((citation) => (
                    <span
                      className="rounded-md border border-stone-200 bg-white px-2 py-1 font-mono text-xs text-stone-600"
                      key={citation}
                    >
                      {citation}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid gap-2">
            {suggestions.map((suggestion) => (
              <button
                className="min-h-10 rounded-lg border border-stone-300 bg-stone-50 px-3 text-left text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
                key={suggestion.id}
                onClick={() => submitQuestion(suggestion.question)}
                type="button"
              >
                {suggestion.label}
              </button>
            ))}
          </div>

          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitQuestion(question);
            }}
          >
            <label
              className="text-sm font-semibold text-stone-700"
              htmlFor="risk-assistant-question"
            >
              Ask a risk question
            </label>
            <textarea
              className="min-h-24 resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              id="risk-assistant-question"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Example: what is closest to liquidation?"
              value={question}
            />
            <button
              className="min-h-11 rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
              disabled={question.trim().length === 0}
              type="submit"
            >
              Ask
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
