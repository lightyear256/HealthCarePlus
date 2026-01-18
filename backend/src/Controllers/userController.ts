import { type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


export async function add_user(req: Request, res: Response) {
  try {
    const { name, email, password, role,age,phoneno } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        msg: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 5);

    const user=await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role ?? "PATIENT", 
        age,
        phoneno
      },
    });

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1d",
      },
    );

    res.json({
      success: true,
      msg: "User added successfully",
      user,
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Internal server error" + error,
    });
  }
}


export async function signin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(403).json({
        success: false,
        msg: "Incorrect password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role, 
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1d",
      },
    );

    res.json({
      success: true,
      msg: "Logged in successfully",
      token,
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
    });
  }
}
