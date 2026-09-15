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
