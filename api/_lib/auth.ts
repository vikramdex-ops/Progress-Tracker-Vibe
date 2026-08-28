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

/** Escape special characters for Airtable formula strings */
function escapeFormula(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function verifySession(token: string | undefined) {
  if (!token) return null;
  const clean = token.replace("Bearer ", "").trim();
  if (!clean) return null;

  try {
    // Airtable filterByFormula with CurrentValue for Data API
    const records = await airtable.list(
      TABLES.EMPLOYEES,
      `CurrentValue.SessionToken = "${escapeFormula(clean)}"`
    );
    if (records.length === 0) return null;
    const emp = records[0];
    if (!emp.fields.Active) return null;
    return { id: emp.id, ...emp.fields };
  } catch (err) {
    console.error("Session verification failed:", err);
    return null;
  }
}

/**
 * Find employee by email OR name — handles case-insensitive matching,
 * whitespace trimming, and fallback lookup.
 */
export async function getEmployeeByEmail(emailOrName: string) {
  const clean = emailOrName.trim();
  if (!clean) return null;

  try {
    // Strategy 1: Exact email match (case-insensitive via lower())
    let records = await airtable.list(
      TABLES.EMPLOYEES,
      `LOWER(CurrentValue.Email) = "${escapeFormula(clean.toLowerCase())}"`
    );
    if (records.length > 0) {
      return { id: records[0].id, ...records[0].fields };
    }

    // Strategy 2: Partial email match (user typed part of email)
    records = await airtable.list(
      TABLES.EMPLOYEES,
      `SEARCH("${escapeFormula(clean.toLowerCase())}", LOWER(CurrentValue.Email))`
    );
    if (records.length > 0) {
      return { id: records[0].id, ...records[0].fields };
    }

    // Strategy 3: Name match (exact, case-insensitive)
    records = await airtable.list(
      TABLES.EMPLOYEES,
      `LOWER(CurrentValue.Name) = "${escapeFormula(clean.toLowerCase())}"`
    );
    if (records.length > 0) {
      return { id: records[0].id, ...records[0].fields };
    }

    // Strategy 4: Partial name match
    records = await airtable.list(
      TABLES.EMPLOYEES,
      `SEARCH("${escapeFormula(clean.toLowerCase())}", LOWER(CurrentValue.Name))`
    );
    if (records.length > 0) {
      return { id: records[0].id, ...records[0].fields };
    }

    return null;
  } catch (err) {
    console.error("Employee lookup failed:", err);
    return null;
  }
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
