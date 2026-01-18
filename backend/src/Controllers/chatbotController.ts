import { type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Prisma } from "../../generated/prisma/index.js";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type UserRole = "PATIENT" | "VOLUNTEER" | "ADMIN";

interface AuthenticatedRequest extends Request {
  body: {
    question: string;
    sessionId?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    context?: {
      requestId?: number;
      title?: string;
      issue?: string;
      status?: string;
      summary?: string;
    };
    title?: string; 
  };
  user?: {
    id: number;
    role: UserRole;
    name: string;
    email: string;
  };
}

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "can't breathe",
  "can not breathe",
  "cannot breathe",
  "difficulty breathing",
  "severe bleeding",
  "suicide",
  "suicidal",
  "kill myself",
  "overdose",
  "heart attack",
  "stroke",
  "unconscious",
  "severe pain",
  "choking",
  "seizure",
];

const detectEmergency = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some((keyword) => lowerText.includes(keyword));
};

const generateSessionTitle = (message: string): string => {
  const maxLength = 50;
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength).trim() + "...";
};

export async function healthChatbot(req: AuthenticatedRequest, res: Response) {
  try {
    const { question, sessionId, context } = req.body;
    const userId = req.user?.id;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Valid question is required",
      });
    }

    if (question.length > 2000) {
      return res.status(400).json({
        success: false,
        msg: "Question is too long. Please keep it under 2000 characters.",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        msg: "Authentication required",
      });
    }

    let session;
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId: userId,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 10, 
          },
        },
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          msg: "Session not found",
        });
      }
    } else {
      const title = generateSessionTitle(question);

      session = await prisma.chatSession.create({
        data: {
          userId: userId,
          title: title,
          context: context 
            ? {
                requestId: context.requestId,
                title: context.title,
                issue: context.issue,
                status: context.status,
                summary: context.summary,
              }
            : Prisma.JsonNull,
        },
        include: {
          messages: true,
        },
      });
    }

    let conversationContext = "";
    if (session.messages && session.messages.length > 0) {
      conversationContext = session.messages
        .map((msg) => `${msg.role === "USER" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n");
    }

    let contextPrompt = "";
    if (context) {
      contextPrompt = `\n\nCONTEXT INFORMATION:
The user has an existing support request:
- Title: ${context.title}
- Issue: ${context.issue}
- Status: ${context.status}
${context.summary ? `- AI Summary: ${context.summary}` : ""}

Please take this context into account when providing your response.`;
    }

    const systemPrompt = `You are a compassionate healthcare support chatbot for an NGO helping patients.

IMPORTANT GUIDELINES:
- Provide helpful, accurate health information in simple, easy-to-understand language
- Be empathetic, supportive, and caring
- NEVER provide medical diagnoses or prescriptions
- NEVER replace professional medical advice
- Encourage users to consult healthcare professionals for serious concerns
- If a question is about emergencies (chest pain, severe bleeding, difficulty breathing, suicide), immediately advise calling emergency services
- Stay within the scope of general health information and emotional support
- You can provide information about symptoms, general wellness, healthy habits, and when to seek medical help
- Always prioritize user safety and wellbeing

RESPONSE FORMAT:
- Keep responses clear and concise (2-4 paragraphs maximum)
- Use empathetic language
- Break down complex medical information into simple terms
- Provide actionable advice when appropriate
- End with encouragement or next steps`;

    const fullPrompt = `${systemPrompt}${contextPrompt}

${conversationContext ? `Previous conversation:\n${conversationContext}\n\n` : ""}Current question: ${question}

Provide a helpful, caring response:`;

    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const result = await model.generateContent(fullPrompt);
    const aiResponse = result.response.text();

    if (!aiResponse) {
      throw new Error("AI failed to generate a response");
    }

    const isEmergency = detectEmergency(question);

    const userMessageMetadata: Prisma.InputJsonValue = {
      timestamp: new Date().toISOString(),
      questionLength: question.length,
    };

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "USER",
        content: question.trim(),
        metadata: userMessageMetadata,
        isEmergency: isEmergency,
      },
    });

    const assistantMessageMetadata: Prisma.InputJsonValue = {
      timestamp: new Date().toISOString(),
      responseLength: aiResponse.length,
    };

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "ASSISTANT",
        content: aiResponse,
        metadata: assistantMessageMetadata,
        isEmergency: isEmergency,
      },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        updatedAt: new Date(),
      },
    });

    const response: any = {
      success: true,
      message: aiResponse,
      sessionId: session.id,
    };

    if (isEmergency) {
      response.warning = "⚠️ EMERGENCY DETECTED: This seems like a medical emergency. Please call emergency services (911/112) immediately or visit the nearest hospital. Do not wait for online responses in emergency situations.";
    }

    res.json(response);
  } catch (error: any) {
    console.error("Chatbot error:", error);

    if (error.message?.includes("API key")) {
      return res.status(500).json({
        success: false,
        msg: "AI service configuration error. Please contact support.",
      });
    }

    if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
      return res.status(429).json({
        success: false,
        msg: "Service is currently busy. Please try again in a moment.",
      });
    }

    res.status(500).json({
      success: false,
      msg: "An error occurred while processing your request. Please try again." + error,
    });
  }
}

export async function getChatHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const { sessionId } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        msg: "Authentication required",
      });
    }

    if (sessionId && typeof sessionId === "string") {
      const session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId: userId,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          msg: "Session not found",
        });
      }

      const history = session.messages.map((msg) => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
        timestamp: msg.createdAt,
        isEmergency: msg.isEmergency,
      }));

      return res.json({
        success: true,
        history,
        sessionId: session.id,
        sessionTitle: session.title,
      });
    } else {
      const sessions = await prisma.chatSession.findMany({
        where: {
          userId: userId,
          isActive: true,
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1, 
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      const formattedSessions = sessions.map((session) => ({
        id: session.id,
        title: session.title,
        lastMessage: session.messages[0]?.content || "",
        timestamp: session.updatedAt,
        messageCount: session._count.messages,
        context: session.context,
      }));

      return res.json({
        success: true,
        sessions: formattedSessions,
      });
    }
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to fetch chat history",
    });
  }
}

export async function deleteChatHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const { sessionId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        msg: "Authentication required",
      });
    }

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({
        success: false,
        msg: "Valid session ID is required",
      });
    }

    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId: userId,
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        msg: "Session not found",
      });
    }

    await prisma.chatSession.delete({
      where: {
        id: sessionId,
      },
    });

    res.json({
      success: true,
      msg: "Chat session deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting chat history:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to delete chat history",
    });
  }
}

export async function getSessionDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        msg: "Authentication required",
      });
    }

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({
        success: false,
        msg: "Valid session ID is required",
      });
    }

    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId: userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        msg: "Session not found",
      });
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session._count.messages,
        context: session.context,
        messages: session.messages.map((msg) => ({
          id: msg.id,
          role: msg.role.toLowerCase(),
          content: msg.content,
          timestamp: msg.createdAt,
          isEmergency: msg.isEmergency,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching session details:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to fetch session details",
    });
  }
}

export async function updateSessionTitle(req: AuthenticatedRequest, res: Response) {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        msg: "Authentication required",
      });
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Valid title is required",
      });
    }

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({
        success: false,
        msg: "Valid session ID is required",
      });
    }

    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId: userId,
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        msg: "Session not found",
      });
    }

    const updatedSession = await prisma.chatSession.update({
      where: {
        id: sessionId,
      },
      data: {
        title: title.trim(),
      },
    });

    res.json({
      success: true,
      msg: "Session title updated successfully",
      session: {
        id: updatedSession.id,
        title: updatedSession.title,
      },
    });
  } catch (error) {
    console.error("Error updating session title:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to update session title",
    });
  }
}