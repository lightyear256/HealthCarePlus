"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  LogOut,
  FileText,
  Clock,
  CheckCircle,
  Eye,
  AlertCircle,
  User,
  ArrowRight,
  MessageCircle,
  Send,
  X,
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
  name: string;
  email: string;
  phone: string;
  age: string;
  autoSummary?: {
    id: number;
    content: string;
    generatedByAI: boolean;
  } | null;
  user: {
    name: string;
    email: string;
  };
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

export default function VolunteerDashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);  
  const [availableRequests, setAvailableRequests] = useState<PatientRequest[]>([]);
  const [myRequests, setMyRequests] = useState<PatientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"available" | "assigned">("available");
  const [selectedRequest, setSelectedRequest] = useState<PatientRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const [showChat, setShowChat] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedRequestTitle, setSelectedRequestTitle] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
  const checkAuth = () => {
    const storedUser = sessionStorage.getItem('user');
    const storedToken = sessionStorage.getItem('token');
    
    if (!storedUser || !storedToken) {
      router.replace('/signin')
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      if (userData.role !== 'VOLUNTEER') {
       router.replace('/signin')
        return;
      }
      
     setUser(userData);
    setToken(storedToken);
    } catch (error) {
      router.replace('/signin')
    }
  };

  checkAuth();
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
      const [availableRes, assignedRes] = await Promise.all([
        axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/volunteer/get_all_patient`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/volunteer/my_patients`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
      ]);
      setAvailableRequests(availableRes.data.data || []);
      setMyRequests(assignedRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
      setAvailableRequests([]);
      setMyRequests([]);
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
          senderRole: "VOLUNTEER",
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

  const handleTakeRequest = async (requestId: number) => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/volunteer/assign/${requestId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setShowModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      console.error("Failed to take request:", err);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="w-4 h-4" />;
      case "IN_PROGRESS":
        return <AlertCircle className="w-4 h-4" />;
      case "RESOLVED":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const RequestCard = ({
    request,
    showActions = false,
  }: {
    request: PatientRequest;
    showActions?: boolean;
  }) => (
    <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded p-6 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <h3 className="text-lg font-light text-white/90 mb-2 tracking-wide">
            {request.title}
          </h3>
          {request.autoSummary ? (
            <div className="mb-2">
              <p className="text-sm text-blue-400/80 leading-relaxed line-clamp-2 mb-1">
                {request.autoSummary.content}
              </p>
              <span className="text-xs text-blue-400/50 italic">AI Summary</span>
            </div>
          ) : (
            <p className="text-sm text-white/50 leading-relaxed line-clamp-2">
              {request.issue}
            </p>
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
          <div className="flex items-center gap-2">
            <User className="w-3 h-3" />
            <span>{request.user.name}</span>
          </div>
          <span className="tracking-wide">
            {new Date(request.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedRequest(request);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded hover:bg-white/10 transition-all text-xs tracking-wider uppercase"
          >
            <Eye className="w-4 h-4" />
            VIEW
          </button>
          {showActions && request.status === "IN_PROGRESS" && (
            <>
              <button
                onClick={() => openChat(request)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded hover:bg-blue-500/20 transition-all text-xs tracking-wider uppercase"
              >
                <MessageCircle className="w-4 h-4" />
                CHAT
              </button>
             
            </>
          )}
        </div>
      </div>
    </div>
  );

  

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

     
      <div className="pt-25 relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-extralight tracking-wider text-white/95 mb-2">
            VOLUNTEER DASHBOARD
          </h1>
          <div className="w-24 h-px bg-linear-to-r from-white/30 to-transparent mb-6" />
          <p className="text-white/50 tracking-wide">
            Help patients by taking on support requests
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-sm p-6">
            <div className="text-3xl font-light text-white/90 mb-2">
              {availableRequests.length}
            </div>
            <div className="text-xs text-white/40 tracking-widest uppercase">
              Available Requests
            </div>
          </div>
          <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-sm p-6">
            <div className="text-3xl font-light text-white/90 mb-2">
              {myRequests.filter((r) => r.status === "IN_PROGRESS").length}
            </div>
            <div className="text-xs text-white/40 tracking-widest uppercase">
              In Progress
            </div>
          </div>
          <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-sm p-6">
            <div className="text-3xl font-light text-white/90 mb-2">
              {myRequests.filter((r) => r.status === "RESOLVED").length}
            </div>
            <div className="text-xs text-white/40 tracking-widest uppercase">
              Resolved
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-8 border-b border-white/10">
          <button
            onClick={() => setActiveTab("available")}
            className={`px-6 py-3 text-sm tracking-wider uppercase transition-all ${
              activeTab === "available"
                ? "text-white/90 border-b-2 border-white/80"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            AVAILABLE REQUESTS
          </button>
          <button
            onClick={() => setActiveTab("assigned")}
            className={`px-6 py-3 text-sm tracking-wider uppercase transition-all ${
              activeTab === "assigned"
                ? "text-white/90 border-b-2 border-white/80"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            MY ASSIGNMENTS
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          </div>
        ) : activeTab === "available" ? (
          <div>
            {availableRequests.length === 0 ? (
              <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-sm p-12 text-center">
                <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 tracking-wide">
                  No available requests at the moment
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableRequests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {myRequests.length === 0 ? (
              <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-sm p-12 text-center">
                <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 tracking-wide">
                  You haven't taken any requests yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    showActions={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-sm w-full max-w-2xl h-150 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <MessageCircle className="w-5 h-5 text-white/70" />
                  <h2 className="text-xl font-light tracking-widest text-white/90 uppercase">
                    Chat with Patient
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
                      className={`flex ${message.senderRole === "VOLUNTEER" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-sm p-4 ${
                          message.senderRole === "VOLUNTEER"
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

      {showModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-sm p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-light tracking-widest text-white/90 uppercase">
                Request Details
              </h2>
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-sm border text-xs tracking-wider ${getStatusColor(selectedRequest.status)}`}
              >
                {getStatusIcon(selectedRequest.status)}
                {selectedRequest.status.replace('_', ' ')}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                  Title
                </label>
                <p className="text-white/90 tracking-wide">
                  {selectedRequest.title}
                </p>
              </div>

              {selectedRequest.autoSummary && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded p-4">
                  <label className="block text-xs text-blue-400/70 mb-2 tracking-wider uppercase">
                    AI Generated Summary
                  </label>
                  <p className="text-blue-400/90 leading-relaxed">
                    {selectedRequest.autoSummary.content}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                  Full Issue Description
                </label>
                <p className="text-white/70 leading-relaxed">
                  {selectedRequest.issue}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                    Patient Name
                  </label>
                  <p className="text-white/90">{selectedRequest.user.name}</p>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                    Patient Email
                  </label>
                  <p className="text-white/90">{selectedRequest.user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                    Age
                  </label>
                  <p className="text-white/90">{selectedRequest.age}</p>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                    Phone
                  </label>
                  <p className="text-white/90">{selectedRequest.phone}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                  Created Date
                </label>
                <p className="text-white/90">
                  {new Date(selectedRequest.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="flex gap-3 pt-6 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white/70 rounded-sm hover:bg-white/10 transition-all text-sm tracking-wider uppercase"
                >
                  CLOSE
                </button>
                {selectedRequest.status === "PENDING" && (
                  <button
                    onClick={() => handleTakeRequest(selectedRequest.id)}
                    className="flex-1 px-4 py-3 bg-white text-black rounded-sm hover:bg-white/90 transition-all text-sm tracking-wider uppercase font-medium flex items-center justify-center gap-2 group"
                  >
                    TAKE REQUEST
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
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
      `}</style>
    </div>
  );
}