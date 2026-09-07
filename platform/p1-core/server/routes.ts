import type { Express } from "express";
import { type Server } from "http";
import { registerApiRoutes } from "./routes/index";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  registerApiRoutes(app);
  return httpServer;
}
