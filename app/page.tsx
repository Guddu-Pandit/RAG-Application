"use client";

import { useState, useRef } from "react";
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

  // ⏱ upload limiter (1 min)
  const lastUploadRef = useRef<number | null>(null);

  /* ---------------- UPLOAD + INGEST ---------------- */

  async function uploadFile(file: File) {
    // ⛔ Client-side rate limit
    if (
      lastUploadRef.current &&
      Date.now() - lastUploadRef.current < 60_000
    ) {
      alert("Please wait 1 minute before uploading another file.");
      return;
    }

    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/ingest");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(
            Math.round((e.loaded / e.total) * 100)
          );
        }
      };

      xhr.onload = () => {
        // ✅ SUCCESS
        if (xhr.status === 200) {
          lastUploadRef.current = Date.now();
          setUploadStatus("completed");
          setUploadProgress(100);

          setTimeout(() => {
            setUploadStatus("idle");
            setUploadProgress(0);
          }, 4000);
        }

        // ⏱ RATE LIMIT FROM SERVER
        else if (xhr.status === 429) {
          setUploadStatus("error");
          alert("Upload limited. Please wait 1 minute.");
        }

        // ❌ OTHER ERRORS
        else {
          setUploadStatus("error");
        }
      };

      xhr.onerror = () => setUploadStatus("error");

      xhr.send(formData);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadStatus("error");
    }
  }

  /* ---------------- CHAT ---------------- */

  async function send() {
    if (!input.trim() || loading) return;

    setUploadStatus("idle");

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

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
    } catch (err) {
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

  /* ---------------- UI (UNCHANGED) ---------------- */

  return (
    <div className="min-h-screen flex bg-linear-to-b from-gray-700 to-gray-200 items-center justify-center p-4">
      <Card className="w-full max-w-3xl h-[85vh] flex flex-col rounded-2xl shadow-xl">
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">RAG Assistant</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask questions from your knowledge base
          </p>
        </CardHeader>

        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full px-6 py-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user"
                      ? "justify-end"
                      : "justify-start"
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
            </div>
          </ScrollArea>
        </CardContent>

        {/* INPUT */}
        <div className="border-t p-4">
          <div className="flex items-end gap-2">
            <Button
              type="button"
              className="h-16 w-16 rounded-xl "
              onClick={() =>
                document.getElementById("file-upload")?.click()
              }
            >
              <Upload size={28} className="fontsize-1xl"/>
            </Button>

            <Textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setUploadStatus("idle");
              }}
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
              <SendHorizontal size={30} className="fontsize-1xl"/>
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
              {uploadStatus === "uploading" &&
                `Uploading… ${uploadProgress}%`}
              {uploadStatus === "completed" &&
                "✅ Upload completed & indexed"}
              {uploadStatus === "error" &&
                "❌ Upload failed"}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
