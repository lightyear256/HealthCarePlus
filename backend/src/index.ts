import express from "express";
import cors from "cors";
import { userRouter } from "./Routes/userRouter.js";
import { patientRouter } from "./Routes/patientRoute.js";
import { volunteerRouter } from "./Routes/volunteerRouter.js";
import { chatbotRouter } from "./Routes/chatbotRoute.js";
import { messageRouter } from "./Routes/chatRoute.js";

export const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/user", userRouter);
app.use("/patient", patientRouter);
app.use("/volunteer", volunteerRouter);
app.use("/chatbot", chatbotRouter);
app.use("/chat", messageRouter);
