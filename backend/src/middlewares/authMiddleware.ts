import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { prisma } from "../lib/prisma.js";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "ddd";

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      message: "Token missing, user not authenticated",
    });
  }
  try {
    const user = jwt.verify(token, JWT_SECRET);
    if (typeof user === "object" && "id" in user) {
      const newUser = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
      });
      if (!newUser) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user) {
        //@ts-ignore
        req.user = newUser;
        next();
      } else {
        res.status(403).json({
          message: "You are not logged in",
        });
      }
    }
  } catch (e) {
    return res.status(401).json({
      message: "Invalid or expired token",
      e,
    });
  }
}

export default authMiddleware;
