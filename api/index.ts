
import { verifySession, parseBody } from "./_lib/auth";
import {
  handleLogin,
  handleChangePassword,
  handleForgotPassword,
  handleGetEmployees,
  handleGetEntries,
  handleCreateEntry,
  handleRateEntry,
  handleGetLeaves,
  handleCreateLeave,
  handleDeleteLeave,
  handleGetGamification,
  handleGetNotifications,
  handleMarkNotificationRead,
  handleGetPasswordResets,
  handleApprovePasswordReset,
  handleResetEmployeePassword,
  handleSeed,
} from "./_lib/handlers";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  const path = (req.query.path as string[])?.join("/") || "";
  const method = req.method || "GET";

  try {
    if (path === "auth/login" && method === "POST") {
      const body = await parseBody(req as any);
      const result = await handleLogin(body);
      return res.status(result.status).json(result.data);
    }
    if (path === "auth/forgot-password" && method === "POST") {
      const body = await parseBody(req as any);
      const result = await handleForgotPassword(body);
      return res.status(result.status).json(result.data);
    }
    if (path === "seed" && method === "POST") {
      const result = await handleSeed();
      return res.status(result.status).json(result.data);
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    const emp = await verifySession(token);
    if (!emp) return res.status(401).json({ error: "Unauthorized" });

    if (path === "auth/change-password" && method === "POST") {
      const body = await parseBody(req as any);
      const result = await handleChangePassword(body, emp);
      return res.status(result.status).json(result.data);
    }
    if (path === "notifications" && method === "GET") {
      const result = await handleGetNotifications(req.query as any);
      return res.status(result.status).json(result.data);
    }
    if (path.startsWith("notifications/") && path.endsWith("/read") && method === "POST") {
      const id = path.split("/")[1];
      const result = await handleMarkNotificationRead(id);
      return res.status(result.status).json(result.data);
    }
    if (path === "password-resets" && method === "GET") {
      const result = await handleGetPasswordResets();
      return res.status(result.status).json(result.data);
    }
    if (path === "password-resets/approve" && method === "POST") {
      const body = await parseBody(req as any);
      const result = await handleApprovePasswordReset(body);
      return res.status(result.status).json(result.data);
    }
    if (path === "employees/reset-password" && method === "POST") {
      const body = await parseBody(req as any);
      const result = await handleResetEmployeePassword(body);
      return res.status(result.status).json(result.data);
    }
    if (path === "employees" && method === "GET") {
      const result = await handleGetEmployees();
      return res.status(result.status).json(result.data);
    }
    if (path === "entries" && method === "GET") {
      const result = await handleGetEntries(req.query as any);
      return res.status(result.status).json(result.data);
    }
    if (path === "entries" && method === "POST") {
      const body = await parseBody(req as any);
      const result = await handleCreateEntry(body);
      return res.status(result.status).json(result.data);
    }
    if (path === "entries/rate" && method === "POST") {
      const body = await parseBody(req as any);
      const result = await handleRateEntry(body);
      return res.status(result.status).json(result.data);
    }
    if (path === "leaves" && method === "GET") {
      const result = await handleGetLeaves(req.query as any);
      return res.status(result.status).json(result.data);
    }
    if (path === "leaves" && method === "POST") {
      const body = await parseBody(req as any);
      const result = await handleCreateLeave(body);
      return res.status(result.status).json(result.data);
    }
    if (path.startsWith("leaves/") && method === "DELETE") {
      const id = path.split("/")[1];
      const result = await handleDeleteLeave(id);
      return res.status(result.status).json(result.data);
    }
    if (path === "gamification" && method === "GET") {
      const result = await handleGetGamification(req.query as any);
      return res.status(result.status).json(result.data);
    }

    return res.status(404).json({ error: "Not found" });
  } catch (err: any) {
    console.error("API Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
