"use client";
import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Trash2, AlertTriangle, ArrowLeft, Plus, MessageSquare, Clock, Edit2, Check, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../authContext";
import axios from "axios";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isEmergency?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
  context?: any;
}

interface RequestContext {
  requestId: number;
  title: string;
  issue: string;
  status: string;
  summary: string | null;
}

export default function ChatbotPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, loading: authLoading } = useAuth();
  
  const [requestContext, setRequestContext] = useState<RequestContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [emergencyWarning, setEmergencyWarning] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const contextParam = searchParams.get('context');
    if (contextParam) {
      try {
        const context: RequestContext = JSON.parse(decodeURIComponent(contextParam));
        setRequestContext(context);
      } catch (error) {
        console.error('Failed to parse context:', error);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user && token) {
      loadChatSessions();
    }
  }, [user, token]);

  useEffect(() => {
    if (sessionId && token) {
      loadChatHistory(sessionId);
    }
  }, [sessionId, token]);

  const loadChatSessions = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/chatbot/history`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.sessions) {
        setChatSessions(response.data.sessions);
      }
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
    }
  };

  const loadChatHistory = async (sid: string) => {
    setLoadingHistory(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/chatbot/history?sessionId=${sid}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.history) {
        const loadedMessages: Message[] = response.data.history.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          isEmergency: msg.isEmergency,
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setEmergencyWarning(null);
    setMessages([]);
  };

  const loadSession = (sid: string) => {
    setSessionId(sid);
    setEmergencyWarning(null);
  };

  const deleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this chat session?")) {
      return;
    }

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/chatbot/history`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { sessionId: sid },
        }
      );

      setChatSessions(prev => prev.filter(s => s.id !== sid));
      
      if (sid === sessionId) {
        startNewChat();
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert("Failed to delete session. Please try again.");
    }
  };

  const startEditingTitle = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const saveSessionTitle = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!editingTitle.trim()) {
      setEditingSessionId(null);
      return;
    }

    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/chatbot/session/${sid}/title`,
        { title: editingTitle },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setChatSessions(prev => prev.map(s => 
        s.id === sid ? { ...s, title: editingTitle } : s
      ));
      setEditingSessionId(null);
    } catch (error) {
      console.error("Failed to update session title:", error);
      alert("Failed to update title. Please try again.");
    }
  };

  const cancelEditingTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setIsLoading(true);
    setEmergencyWarning(null);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/chatbot`,
        {
          question: currentInput,
          sessionId: sessionId,
          context: requestContext,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data;

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
        setTimeout(() => loadChatSessions(), 500);
      }

      if (data.warning) {
        setEmergencyWarning(data.warning);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "I received your message.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);

      const errorMessage: Message = {
        role: "assistant",
        content:
          error.response?.data?.msg ||
          "I apologize, but I'm having trouble connecting right now. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mb-4" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black overflow-hidden relative flex">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-linear-to-br from-black via-zinc-950 to-black" />
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 0.5 + "px",
              height: Math.random() * 2 + 0.5 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              opacity: Math.random() * 0.3 + 0.2,
              animation: `twinkle ${Math.random() * 4 + 3}s infinite ${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {showSidebar && (
        <div className="pt-15 relative z-10 w-80 border-r border-white/10 bg-zinc-950/80 backdrop-blur-2xl flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-light tracking-widest text-white/90 uppercase">
                Chat History
              </h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-white/50 hover:text-white/90 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-sm hover:bg-white/90 transition-all text-xs tracking-wider uppercase font-medium"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatSessions.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-xs tracking-wide">
                  No chat history yet
                </p>
              </div>
            ) : (
              chatSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={`group relative p-3 rounded border cursor-pointer transition-all ${
                    sessionId === session.id
                      ? "bg-white/10 border-white/20"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    {editingSessionId === session.id ? (
                      <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="flex-1 px-2 py-1 bg-black/30 border border-white/20 rounded text-xs text-white/90"
                          autoFocus
                        />
                        <button
                          onClick={(e) => saveSessionTitle(session.id, e)}
                          className="text-green-400 hover:text-green-300"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={cancelEditingTitle}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm text-white/90 font-light line-clamp-1 flex-1 pr-2">
                          {session.title}
                        </h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => startEditingTitle(session, e)}
                            className="text-white/40 hover:text-blue-400 transition-all shrink-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => deleteSession(session.id, e)}
                            className="text-white/40 hover:text-red-400 transition-all shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-white/50 line-clamp-2 mb-2">
                    {session.lastMessage}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-white/30">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(session.timestamp).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>{session.messageCount} msg</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className=" pt-15 relative z-10 flex-1 flex flex-col h-screen">
        <div className="border-b border-white/10 bg-zinc-950/80 backdrop-blur-2xl shrink-0">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {!showSidebar && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="text-white/50 hover:text-white/90 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                )}
                <Link
                  href="/patient-dashboard"
                  className="text-white/50 hover:text-white/90 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="relative">
                  <Bot className="w-8 h-8 text-white/80" strokeWidth={1} />
                  <div className="absolute inset-0 blur-xl bg-white/20" />
                </div>
                <div>
                  <h1 className="text-xl font-extralight tracking-widest text-white/95 uppercase">
                    AI Healthcare Assistant
                  </h1>
                  <p className="text-xs text-white/40 tracking-wider uppercase">
                    {requestContext ? `Request: ${requestContext.title}` : 'Available 24/7'}
                  </p>
                </div>
              </div>

              {sessionId && (
                <button
                  onClick={startNewChat}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-sm hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2 text-xs tracking-wider uppercase"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
              )}
            </div>
          </div>
        </div>

        {requestContext && (
          <div className="border-b border-blue-500/20 bg-blue-500/5 backdrop-blur-sm shrink-0">
            <div className="px-6 py-3">
              <div className="flex items-start gap-3">
                <Bot className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-blue-200 text-xs font-medium mb-1">CONTEXT LOADED</p>
                  <p className="text-blue-100/70 text-xs">
                    I have information about your request: "{requestContext.title}" (Status: {requestContext.status})
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {emergencyWarning && (
          <div className="border-b border-red-500/20 bg-red-500/10 backdrop-blur-sm shrink-0">
            <div className="px-6 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-200 text-sm font-light">
                  {emergencyWarning}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-3" />
                <p className="text-white/40 text-sm">Loading chat history...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <Bot className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h2 className="text-xl font-light text-white/90 mb-2 tracking-wide">
                  Start a conversation
                </h2>
                <p className="text-white/50 text-sm mb-6">
                  Ask me anything about your health concerns, symptoms, or general wellness questions.
                </p>
                {requestContext && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-sm p-4 text-left">
                    <p className="text-blue-400 text-xs font-medium mb-2">Request Context Available</p>
                    <p className="text-white/70 text-sm">
                      I have information about your request: "{requestContext.title}". Feel free to ask me about it!
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white/60" strokeWidth={1.5} />
                    </div>
                  )}

                  <div
                    className={`max-w-2xl ${
                      message.role === "user"
                        ? "bg-white/10 border-white/20"
                        : message.isEmergency
                        ? "bg-red-500/10 border-red-500/20"
                        : "bg-white/5 border-white/10"
                    } border backdrop-blur-sm rounded-sm px-5 py-4`}
                  >
                    <p className="text-white/90 text-sm leading-relaxed font-light whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p className="text-white/30 text-xs mt-2 tracking-wider">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {message.role === "user" && (
                    <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-white/70" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white/60" strokeWidth={1.5} />
                  </div>
                  <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-sm px-5 py-4">
                    <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-white/10 bg-zinc-950/80 backdrop-blur-2xl shrink-0">
          <div className="px-6 py-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                maxLength={2000}
                className="flex-1 bg-white/5 border border-white/10 rounded-sm px-5 py-3 text-white/90 placeholder-white/30 focus:outline-none focus:border-white/30 transition-all text-sm font-light tracking-wide disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-white text-black rounded-sm font-medium hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm tracking-wider uppercase"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>

            <p className="text-white/30 text-xs mt-3 text-center tracking-wider">
              This AI assistant provides general health information. Always consult healthcare professionals for medical advice.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}