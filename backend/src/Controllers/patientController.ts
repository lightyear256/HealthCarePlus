import { type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);


export async function patientSupport(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== "PATIENT") {
      return res.status(403).json({
        success: false,
        msg: "Only patients can create requests",
      });
    }

    const { name, age, email, phone, issue, title } = req.body;

    const patientRequest = await prisma.patientRequest.create({
      data: {
        name,
        age,
        email,
        phone,
        title,
        issue,
        userId: req.user.id,
      },
    });

    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash", 
    });

    const prompt = `
Summarize the following patient issue in simple terms (3–4 lines).
Avoid medical jargon.

Issue:
${issue}
`;

    const result = await model.generateContent(prompt);
    const summaryText = result.response.text();

    await prisma.autoSummary.create({
      data: {
        content: summaryText,
        generatedByAI: true,
        patientRequest: {
          connect: { id: patientRequest.id },
        },
      },
    });

    res.json({
      success: true,
      msg: "Ticket raised successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Internal server error " + error,
    });
  }
}
export async function patientResolveRequest(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== "PATIENT") {
      return res.status(403).json({
        success: false,
        msg: "Only patients can resolve requests",
      });
    }

    const { requestId } = req.params;

    const request = await prisma.patientRequest.findUnique({
      where: { id: Number(requestId) },
    });

    if (!request || request.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        msg: "You can resolve only your own request",
      });
    }

    await prisma.patientRequest.update({
      where: { id: request.id },
      data: { status: "RESOLVED" },
    });

    res.json({
      success: true,
      msg: "Request resolved successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
    });
  }
}

export async function getMyPatientRequests(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== "PATIENT") {
      return res.status(403).json({
        success: false,
        msg: "Only patients can access this",
      });
    }

    const requests = await prisma.patientRequest.findMany({
      where: { userId: req.user.id },
      include: { autoSummary: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
    });
  }
}

export async function getPatientRequestById(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== "PATIENT") {
      return res.status(403).json({
        success: false,
        msg: "Only patients can access this",
      });
    }

    const { requestId } = req.params;

    const request = await prisma.patientRequest.findUnique({
      where: { id: Number(requestId) },
      include: { autoSummary: true },
    });

    if (!request || request.userId !== req.user.id) {
      return res.status(404).json({
        success: false,
        msg: "Request not found",
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
    });
  }
}

export async function patientAskQuery(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== "PATIENT") {
      return res.status(403).json({
        success: false,
        msg: "Only patients can ask queries",
      });
    }

    const { requestId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        msg: "Message is required",
      });
    }

    const request = await prisma.patientRequest.findUnique({
      where: { id: Number(requestId) },
    });

    if (!request || request.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        msg: "You can ask queries only for your own request",
      });
    }

    await prisma.requestMessage.create({
      data: {
        content: message,
        sender: "PATIENT",
        senderId: req.user.id,
        requestId: request.id,
      },
    });

    res.json({
      success: true,
      msg: "Query sent to volunteer successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
    });
  }
}
