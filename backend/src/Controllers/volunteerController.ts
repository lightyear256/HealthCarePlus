import { type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
export async function getAvailablePatientRequests(req: Request, res: Response) {
  try {
    const user = req.user;

    if (!user || user.role !== "VOLUNTEER") {
      return res.status(403).json({
        success: false,
        msg: "Only volunteers can access this",
      });
    }

    const requests = await prisma.patientRequest.findMany({
      where: {
        status: "PENDING",
        volunteerId: null,
      },
      include: {
        autoSummary: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
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

export async function assignPatientRequest(req: Request, res: Response) {
  try {
    const user = req.user;
    const { requestId } = req.params;

    if (!user || user.role !== "VOLUNTEER") {
      return res.status(403).json({
        success: false,
        msg: "Only volunteers can assign requests",
      });
    }

    const request = await prisma.patientRequest.findUnique({
      where: { id: Number(requestId) },
    });

    if (!request || request.volunteerId !== null) {
      return res.status(400).json({
        success: false,
        msg: "Request already assigned or not found",
      });
    }

    await prisma.patientRequest.update({
      where: { id: request.id },
      data: {
        volunteerId: user.id,
        status: "IN_PROGRESS",
      },
    });

    res.json({
      success: true,
      msg: "Request assigned successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
    });
  }
}

export async function getMyAssignedPatients(req: Request, res: Response) {
  try {
    const user = req.user;

    if (!user || user.role !== "VOLUNTEER") {
      return res.status(403).json({
        success: false,
        msg: "Only volunteers can access this",
      });
    }

    const requests = await prisma.patientRequest.findMany({
      where: {
        volunteerId: user.id,
      },
      include: {
        autoSummary: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
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
