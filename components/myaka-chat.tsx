"use client";

import { FormEvent, useState } from "react";
import { MyakaFace } from "@/components/myaka-face";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function MyakaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-9) }),
      });
      const data: unknown = await response.json();
      if (!response.ok || !data || typeof data !== "object" || !("reply" in data) ||
          typeof data.reply !== "string") {
        throw new Error(response.status === 429
          ? "Мяка немного устал. Попробуй через минуту."
          : "Мяка задумался. Попробуй ещё раз чуть позже.");
      }
      setMessages((current) => [...current, { role: "assistant", content: data.reply as string }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не получилось отправить сообщение.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="myaka-chat section-pad" id="chat" aria-labelledby="chat-title">
      <div className="myaka-chat-intro">
        <div>
          <h2 id="chat-title">Поболтать с Мякой</h2>
          <p>Он может помолчать. Но сейчас попробует ответить.</p>
        </div>
        <MyakaFace expression={pending ? "curious" : "slow"} className="myaka-chat-face" />
      </div>
      <div className="myaka-chat-card">
        <div className="myaka-chat-log" role="log" aria-live="polite" aria-label="Переписка с Мякой">
          {messages.length === 0 && <p className="myaka-chat-empty">Ну? Что у тебя?</p>}
          {messages.map((message, index) => (
            <p className={"myaka-chat-bubble " + (message.role === "user" ? "from-user" : "from-myaka")} key={index}>
              <span>{message.role === "user" ? "Ты" : "Мяка"}</span>{message.content}
            </p>
          ))}
          {pending && <p className="myaka-chat-status">Мяка думает...</p>}
        </div>
        <form className="myaka-chat-form" onSubmit={send}>
          <label className="sr-only" htmlFor="myaka-message">Сообщение Мяке</label>
          <input id="myaka-message" value={draft} onChange={(event) => setDraft(event.target.value)}
            placeholder="Напиши Мяке" maxLength={800} disabled={pending} required />
          <button type="submit" disabled={pending || !draft.trim()}>Отправить</button>
        </form>
        {error && <p className="myaka-chat-error" role="alert">{error}</p>}
        <p className="myaka-chat-disclosure">Это выдуманный персонаж. Ответы создаёт нейросеть. Не отправляй личные данные.</p>
      </div>
    </section>
  );
}
