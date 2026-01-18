import { Router } from "express";
import {
  getAvailablePatientRequests,
  assignPatientRequest,
  getMyAssignedPatients,
} from "../Controllers/volunteerController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

export const volunteerRouter = Router();

volunteerRouter.use(authMiddleware);

volunteerRouter.get("/get_all_patient", getAvailablePatientRequests);

volunteerRouter.post("/assign/:requestId", assignPatientRequest);

volunteerRouter.get("/my_patients", getMyAssignedPatients);
