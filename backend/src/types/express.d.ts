export {};

interface JwtUser {
  id: number;
  role: "PATIENT" | "VOLUNTEER" | "ADMIN";
  name: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}
