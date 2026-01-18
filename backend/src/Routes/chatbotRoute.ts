import { Router } from "express";
import { 
  healthChatbot, 
  getChatHistory, 
  deleteChatHistory,
  getSessionDetails,
  updateSessionTitle
} from "../Controllers/chatbotController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

export const chatbotRouter = Router();

chatbotRouter.use(authMiddleware);

chatbotRouter.post("/", healthChatbot);

chatbotRouter.get("/history", getChatHistory);

chatbotRouter.delete("/history", deleteChatHistory);

chatbotRouter.get("/session/:sessionId", getSessionDetails);

chatbotRouter.patch("/session/:sessionId/title", updateSessionTitle);

export default chatbotRouter;