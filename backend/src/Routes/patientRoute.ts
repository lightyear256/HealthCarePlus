import { Router } from "express";
import {
  patientSupport,
  patientResolveRequest,
  getMyPatientRequests,
  getPatientRequestById,
  patientAskQuery,
} from "../Controllers/patientController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

export const patientRouter = Router();

patientRouter.use(authMiddleware);

patientRouter.post("/request", patientSupport);
patientRouter.get("/my_requests", getMyPatientRequests);
patientRouter.get("/request/:requestId", getPatientRequestById);
patientRouter.patch("/resolve/:requestId", patientResolveRequest);

patientRouter.post("/ask_query/:requestId", patientAskQuery);
