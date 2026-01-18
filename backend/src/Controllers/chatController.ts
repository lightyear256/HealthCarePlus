import { type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";

type UserRole = "PATIENT" | "VOLUNTEER" | "ADMIN";
type MessageSender = "PATIENT" | "VOLUNTEER";

interface AuthenticatedRequest extends Request {
  body: {
    requestId: number;
    content: string;
    senderRole: MessageSender;
  };
  user?: {
    id: number;
    role: UserRole;
    name: string;
    email: string;
  };
}

export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const { requestId, content, senderRole } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        msg: "Authentication required",
      });
    }

    if (!requestId || !content || !senderRole) {
      return res.status(400).json({
        success: false,
        msg: "Request ID, content, and sender role are required",
      });
    }

    if (!content.trim()) {
      return res.status(400).json({
        success: false,
        msg: "Message content cannot be empty",
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        msg: "Message is too long. Maximum 2000 characters allowed.",
      });
    }

    if (userRole === "PATIENT" && senderRole !== "PATIENT") {
      return res.status(403).json({
        success: false,
        msg: "Patients can only send messages as PATIENT",
      });
    }

    if (userRole === "VOLUNTEER" && senderRole !== "VOLUNTEER") {
      return res.status(403).json({
        success: false,
        msg: "Volunteers can only send messages as VOLUNTEER",
      });
    }

    const patientRequest = await prisma.patientRequest.findUnique({
      where: { id: requestId },
      include: {
        user: true,
        volunteer: true,
      },
    });

    if (!patientRequest) {
      return res.status(404).json({
        success: false,
        msg: "Patient request not found",
      });
    }

    if (userRole === "PATIENT") {
      if (patientRequest.userId !== userId) {
        return res.status(403).json({
          success: false,
          msg: "You can only send messages for your own requests",
        });
      }

      if (!patientRequest.volunteerId) {
        return res.status(400).json({
          success: false,
          msg: "No volunteer assigned yet. Please wait for a volunteer to take your request.",
        });
      }
    }

    if (userRole === "VOLUNTEER") {
      if (patientRequest.volunteerId !== userId) {
        return res.status(403).json({
          success: false,
          msg: "You can only send messages for requests assigned to you",
        });
      }
    }

    if (patientRequest.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        msg: "Cannot send messages for cancelled requests",
      });
    }

    const message = await prisma.requestMessage.create({
      data: {
        content: content.trim(),
        sender: senderRole,
        senderId: userId,
        requestId: requestId,
        isRead: false,
      },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.json({
      success: true,
      msg: "Message sent successfully",
      data: {
        id: message.id,
        content: message.content,
        sender: message.sender,
        senderId: message.senderId,
        senderName: message.senderUser.name,
        senderRole: message.sender,
        createdAt: message.createdAt,
        isRead: message.isRead,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to send message",
    });
  }
}

export async function getMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        msg: "Authentication required",
      });
    }

    if (!requestId) {
      return res.status(400).json({
        success: false,
        msg: "Request ID is required",
      });
    }

    const patientRequest = await prisma.patientRequest.findUnique({
      where: { id: Number(requestId) },
    });

    if (!patientRequest) {
      return res.status(404).json({
        success: false,
        msg: "Patient request not found",
      });
    }

    if (userRole === "PATIENT" && patientRequest.userId !== userId) {
      return res.status(403).json({
        success: false,
        msg: "You can only view messages for your own requests",
      });
    }

    if (userRole === "VOLUNTEER" && patientRequest.volunteerId !== userId) {
      return res.status(403).json({
        success: false,
        msg: "You can only view messages for requests assigned to you",
      });
    }

    const messages = await prisma.requestMessage.findMany({
      where: {
        requestId: Number(requestId),
      },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const messagesToMarkAsRead = messages
      .filter((msg) => {
        if (userRole === "PATIENT") {
          return msg.sender === "VOLUNTEER" && !msg.isRead;
        } else if (userRole === "VOLUNTEER") {
          return msg.sender === "PATIENT" && !msg.isRead;
        }
        return false;
      })
      .map((msg) => msg.id);

    if (messagesToMarkAsRead.length > 0) {
      await prisma.requestMessage.updateMany({
        where: {
          id: { in: messagesToMarkAsRead },
        },
        data: {
          isRead: true,
        },
      });
    }

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      senderName: msg.senderUser.name,
      senderRole: msg.sender,
      createdAt: msg.createdAt,
      isRead: messagesToMarkAsRead.includes(msg.id) ? true : msg.isRead,
    }));

    res.json({
      success: true,
      data: formattedMessages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to fetch messages",
    });
  }
}

export async function getUnreadCount(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        msg: "Authentication required",
      });
    }

    let unreadCount = 0;

    if (userRole === "PATIENT") {
      const patientRequests = await prisma.patientRequest.findMany({
        where: { userId: userId },
        select: { id: true },
      });

      const requestIds = patientRequests.map((r) => r.id);

      if (requestIds.length > 0) {
        unreadCount = await prisma.requestMessage.count({
          where: {
            requestId: { in: requestIds },
            sender: "VOLUNTEER",
            isRead: false,
          },
        });
      }
    } else if (userRole === "VOLUNTEER") {
      const assignedRequests = await prisma.patientRequest.findMany({
        where: { volunteerId: userId },
        select: { id: true },
      });

      const requestIds = assignedRequests.map((r) => r.id);

      if (requestIds.length > 0) {
        unreadCount = await prisma.requestMessage.count({
          where: {
            requestId: { in: requestIds },
            sender: "PATIENT",
            isRead: false,
          },
        });
      }
    }

    res.json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to fetch unread count",
    });
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        msg: "Authentication required",
      });
    }

    if (!requestId) {
      return res.status(400).json({
        success: false,
        msg: "Request ID is required",
      });
    }

    const patientRequest = await prisma.patientRequest.findUnique({
      where: { id: Number(requestId) },
    });

    if (!patientRequest) {
      return res.status(404).json({
        success: false,
        msg: "Patient request not found",
      });
    }

    if (userRole === "PATIENT" && patientRequest.userId !== userId) {
      return res.status(403).json({
        success: false,
        msg: "Unauthorized",
      });
    }

    if (userRole === "VOLUNTEER" && patientRequest.volunteerId !== userId) {
      return res.status(403).json({
        success: false,
        msg: "Unauthorized",
      });
    }

    const senderToMarkAsRead = userRole === "PATIENT" ? "VOLUNTEER" : "PATIENT";

    await prisma.requestMessage.updateMany({
      where: {
        requestId: Number(requestId),
        sender: senderToMarkAsRead,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.json({
      success: true,
      msg: "Messages marked as read",
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to mark messages as read",
    });
  }
}

export async function deleteMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        msg: "Authentication required",
      });
    }

    if (!messageId) {
      return res.status(400).json({
        success: false,
        msg: "Message ID is required",
      });
    }

    const message = await prisma.requestMessage.findUnique({
      where: { id: Number(messageId) },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        msg: "Message not found",
      });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({
        success: false,
        msg: "You can only delete your own messages",
      });
    }

    await prisma.requestMessage.delete({
      where: { id: Number(messageId) },
    });

    res.json({
      success: true,
      msg: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to delete message",
    });
  }
}