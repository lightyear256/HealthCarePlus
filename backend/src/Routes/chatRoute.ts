import { Router } from "express";
import {
  sendMessage,
  getMessages,
  getUnreadCount,
  markAsRead,
  deleteMessage,
} from "../Controllers/chatController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

export const messageRouter = Router();

messageRouter.use(authMiddleware);

messageRouter.get("/unread/count", getUnreadCount);

messageRouter.post("/", sendMessage);

messageRouter.get("/:requestId", getMessages);

messageRouter.patch("/:requestId/read", markAsRead);

messageRouter.delete("/:messageId", deleteMessage);

export default messageRouter;