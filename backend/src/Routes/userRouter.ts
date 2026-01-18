import { Router } from "express";
import { add_user, signin } from "../Controllers/userController.js";

export const userRouter=Router();

userRouter.post('/register',add_user);
userRouter.post('/login',signin);