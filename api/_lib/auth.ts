import { createHash, randomBytes } from "crypto";
import { airtable, TABLES } from "./airtable";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const newHash = createHash("sha256").update(password + salt).digest("hex");
  return newHash === hash;
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function verifySession(token: string | undefined) {
  if (!token) return null;
  const clean = token.replace("Bearer ", "");
  const records = await airtable.listAll(
    TABLES.EMPLOYEES,
    `CurrentValue.SessionToken = "${clean}"`
  );
  if (records.length === 0) return null;
  const emp = records[0];
  if (!emp.fields.Active) return null;
  return { id: emp.id, ...emp.fields };
}

export async function getEmployeeByEmail(email: string) {
  const records = await airtable.listAll(
    TABLES.EMPLOYEES,
    `CurrentValue.Email = "${email}"`
  );
  return records.length > 0 ? { id: records[0].id, ...records[0].fields } : null;
}

export function parseBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

export function sendJson(res: any, data: any, status = 200) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (res.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  res.status(status).json(data);
}
