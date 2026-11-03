export const categories = [
  "All items",
  "Electronics",
  "Bags",
  "Bottles",
  "Accessories",
  "Books",
  "Keys",
  "Documents",
  "Other",
];
export const locations = [
  "Central Library",
  "Technology Tower",
  "SJT Building",
  "Food Court",
  "Main Gate",
  "Sports Complex",
  "Men’s Hostel",
  "Women’s Hostel",
  "Other",
];
export type Profile = {
  id: string;
  name: string;
  avatar: string;
  course: string;
  year: string;
  bio: string;
  role: "member" | "moderator";
};
export const initialsOf = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "V";
export type Report = {
  id: string;
  owner: string;
  type: "lost" | "found";
  title: string;
  description: string;
  category: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  locationNote?: string;
  color: string;
  date: string;
  image: string;
  status: "open" | "returned" | "hidden";
  createdAt: number;
};
export type Claim = {
  id: string;
  reportId: string;
  claimant: string;
  proof: string;
  status: "pending" | "approved" | "rejected" | "completed";
  createdAt: number;
  code?: string;
};
export type Message = {
  id: string;
  claimId: string;
  sender: string;
  text: string;
  createdAt: number;
};
export type Notice = {
  id: string;
  recipient: string;
  text: string;
  reportId: string;
  read: number;
  createdAt: number;
};
export type Audit = {
  id: string;
  actor: string;
  action: string;
  reportId: string;
  createdAt: number;
};
export type AppState = {
  user: Profile & { email: string };
  members: Pick<Profile, "id" | "name" | "avatar">[];
  reports: Report[];
  claims: Claim[];
  messages: Message[];
  saved: string[];
  notifications: Notice[];
  audit: Audit[];
  stats: {
    open: number;
    returned: number;
    claims: number;
  };
};
export const dateLabel = (time: number) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(
    time,
  );
export function findMatches(report: Report, reports: Report[]) {
  const words = new Set(
    (report.title + " " + report.description)
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3),
  );
  return reports
    .filter(
      (r) =>
        r.type !== report.type && r.status === "open" && r.id !== report.id && r.category === report.category,
    )
    .map((r) => {
      const reasons: string[] = [];
      let score = 0;
      if (r.category === report.category) {
        score += 4;
        reasons.push("Same category");
      }
      if (r.location === report.location) {
        score += 3;
        reasons.push("Same location");
      }
      if (r.color && r.color.toLowerCase() === report.color.toLowerCase()) {
        score += 2;
        reasons.push("Same colour");
      }
      if (
        (r.title + " " + r.description)
          .toLowerCase()
          .split(/\W+/)
          .some((w) => words.has(w))
      ) {
        score += 2;
        reasons.push("Similar description");
      }
      return { report: r, score, reasons };
    })
    .filter((m) => m.score >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

// Model similarity is a suggestion, never proof that two photos show the same item.
export function cosineSimilarity(a: readonly number[], b: readonly number[]) {
  if (a.length !== 512 || b.length !== 512) return null;
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) return null;
    dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2;
  }
  return aa > 0 && bb > 0 ? Math.max(-1, Math.min(1, dot / Math.sqrt(aa * bb))) : null;
}

export function distanceMetres(a: Pick<Report, "latitude" | "longitude">, b: Pick<Report, "latitude" | "longitude">) {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
  const rad = Math.PI / 180;
  const v = Math.sin((b.latitude-a.latitude)*rad/2)**2 + Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin((b.longitude-a.longitude)*rad/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(Math.max(0, 1-v)));
}
