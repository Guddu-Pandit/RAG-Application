"use client";

import { useState, useRef, useEffect } from "react";
import { SendHorizontal, Bot, User, Upload } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "completed" | "error"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const lastUploadRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /* ✅ AUTO SCROLL WHEN MESSAGE UPDATES */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ---------------- UPLOAD ---------------- */

  async function uploadFile(file: File) {
    if (lastUploadRef.current && Date.now() - lastUploadRef.current < 60_000) {
      alert("Please wait 1 minute before uploading another file.");
      return;
    }

    setUploadStatus("uploading");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/ingest");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        lastUploadRef.current = Date.now();
        setUploadStatus("completed");
        setUploadProgress(100);

        setTimeout(() => {
          setUploadStatus("idle");
          setUploadProgress(0);
        }, 4000);
      } else {
        setUploadStatus("error");
      }
    };

    xhr.onerror = () => setUploadStatus("error");
    xhr.send(formData);
  }

  /* ---------------- CHAT ---------------- */

  async function send() {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setUploadStatus("idle");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "I don't know.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen flex bg-linear-to-b from-gray-700 to-gray-200 items-center justify-center p-4">
      <Card className="w-full max-w-3xl h-[85vh] flex flex-col rounded-2xl shadow-xl">
        
        {/* HEADER */}
        <CardHeader className="border-b shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">RAG Assistant</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask questions from your knowledge base
          </p>
        </CardHeader>

        {/* CHAT AREA (SCROLLABLE) */}
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-6 py-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[75%] rounded-xl px-4 py-2 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {msg.content}
                  </div>

                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <Bot className="h-8 w-8 text-primary" />
                  <div className="bg-muted px-4 py-2 rounded-xl animate-pulse">
                    Thinking…
                  </div>
                </div>
              )}

              {/* 👇 AUTO SCROLL TARGET */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        {/* INPUT (FIXED BOTTOM) */}
        <div className="border-t p-4 shrink-0 bg-background">
          <div className="flex items-end gap-2">
            <Button
              type="button"
              className="h-16 w-16 rounded-xl"
              onClick={() =>
                document.getElementById("file-upload")?.click()
              }
            >
              <Upload size={28} />
            </Button>

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question on uploaded document…"
              rows={2}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />

            <Button
              onClick={send}
              disabled={loading}
              className="h-16 w-16 rounded-xl"
            >
              <SendHorizontal size={30} />
            </Button>
          </div>

          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />

          {uploadStatus !== "idle" && (
            <p className="text-xs mt-2 text-muted-foreground">
              {uploadStatus === "uploading" && `Uploading… ${uploadProgress}%`}
              {uploadStatus === "completed" && "✅ Upload completed & indexed"}
              {uploadStatus === "error" && "❌ Upload failed"}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
