import { Router } from "express";
import { requireAuth, userIdOf } from "../middleware/auth.js";
import { AuthService } from "../services/AuthService.js";
import { loginSchema, signupSchema } from "../schema/auth.schema.js";

export function authRoutes(auth: AuthService): Router {
  const router = Router();

  router.post("/signup", async (req, res) => {
    const result = await auth.signup(signupSchema.parse(req.body));
    res.status(201).json(result);
  });

  router.post("/login", async (req, res) => {
    res.json(await auth.login(loginSchema.parse(req.body)));
  });

  router.get("/profile", requireAuth(auth), async (_req, res) => {
    res.json({ user: await auth.me(userIdOf(res)) });
  });

  return router;
}
