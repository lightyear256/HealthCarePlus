"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  LogOut,
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  MessageCircle,
  Send,
  X,
  Bot,
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { useAuth } from "../../authContext";

interface PatientRequest {
  id: number;
  title: string;
  issue: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  createdAt: string;
  volunteerId: number | null;
  autoSummary?: {
    id: number;
    content: string;
    generatedByAI: boolean;
  } | null;
}

interface Message {
  id: number;
  content: string;
  senderId: number;
  senderName: string;
  senderRole: "PATIENT" | "VOLUNTEER";
  createdAt: string;
  isRead: boolean;
}

export default function PatientDashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [showChat, setShowChat] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedRequestTitle, setSelectedRequestTitle] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [requestToResolve, setRequestToResolve] = useState<PatientRequest | null>(null);
  const [showResolveSuccess, setShowResolveSuccess] = useState(false);
  const [resolvedRequestTitle, setResolvedRequestTitle] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);



useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    const storedToken = sessionStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
  }, []);
 useEffect(() => {
  const storedUser = sessionStorage.getItem('user');
  const storedToken = sessionStorage.getItem('token');

  if (!storedUser || !storedToken) {
    router.replace('/signin')
    return;
  }

  try {
    const userData = JSON.parse(storedUser);
    if (userData.role !== 'PATIENT') {
      router.replace('/signin')
      return;
    }

    setUser(userData);
    setToken(storedToken);
  } catch {
    router.replace('/signin')
  }
}, []);
useEffect(() => {
  if (!token) return;

  fetchRequests();
  fetchUnreadCount();
}, [token]);





  useEffect(() => {
    if (showChat && selectedRequestId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [showChat, selectedRequestId]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchRequests = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/patient/my_requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRequests(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedRequestId || !token) return;

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/chat/${selectedRequestId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(response.data.data || []);
      fetchUnreadCount();
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const fetchUnreadCount = async () => {
    if (!token) return;

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/chat/unread/count`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUnreadCount(response.data.data?.unreadCount || 0);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedRequestId || sendingMessage) return;

    setSendingMessage(true);

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/chat`,
        {
          requestId: selectedRequestId,
          content: newMessage.trim(),
          senderRole: "PATIENT",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setNewMessage("");
      await fetchMessages();
    } catch (err: any) {
      console.error("Failed to send message:", err);
      alert(err.response?.data?.msg || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const openChat = (request: PatientRequest) => {
    setSelectedRequestId(request.id);
    setSelectedRequestTitle(request.title);
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
    setSelectedRequestId(null);
    setSelectedRequestTitle("");
    setMessages([]);
    setNewMessage("");
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/patient/request`,
        {
          name: user?.name,
          age: user?.age,
          title: formData.title,
          email: user?.email,
          phone: user?.phoneno,
          issue: formData.description,
          userId: user?.id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setShowModal(false);
      setFormData({ title: "", description: "" });
      fetchRequests();
    } catch (err: any) {
      console.error('Request submission error:', err);
      setError(err.response?.data?.msg || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToChatbot = (request?: PatientRequest) => {
    if (request) {
      const context = encodeURIComponent(JSON.stringify({
        requestId: request.id,
        title: request.title,
        issue: request.issue,
        status: request.status,
        summary: request.autoSummary?.content || null,
      }));
      router.push(`/chatbot?context=${context}`);
    } else {
      router.push('/chatbot');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "IN_PROGRESS":
        return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "RESOLVED":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "CANCELLED":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      default:
        return "text-white/40 bg-white/5 border-white/10";
    }
  };

  const initiateResolve = (request: PatientRequest) => {
    setRequestToResolve(request);
    setShowResolveConfirm(true);
  };

  const confirmResolve = async () => {
    if (!requestToResolve) return;

    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/patient/resolve/${requestToResolve.id}`,
        { status: "RESOLVED" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setResolvedRequestTitle(requestToResolve.title);
      
      setShowResolveConfirm(false);
      setRequestToResolve(null);
      
      await fetchRequests();
      
      setShowResolveSuccess(true);
      
      setTimeout(() => {
        setShowResolveSuccess(false);
      }, 5000);
      
    } catch (err) {
      console.error("Failed to resolve request:", err);
      alert("Failed to resolve request. Please try again.");
      setShowResolveConfirm(false);
      setRequestToResolve(null);
    }
  };

  const cancelResolve = () => {
    setShowResolveConfirm(false);
    setRequestToResolve(null);
  };

  const handleUpdateStatus = async (requestId: number, status: string) => {
    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/patient/resolve/${requestId}`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchRequests();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="w-4 h-4" />;
      case "IN_PROGRESS":
        return <AlertCircle className="w-4 h-4" />;
      case "RESOLVED":
        return <CheckCircle className="w-4 h-4" />;
      case "CANCELLED":
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };



  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 bg-linear-to-br from-black via-zinc-950 to-black">
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

      {showResolveSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className="bg-green-500/10 border border-green-500/20 rounded-sm p-4 flex items-start gap-3 min-w-[320px] shadow-2xl backdrop-blur-xl">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-400 mb-1">Request Resolved</h4>
              <p className="text-xs text-white/70">
                "{resolvedRequestTitle}" has been marked as resolved successfully.
              </p>
            </div>
            <button
              onClick={() => setShowResolveSuccess(false)}
              className="text-white/50 hover:text-white/90 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    

      <div className="pt-25 relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-extralight tracking-wider text-white/95 mb-2">
            PATIENT DASHBOARD
          </h1>
          <div className="w-24 h-px bg-linear-to-r from-white/30 to-transparent mb-6" />
          <p className="text-white/50 tracking-wide">
            Manage your healthcare support requests
          </p>
        </div>

        <div className="mb-8 flex gap-4 flex-wrap">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-sm hover:bg-white/90 transition-all text-sm tracking-wider uppercase font-medium"
          >
            <Plus className="w-5 h-5" />
            RAISE NEW ISSUE
          </button>

          <button
            onClick={() => handleGoToChatbot()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-sm hover:bg-blue-500/20 hover:border-blue-500/30 transition-all text-sm tracking-wider uppercase font-medium"
          >
            <Bot className="w-5 h-5" />
            TALK TO AI ASSISTANT
          </button>
        </div>

        <div>
          <h2 className="text-2xl font-light tracking-wider text-white/90 mb-6">
            MY REQUESTS
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-sm p-12 text-center">
              <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 tracking-wide">
                No requests yet. Create your first request above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded p-6 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-4">
                      <h3 className="text-lg font-light text-white/90 mb-2 tracking-wide">
                        {request.title}
                      </h3>
                      <p className="text-sm text-white/50 leading-relaxed mb-3">
                        {request.issue}
                      </p>
                      {request.autoSummary && (
                        <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-3 h-3 text-blue-400" />
                            <span className="text-xs text-blue-400 font-medium tracking-wider uppercase">
                              AI Summary
                            </span>
                          </div>
                          <p className="text-xs text-white/60 leading-relaxed">
                            {request.autoSummary.content}
                          </p>
                        </div>
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs tracking-wider ${getStatusColor(request.status)}`}
                    >
                      {getStatusIcon(request.status)}
                      <span>{request.status.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-4 text-xs text-white/40">
                      <span className="tracking-wide">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                      {request.volunteerId && (
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          <span>Volunteer Assigned</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGoToChatbot(request)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded hover:bg-blue-500/20 transition-all text-xs tracking-wider uppercase"
                      >
                        <Bot className="w-4 h-4" />
                        ASK AI
                      </button>
                      
                      {request.status !== "RESOLVED" && request.status !== "CANCELLED" && (
                        <button
                          onClick={() => initiateResolve(request)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded hover:bg-green-500/20 transition-all text-xs tracking-wider uppercase"
                        >
                          <CheckCircle className="w-4 h-4" />
                          RESOLVE
                        </button>
                      )}

                      {request.volunteerId && request.status !== "RESOLVED" && request.status !== "CANCELLED" && (
                        <button
                          onClick={() => openChat(request)}
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded hover:bg-white/10 transition-all text-xs tracking-wider uppercase"
                        >
                          <MessageCircle className="w-4 h-4" />
                          CHAT WITH VOLUNTEER
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showResolveConfirm && requestToResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-sm p-8 max-w-md w-full mx-4">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-sm">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-light tracking-widest text-white/90 mb-2 uppercase">
                  Confirm Resolution
                </h2>
                <p className="text-sm text-white/60 leading-relaxed">
                  Are you sure you want to mark this request as resolved?
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-sm">
              <p className="text-sm font-medium text-white/80 mb-1">
                {requestToResolve.title}
              </p>
              <p className="text-xs text-white/50">
                {requestToResolve.issue.length > 100 
                  ? requestToResolve.issue.substring(0, 100) + "..."
                  : requestToResolve.issue
                }
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelResolve}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white/70 rounded-sm hover:bg-white/10 transition-all text-sm tracking-wider uppercase"
              >
                CANCEL
              </button>
              <button
                onClick={confirmResolve}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-sm hover:bg-green-600 transition-all text-sm tracking-wider uppercase font-medium"
              >
                CONFIRM RESOLVE
              </button>
            </div>
          </div>
        </div>
      )}

      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-sm w-full max-w-2xl h-150 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <MessageCircle className="w-5 h-5 text-white/70" />
                  <h2 className="text-xl font-light tracking-widest text-white/90 uppercase">
                    Chat with Volunteer
                  </h2>
                </div>
                <p className="text-xs text-white/50 ml-8">{selectedRequestTitle}</p>
              </div>
              <button
                onClick={closeChat}
                className="text-white/50 hover:text-white/90 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40 tracking-wide text-sm">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderRole === "PATIENT" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-sm p-4 ${
                          message.senderRole === "PATIENT"
                            ? "bg-white/10 border border-white/20"
                            : "bg-blue-500/10 border border-blue-500/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-white/70">
                            {message.senderName}
                          </span>
                          <span className="text-xs text-white/40">
                            ({message.senderRole})
                          </span>
                        </div>
                        <p className="text-sm text-white/90 leading-relaxed mb-2">
                          {message.content}
                        </p>
                        <span className="text-xs text-white/40">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-6 border-t border-white/10">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                  disabled={sendingMessage}
                  maxLength={2000}
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !newMessage.trim()}
                  className="px-6 py-3 bg-white text-black rounded-sm hover:bg-white/90 transition-all text-sm tracking-wider uppercase font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  SEND
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-sm p-8 max-w-lg w-full mx-4">
            <h2 className="text-2xl font-light tracking-widest text-white/90 mb-6 uppercase">
              Raise New Issue
            </h2>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-6">
              <div>
                <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                  Description
                </label>
                <textarea
                  rows={5}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Detailed description of what you need help with..."
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError("");
                    setFormData({ title: "", description: "" });
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white/70 rounded-sm hover:bg-white/10 transition-all text-sm tracking-wider uppercase"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-white text-black rounded-sm hover:bg-white/90 transition-all text-sm tracking-wider uppercase font-medium disabled:opacity-50"
                >
                  {submitting ? "SUBMITTING..." : "SUBMIT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}