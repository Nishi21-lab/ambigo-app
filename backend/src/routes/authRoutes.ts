import { Hono } from "hono";
import { register, login, getMe, officerLogin } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const authRouter = new Hono();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/officer/login", officerLogin);
authRouter.get("/me", authMiddleware, getMe);

export default authRouter;
