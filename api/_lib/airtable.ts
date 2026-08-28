const AIRTABLE_API = "https://api.airtable.com/v0";

function getConfig() {
  const pat = process.env.AIRTABLE_PAT;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!pat) throw new Error("AIRTABLE_PAT not configured");
  if (!baseId) throw new Error("AIRTABLE_BASE_ID not configured");
  return { pat, baseId };
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const { pat, baseId } = getConfig();
  const url = `${AIRTABLE_API}/${baseId}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Airtable ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const airtable = {
  async list(table: string, filterByFormula?: string, sort?: string, maxRecords?: number): Promise<{ id: string; fields: any }[]> {
    const params = new URLSearchParams();
    if (filterByFormula) params.set("filterByFormula", filterByFormula);
    if (sort) params.set("sort[0][field]", sort);
    if (maxRecords) params.set("maxRecords", String(maxRecords));
    const qs = params.toString();
    const data = await request<{ records: { id: string; fields: any }[]; offset?: string }>(
      `/${table}${qs ? "?" + qs : ""}`
    );
    return data.records || [];
  },

  async listAll(table: string, filterByFormula?: string): Promise<{ id: string; fields: any }[]> {
    let all: { id: string; fields: any }[] = [];
    let offset = "";
    do {
      const params = new URLSearchParams();
      if (filterByFormula) params.set("filterByFormula", filterByFormula);
      if (offset) params.set("offset", offset);
      const data = await request<{ records: { id: string; fields: any }[]; offset?: string }>(
        `/${table}?${params.toString()}`
      );
      all = all.concat(data.records || []);
      offset = data.offset || "";
    } while (offset);
    return all;
  },

  async create(table: string, fields: Record<string, any>) {
    return request<{ id: string; fields: any }>(`/${table}`, {
      method: "POST",
      body: JSON.stringify({ fields }),
    });
  },

  async createMany(table: string, records: Record<string, any>[]) {
    return request<{ records: { id: string; fields: any }[] }>(`/${table}`, {
      method: "POST",
      body: JSON.stringify({ records: records.map((fields) => ({ fields })) }),
    });
  },

  async update(table: string, id: string, fields: Record<string, any>) {
    return request<{ id: string; fields: any }>(`/${table}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    });
  },

  async updateMany(table: string, records: { id: string; fields: Record<string, any> }[]) {
    return request<{ records: { id: string; fields: any }[] }>(`/${table}`, {
      method: "PATCH",
      body: JSON.stringify({ records }),
    });
  },

  async remove(table: string, id: string) {
    return request<{ deleted: boolean; id: string }>(`/${table}/${id}`, {
      method: "DELETE",
    });
  },
};

// Table names
export const TABLES = {
  EMPLOYEES: "Employees",
  ENTRIES: "EOD_Entries",
  LEAVES: "Leaves",
  BADGES: "Game_Badges",
  EARNED_BADGES: "Earned_Badges",
  XP_LOG: "XP_Log",
  NOTIFICATIONS: "Notifications",
  SETTINGS: "App_Settings",
} as const;
