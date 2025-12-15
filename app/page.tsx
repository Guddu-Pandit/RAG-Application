"use client";

import { useState } from "react";
import { Bot, User, Upload, SendHorizontal } from "lucide-react";
import { createServer } from "@/lib/supabase/server";

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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "completed" | "error"
  >("idle");

async function uploadFile(file: File) {
  setUploadStatus("uploading");
  setUploadProgress(0);

  try {
    const supabase = await createServer();

    // 1️⃣ Upload to bucket 'tech'
    const filePath = `${Date.now()}-${file.name}`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from("tech")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (storageError) throw storageError;

    setUploadProgress(50);

    // 2️⃣ Extract text (via API)
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/ingest", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Ingestion failed");

    setUploadProgress(100);
    setUploadStatus("completed");

    // Reset after 5s
    setTimeout(() => setUploadStatus("idle"), 5000);

  } catch (err) {
    console.error(err);
    setUploadStatus("error");
    setUploadProgress(null);
    setTimeout(() => setUploadStatus("idle"), 5000);
  }
}

  async function send() {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage.content }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.answer },
    ]);

    setLoading(false);
  }

  return (
    <div className="min-h-screen  to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl h-[85vh] flex flex-col rounded-2xl shadow-xl">
        {/* Header */}
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">RAG Assistant</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask questions from your knowledge base
          </p>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 p-0">
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
                      "max-w-[75%] rounded-xl px-4 py-2 text-sm leading-relaxed",
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
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-xl text-sm animate-pulse">
                    Thinking…
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex items-end gap-2">
            {/* Upload button */}
            <Button
              type="button"
              className="h-16 w-16 rounded-xl flex items-center justify-center"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <Upload size={28} strokeWidth={2} className="fontsize-1xl" />
            </Button>
            {/* Text input */}
           <Textarea
  value={input}
  onChange={(e) => {
    setInput(e.target.value);

    // Hide upload message if user types
    if (uploadStatus === "completed") setUploadStatus("idle");
  }}
  placeholder="Ask a question or upload a document…"
  rows={2}
  className="resize-none"
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
      if (uploadStatus === "completed") setUploadStatus("idle");
    }
  }}
/>


            {/* Hidden file input */}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              id="file-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setUploadedFile(file);
                uploadFile(file);
              }}
            />

            {/* Send button */}
            <Button
              onClick={send}
              disabled={loading}
              className="rounded-xl h-16 w-16 flex items-center justify-center"
            >
              <SendHorizontal
                size={32}
                strokeWidth={1.75}
                className="fontsize-1xl"
              />
            </Button>
          </div>
          {uploadStatus !== "idle" && (
            <p className="text-xs px-18 text-muted-foreground mt-1">
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
