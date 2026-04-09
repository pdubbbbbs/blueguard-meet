import { useState, useRef, useEffect } from "react";
import { Send, X, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@shared/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
  currentUser: string;
}

export function ChatPanel({ messages, onSend, onClose, currentUser }: ChatPanelProps) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="flex flex-col h-full bg-[#0a1128] border-l border-blue-500/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-500/10">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">Chat</span>
          {messages.length > 0 && (
            <span className="text-xs text-slate-500">({messages.length})</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-sm text-slate-600">No messages yet</p>
            <p className="text-xs text-slate-700">Start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === currentUser;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] text-slate-600 mb-0.5 px-1">
                  {isMe ? "You" : msg.sender}
                </span>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                    isMe
                      ? "bg-blue-500/20 text-blue-100 rounded-br-sm"
                      : "bg-[#162044] text-slate-200 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-700 mt-0.5 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-blue-500/10">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="bg-[#060b18] border-blue-500/15 text-white placeholder:text-slate-600 text-sm h-9 flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
