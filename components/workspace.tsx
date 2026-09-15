"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Search,
  Compass,
  Sparkles,
  FolderHeart,
  Bookmark,
  MessageCircle,
  ShieldCheck,
  Plus,
  MapPin,
  ArrowUpRight,
  Bell,
  ChevronDown,
  HeartHandshake,
  Package,
  SlidersHorizontal,
  Check,
  ArrowLeft,
  Send,
  Upload,
  LoaderCircle,
  X,
  Clock,
  Flag,
  CheckCircle2,
  LockKeyhole,
  ChevronRight,
  RefreshCw,
  BookOpen,
  Info,
  Settings2,
  EyeOff,
  Download,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  categories,
  locations,
  initialsOf,
  type Profile,
  dateLabel,
  findMatches,
  type Report,
  type AppState,
  type Claim,
} from "@/lib/domain";
import AccountProfile from "@/components/account-profile";
const nav = [
  { id: "explore", label: "Explore", icon: Compass },
  { id: "matches", label: "Matches", icon: Sparkles },
  { id: "reports", label: "My reports", icon: FolderHeart },
  { id: "saved", label: "Saved items", icon: Bookmark },
  { id: "messages", label: "Messages", icon: MessageCircle },
];
const viewTitles: Record<string, [string, string]> = {
  explore: [
    "Lost it? Let’s find it.",
    "Your next reunion could be right here.",
  ],
  matches: [
    "A familiar find?",
    "Possible connections for the things you’ve lost.",
  ],
  reports: [
    "Your items, their journey.",
    "Follow your reports and keep track of your claims.",
  ],
  saved: [
    "Keep an eye on these.",
    "The items you’ve bookmarked, all in one place.",
  ],
  messages: [
    "A conversation closer.",
    "Work out the details of a safe return.",
  ],
  desk: [
    "Incoming claims.",
    "Review ownership details for items you found and arrange a safe return.",
  ],
};
function Choice({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="choice">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Blank({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Empty className="empty-state">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action}
    </Empty>
  );
}
function Photo({ report, large = false }: { report: Report; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`item-photo photo-${report.id} ${large ? "large-photo" : ""}`}
    >
      {report.image && !failed ? (
        <img
          src={report.image}
          alt={report.title}
          loading={large ? "eager" : "lazy"}
          onError={() => setFailed(true)}
        />
      ) : (
        <Package size={64} strokeWidth={1} />
      )}
      <span
        className={
          "status-tag " +
          (report.status === "returned" ? "returned" : report.type)
        }
      >
        {report.status === "returned"
          ? "Reunited"
          : report.status === "hidden"
            ? "Hidden"
            : report.type}
      </span>
    </div>
  );
}
function SideNavigation({
  view,
  go,
  onHelp,
  onProfile,
  account,
  matches,
}: {
  view: string;
  go: (v: string) => void;
  onHelp: () => void;
  onProfile: () => void;
  account: Profile & { initials: string };
  matches: number;
}) {
  const { setOpenMobile } = useSidebar();
  function move(v: string) {
    go(v);
    setOpenMobile(false);
  }
  return (
    <Sidebar className="app-sidebar">
      <SidebarHeader>
        <a className="brand" href="/" aria-label="VITFind home">
          <span className="brand-mark">
            <Search />
          </span>
          VIT<span>Find</span>
          <i />
        </a>
      </SidebarHeader>
      <SidebarContent>
        <div className="campus">
          <span className="campus-icon">V</span>
          <div>
            VIT Vellore<small>Your campus community</small>
          </div>
          <ChevronDown size={16} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <SidebarMenu>
          {nav.map((n) => (
            <SidebarMenuItem key={n.id}>
              <SidebarMenuButton
                className={view === n.id ? "nav-active" : ""}
                isActive={view === n.id}
                onClick={() => move(n.id)}
              >
                <n.icon />
                <span>{n.label}</span>
                {n.id === "matches" && matches > 0 && (
                  <b className="nav-count">{matches}</b>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <div className="side-help">
          <HeartHandshake />
          <strong>A little help. A big relief.</strong>
          <p>Found something? Make someone’s day by bringing it back.</p>
          <button onClick={onHelp}>
            How it works <ArrowUpRight size={15} />
          </button>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuButton
          className={view === "desk" ? "nav-active" : ""}
          onClick={() => move("desk")}
        >
          <ShieldCheck />
          <span>Incoming claims</span>
        </SidebarMenuButton>
        <button className="profile" onClick={onProfile} disabled={!account.id}>
          <span className="avatar">{account.avatar ? <img src={account.avatar} alt="" /> : account.initials}</span>
          <div>
            {account.name}
            <small>{account.role === "moderator" ? "Moderator" : "Campus member"}</small>
          </div>
          <ChevronDown size={15} />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
export default function Workspace({ signInPath, signOutPath }: { signInPath: string; signOutPath: string }) {
  const [data, setData] = useState<AppState | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [unauthorized, setUnauthorized] = useState(false),
    [view, setView] = useState("explore"),
    [query, setQuery] = useState(""),
    [type, setType] = useState("all"),
    [category, setCategory] = useState("All items"),
    [location, setLocation] = useState("All locations"),
    [status, setStatus] = useState("Open items"),
    [sort, setSort] = useState("Newest first"),
    [filterOpen, setFilterOpen] = useState(false),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string | null>(null),
    [reportOpen, setReportOpen] = useState(false),
    [editReport, setEditReport] = useState<Report | null>(null),
    [prefill, setPrefill] = useState<Partial<Report>>({}),
    [info, setInfo] = useState(false),
    [profileOpen, setProfileOpen] = useState(false),
    [noticesOpen, setNoticesOpen] = useState(false),
    [claimFor, setClaimFor] = useState<Report | null>(null),
    [claimProof, setClaimProof] = useState(""),
    [activeChat, setActiveChat] = useState<string | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [handover, setHandover] = useState<Claim | null>(null),
    [handoverCode, setHandoverCode] = useState(""),
    [flagFor, setFlagFor] = useState<string | null>(null),
    [flagReason, setFlagReason] = useState("");
  const inFlight = useRef(false),
    generation = useRef(0),
    requestSequence = useRef(0),
    claimKey = useRef("");
  const load = useCallback(async (quiet = false) => {
    const gen = generation.current;
    const sequence = ++requestSequence.current;
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      const result = (await r.json()) as AppState & { error: string };
      if (gen !== generation.current || sequence !== requestSequence.current) return;
      if (!r.ok) {
        if (r.status === 401) { setData(null); setSelected(null); setActiveChat(null); setMessage(""); setClaimFor(null); setFlagFor(null); setHandover(null); setProfileOpen(false); setNoticesOpen(false); setReportOpen(false); setEditReport(null); }
        setUnauthorized(r.status === 401);
        throw Error(result.error);
      }
      setData(result);
      setError("");
      setUnauthorized(false);
    } catch (e) {
      if (!quiet && gen === generation.current && sequence === requestSequence.current)
        setError(e instanceof Error ? e.message : "Could not load the board.");
    } finally {
      if (gen === generation.current && sequence === requestSequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !inFlight.current)
        void load(true);
    }, 15000);
    const pop = () => {
      const p = new URLSearchParams(window.location.search);
      setView(viewTitles[p.get("view") ?? ""] ? p.get("view")! : "explore");
      setSelected(p.get("item"));
    };
    pop();
    window.addEventListener("popstate", pop);
    return () => {
      clearInterval(timer);
      window.removeEventListener("popstate", pop);
    };
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [query, type, category, location, status, view, sort]);
  useEffect(() => {
    setMessage("");
  }, [activeChat, data?.user.id]);
  async function action(payload: Record<string, unknown>, success?: string) {
    if (inFlight.current) return false;
    inFlight.current = true;
    requestSequence.current++;
    setBusy(true);
    try {
      const r = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await r.json()) as {
        error: string;
        id?: string;
        ok?: boolean;
      };
      if (!r.ok) { if (r.status === 401) await load(); throw Error(result.error); }
      await load();
      if (success) toast.success(success);
      return result;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "That didn’t save. Please try again.",
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function go(next: string) {
    setView(next);
    setSelected(null);
    setActiveChat(null);
    setQuery("");
    setCategory("All items");
    setLocation("All locations");
    setType("all");
    setStatus(
      next === "reports" || next === "saved" ? "All statuses" : "Open items",
    );
    window.history.pushState(
      {},
      "",
      next === "explore" ? "/" : "/?view=" + next,
    );
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function openItem(id: string) {
    setSelected(id);
    window.history.replaceState(
      {},
      "",
      `/?view=${view}&item=${encodeURIComponent(id)}`,
    );
  }
  function closeItem() {
    setSelected(null);
    window.history.replaceState(
      {},
      "",
      view === "explore" ? "/" : "/?view=" + view,
    );
  }
  function newReport(options: Partial<Report> = {}) {
    setEditReport(null);
    setPrefill(options);
    setReportOpen(true);
  }
  const account = { ...(data?.user ?? { id:"", name:"Your profile", avatar:"", course:"", year:"", bio:"", email:"", role:"member" as const }), initials:initialsOf(data?.user.name ?? "VITFind") };
  const isModerator = account.role === "moderator";
  const nameOf = (id:string) => data?.members.find(p=>p.id===id)?.name ?? "Campus member";
  const all = data?.reports ?? [];
  const selectedReport = all.find((r) => r.id === selected);
  const myReports = all.filter((r) => r.owner === account.id);
  const matches = myReports
    .filter((r) => r.status === "open" && r.type === "lost")
    .flatMap((r) => findMatches(r, all).map((m) => ({ ...m, source: r })));
  const unread = data?.notifications.filter((n) => !n.read).length ?? 0;
  const myClaims = data?.claims.filter((c) => c.claimant === account.id) ?? [];
  const reviewClaims = data?.claims.filter(c => c.claimant !== account.id && (isModerator || all.some(r=>r.id===c.reportId && r.owner===account.id))) ?? [];
  const currentChat = data?.claims.find((c) => c.id === activeChat);
  const title = viewTitles[view] ?? viewTitles.explore;
  const filtered = all
    .filter(
      (r) =>
        (view !== "saved" || data?.saved.includes(r.id)) &&
        (view !== "reports" || r.owner === account.id) &&
        (status === "All statuses"
          ? r.status !== "hidden" || view === "reports"
          : status === "Reunited"
            ? r.status === "returned"
            : r.status === "open") &&
        (type === "all" || r.type === type) &&
        (category === "All items" || r.category === category) &&
        (location === "All locations" || r.location === location) &&
        `${r.title} ${r.description} ${r.location} ${r.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Oldest first"
        ? a.createdAt - b.createdAt
        : b.createdAt - a.createdAt,
    );
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "search_campus_items",
          title: "Search campus items",
          description:
            "Filter the visible campus board by keyword; does not create or modify reports.",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string", maxLength: 100 } },
            required: ["query"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          execute: (input: unknown) => {
            const x = input as {
              query: unknown;
            };
            if (typeof x?.query !== "string" || x.query.length > 100)
              throw Error("query must be a string of at most 100 characters");
            go("explore");
            setQuery(x.query);
            return {
              query: x.query,
              items: all
                .filter(
                  (r) =>
                    r.status === "open" &&
                    `${r.title} ${r.description} ${r.location}`
                      .toLowerCase()
                      .includes((x.query as string).toLowerCase()),
                )
                .map((r) => ({ id: r.id, title: r.title, type: r.type })),
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [all]);
  function card(r: Report) {
    return (
      <article className="item-card" key={r.id}>
        <div className="card-image-wrap">
          <button
            className="image-open"
            onClick={() => openItem(r.id)}
            aria-label={"View " + r.title}
          >
            <Photo report={r} />
          </button>
          <button
            disabled={busy}
            className={
              "save-btn " + (data?.saved.includes(r.id) ? "is-saved" : "")
            }
            aria-label={
              (data?.saved.includes(r.id) ? "Unsave " : "Save ") + r.title
            }
            aria-pressed={data?.saved.includes(r.id)}
            onClick={() =>
              void action({
                action: "save",
                reportId: r.id,
                saved: !data?.saved.includes(r.id),
              })
            }
          >
            <Bookmark
              size={18}
              fill={data?.saved.includes(r.id) ? "currentColor" : "none"}
            />
          </button>
        </div>
        <div className="card-content">
          <span className="card-category">{r.category}</span>
          <h3>
            <button onClick={() => openItem(r.id)}>{r.title}</button>
          </h3>
          <p>
            <MapPin size={14} />
            {r.location}
          </p>
          <footer>
            <span>{dateLabel(r.createdAt)}</span>
            <button onClick={() => openItem(r.id)}>
              View item <ArrowUpRight size={15} />
            </button>
          </footer>
        </div>
      </article>
    );
  }
  function claimCard(c: Claim) {
    const r = all.find((r) => r.id === c.reportId);
    return (
      <div className="claim-card" key={c.id}>
        <div className="claim-card-top">
          <div>
            <span className={"pill " + c.status}>{c.status}</span>
            <h3>{r?.title ?? "Item"}</h3>
            <p>Claim submitted {dateLabel(c.createdAt)}</p>
          </div>
          <button
            className="icon-btn"
            onClick={() => openItem(c.reportId)}
            aria-label="View claimed item"
          >
            <ArrowUpRight />
          </button>
        </div>
        {c.status === "approved" && c.code && (
          <div className="collection-code">
            <LockKeyhole size={21} />
            <div>
              Show this to the finder<strong>{c.code}</strong>
              <small>Share only when you collect your item.</small>
            </div>
          </div>
        )}
        <button
          className="secondary"
          onClick={() => {
            go("messages");
            setActiveChat(c.id);
          }}
        >
          <MessageCircle size={16} />
          Open conversation
        </button>
      </div>
    );
  }
  if (unauthorized && !data) return <main className="auth-page"><section className="auth-card"><a className="brand" href="/"><span className="brand-mark"><Search /></span>VIT<span>Find</span></a><span className="auth-symbol"><LockKeyhole size={32}/></span><h1>Welcome to your campus community.</h1><p>Sign in to report lost belongings, connect with finders and manage your profile.</p><a className="primary full" href={signInPath} target="_top">Sign in with ChatGPT <ArrowUpRight size={18}/></a><small>No separate password to remember. Your email is never shown on the board.</small></section></main>;
  return (
    <SidebarProvider>
      <SideNavigation
        view={view}
        go={go}
        account={account}
        matches={matches.length}
        onHelp={() => setInfo(true)}
        onProfile={() => setProfileOpen(true)}
      />
      <main className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <SidebarTrigger className="mobile-toggle" />
            <span>Campus lost & found</span>
          </div>
          <div className="topbar-right">
            <button
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => setNoticesOpen(true)}
            >
              <Bell size={20} />
              {unread > 0 && <span className="unread-dot" />}
            </button>
            <button
              className="avatar small profile-top"
              aria-label="My profile"
              disabled={!data || loading}
              onClick={() => setProfileOpen(true)}
            >
              {account.avatar ? <img src={account.avatar} alt="" /> : account.initials}
            </button>
          </div>
        </header>
        <div className="page">
          <div className="page-heading">
            <div>
              <div className="eyebrow">A CAMPUS THAT LOOKS OUT FOR YOU</div>
              <h1>{title[0]}</h1>
              <p>{title[1]}</p>
            </div>
            <button
              className="primary"
              disabled={!data}
              onClick={() => newReport()}
            >
              <Plus size={18} />
              Report an item
            </button>
          </div>
          {error && (
            <div className="error-box" role="alert">
              <Info />
              <div>
                <strong>{error}</strong>
                {unauthorized ? (
                  <a
                    className="primary"
                    href={signInPath}
                    target="_top"
                  >
                    Sign in with ChatGPT
                  </a>
                ) : (
                  <button className="secondary" onClick={() => void load()}>
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}
          {loading ? (
            <div className="item-grid" aria-label="Loading campus items">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Skeleton key={n} className="h-80 rounded-xl" />
              ))}
            </div>
          ) : (
            data && (
              <>
                {["explore", "reports", "saved"].includes(view) && (
                  <>
                    <div className="searchbar">
                      <Search size={21} />
                      <input
                        placeholder="Search for headphones, a bottle, a little peace of mind…"
                        aria-label="Search items"
                        value={query}
                        maxLength={100}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      {query ? (
                        <button
                          className="icon-btn"
                          onClick={() => setQuery("")}
                          aria-label="Clear search"
                        >
                          <X size={18} />
                        </button>
                      ) : (
                        <span className="search-hint">Search campus</span>
                      )}
                    </div>
                    {view === "explore" && (
                      <div className="intro-strip">
                        <div>
                          <span className="round-icon">
                            <HeartHandshake size={22} />
                          </span>
                          <p>
                            Good things find their way back.
                            <small>
                              {data.stats.returned > 0
                                ? `${data.stats.returned} item${data.stats.returned === 1 ? "" : "s"} reunited across campus.`
                                : "Help connect a lost item with its person."}
                            </small>
                          </p>
                        </div>
                        <button
                          className="community-tag"
                          onClick={() => setInfo(true)}
                        >
                          How it works <ArrowUpRight size={16} />
                        </button>
                      </div>
                    )}
                    <section className={view !== "explore" ? "mt-7" : ""}>
                      <div className="section-heading">
                        <h2>
                          {view === "explore"
                            ? "Around campus"
                            : view === "reports"
                              ? "My reports"
                              : "Saved items"}
                        </h2>
                        <button
                          className="text-button"
                          aria-expanded={filterOpen}
                          onClick={() => setFilterOpen(!filterOpen)}
                        >
                          <SlidersHorizontal size={16} />
                          Filters{location !== "All locations" && <b> · 1</b>}
                        </button>
                      </div>
                      <Tabs value={type} onValueChange={setType}>
                        <TabsList className="browse-tabs">
                          <TabsTrigger value="all">All items</TabsTrigger>
                          <TabsTrigger value="found">Found</TabsTrigger>
                          <TabsTrigger value="lost">Lost</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <div className="category-row">
                        {categories.map((c) => (
                          <button
                            className={
                              category === c ? "category selected" : "category"
                            }
                            key={c}
                            onClick={() => setCategory(c)}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      {filterOpen && (
                        <div className="filter-panel">
                          <Choice
                            label="Filter by location"
                            value={location}
                            onChange={setLocation}
                            options={["All locations", ...locations]}
                          />
                          <Choice
                            label="Filter by status"
                            value={status}
                            onChange={setStatus}
                            options={["Open items", "Reunited", "All statuses"]}
                          />
                          <button
                            className="text-button"
                            onClick={() => {
                              setQuery("");
                              setLocation("All locations");
                              setCategory("All items");
                              setStatus("Open items");
                              setType("all");
                            }}
                          >
                            Reset filters
                          </button>
                        </div>
                      )}
                      <div className="result-line">
                        <span>
                          {filtered.length}{" "}
                          {filtered.length === 1 ? "item" : "items"} · VIT
                          Vellore
                        </span>
                        <Choice
                          label="Sort items"
                          value={sort}
                          onChange={setSort}
                          options={["Newest first", "Oldest first"]}
                        />
                      </div>
                      {filtered.length ? (
                        <div className="item-grid">
                          {filtered.slice(0, page * 12).map(card)}
                        </div>
                      ) : (
                        <Blank
                          title={
                            view === "saved"
                              ? "Keep a few possibilities close."
                              : "No items here just yet."
                          }
                          description={
                            view === "saved"
                              ? "Tap the bookmark on an item to come back to it later."
                              : "Try a different search or share a report with the campus."
                          }
                          action={
                            <button
                              className="secondary"
                              onClick={() =>
                                view === "saved" ? go("explore") : newReport()
                              }
                            >
                              {view === "saved"
                                ? "Explore items"
                                : "Report an item"}
                            </button>
                          }
                        />
                      )}{" "}
                      {filtered.length > page * 12 && (
                        <div className="load-more">
                          <button
                            className="secondary"
                            onClick={() => setPage(page + 1)}
                          >
                            Show more items
                          </button>
                        </div>
                      )}
                    </section>
                    {view === "reports" && (
                      <section className="claims-section">
                        <div className="section-heading">
                          <h2>
                            My claims{" "}
                            <span className="count-label">
                              {myClaims.length}
                            </span>
                          </h2>
                        </div>
                        {myClaims.length ? (
                          <div className="claim-grid">
                            {myClaims.map(claimCard)}
                          </div>
                        ) : (
                          <Blank
                            title="A find worth claiming?"
                            description="When you spot your lost item, submit a claim. You can follow its progress here."
                          />
                        )}
                      </section>
                    )}
                  </>
                )}
                {view === "matches" && (
                  <>
                    <div className="info-strip">
                      <Sparkles />
                      <p>
                        Suggestions use category, keywords, colour, and
                        location. Photos are not analysed for matching.
                      </p>
                    </div>
                    {matches.length ? (
                      matches.map((m) => (
                        <article
                          className="match-card"
                          key={m.source.id + "-" + m.report.id}
                        >
                          <div className="match-source">
                            <span className="eyebrow">YOUR LOST ITEM</span>
                            <h3>{m.source.title}</h3>
                            <p>
                              <MapPin size={14} />
                              {m.source.location}
                            </p>
                          </div>
                          <div className="match-connector">
                            <Sparkles size={22} />
                          </div>
                          <button
                            className="match-result"
                            onClick={() => openItem(m.report.id)}
                          >
                            <div className="match-thumb">
                              <Photo report={m.report} />
                            </div>
                            <div>
                              <span className="pill found">Possible match</span>
                              <h3>{m.report.title}</h3>
                              <div className="match-reasons">
                                {m.reasons.map((r) => (
                                  <span key={r}>
                                    <Check size={12} />
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <ArrowUpRight />
                          </button>
                        </article>
                      ))
                    ) : (
                      <Blank
                        title="Your next lead starts with a report."
                        description="Tell us what you’ve lost. We’ll look for found reports with details in common."
                        action={
                          <button
                            className="primary"
                            onClick={() => newReport({ type: "lost" })}
                          >
                            Report a lost item
                          </button>
                        }
                      />
                    )}
                  </>
                )}
                {view === "messages" && (
                  <div
                    className={
                      "messages-layout " + (activeChat ? "chat-selected" : "")
                    }
                  >
                    <aside className="conversation-list">
                      <h2>
                        Conversations <span>{data.claims.length}</span>
                      </h2>
                      {data.claims.length ? (
                        data.claims.map((c) => (
                          <button
                            key={c.id}
                            className={
                              "conversation " +
                              (activeChat === c.id ? "active" : "")
                            }
                            onClick={() => setActiveChat(c.id)}
                          >
                            <span className="chat-avatar">
                              <Package size={20} />
                            </span>
                            <div>
                              <strong>
                                {all.find((r) => r.id === c.reportId)?.title ??
                                  "Item claim"}
                              </strong>
                              <p>
                                {nameOf(
                                  account.id === c.claimant
                                    ? (all.find((r) => r.id === c.reportId)
                                        ?.owner ?? "")
                                    : c.claimant,
                                )}
                              </p>
                              <small>{c.status}</small>
                            </div>
                            <ChevronRight size={16} />
                          </button>
                        ))
                      ) : (
                        <p className="muted pad">
                          Conversations open when you submit or receive a claim.
                        </p>
                      )}
                    </aside>
                    <section className="chat-pane">
                      {currentChat ? (
                        <>
                          <header className="chat-header">
                            <button
                              className="icon-btn back-chat"
                              onClick={() => setActiveChat(null)}
                              aria-label="Back to conversations"
                            >
                              <ArrowLeft size={20} />
                            </button>
                            <div>
                              <h3>
                                {
                                  all.find((r) => r.id === currentChat.reportId)
                                    ?.title
                                }
                              </h3>
                              <p>Claim conversation · {currentChat.status}</p>
                            </div>
                            <button
                              className="icon-btn"
                              onClick={() => openItem(currentChat.reportId)}
                              aria-label="View conversation item"
                            >
                              <ArrowUpRight size={20} />
                            </button>
                          </header>
                          <div className="chat-safety">
                            <ShieldCheck size={16} />
                            Keep personal information private. Meet in a safe, public place.
                          </div>
                          <div className="chat-history" aria-live="polite">
                            {data.messages
                              .filter((m) => m.claimId === activeChat)
                              .map((m) => (
                                <div
                                  className={
                                    "message " +
                                    (m.sender === account.id ? "mine" : "")
                                  }
                                  key={m.id}
                                >
                                  <small>{nameOf(m.sender)}</small>
                                  <p>{m.text}</p>
                                  <time>
                                    {new Date(m.createdAt).toLocaleTimeString(
                                      "en-IN",
                                      { hour: "2-digit", minute: "2-digit" },
                                    )}
                                  </time>
                                </div>
                              ))}
                            {!data.messages.some(
                              (m) => m.claimId === activeChat,
                            ) && (
                              <Blank
                                title="Say hello."
                                description="Ask about your item or arrange collection in a public place."
                              />
                            )}
                          </div>
                          <form
                            className="chat-compose"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (
                                await action({
                                  action: "message",
                                  claimId: activeChat,
                                  text: message,
                                  id: crypto.randomUUID(),
                                })
                              )
                                setMessage("");
                            }}
                          >
                            <input
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              aria-label="Message"
                              placeholder={
                                currentChat.status === "completed" ||
                                currentChat.status === "rejected"
                                  ? "This conversation is closed"
                                  : "Write a message…"
                              }
                              maxLength={2000}
                              disabled={["completed", "rejected"].includes(
                                currentChat.status,
                              )}
                            />
                            <button
                              className="primary"
                              aria-label="Send message"
                              disabled={
                                busy ||
                                !message.trim() ||
                                ["completed", "rejected"].includes(
                                  currentChat.status,
                                )
                              }
                            >
                              <Send size={19} />
                            </button>
                          </form>
                        </>
                      ) : (
                        <Blank
                          title="Bring the details together."
                          description="Select a conversation to arrange a safe return."
                        />
                      )}
                    </section>
                  </div>
                )}
                {view === "desk" && (
                    <>
                      <div className="stats-grid">
                        {[
                          [Package, data.stats.open, "Open reports"],
                          [
                            ShieldCheck,
                            reviewClaims.filter((c) => c.status === "pending")
                              .length,
                            "Awaiting review",
                          ],
                          [
                            HeartHandshake,
                            data.stats.returned,
                            "Items reunited",
                          ],
                        ].map(([Icon, n, label]: any) => (
                          <div className="stat-card" key={label}>
                            <span className="round-icon">
                              <Icon size={23} />
                            </span>
                            <div>
                              <strong>{n ?? 0}</strong>
                              <p>{label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <section className="desk-panel">
                        <div className="section-heading">
                          <h2>Ownership reviews</h2>
                          <span className="muted">Proof stays private</span>
                        </div>
                        {reviewClaims.length ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item & claimant</TableHead>
                                <TableHead>Ownership details</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reviewClaims.map((c) => (
                                <TableRow key={c.id}>
                                  <TableCell>
                                    <button
                                      className="table-item"
                                      onClick={() => openItem(c.reportId)}
                                    >
                                      {
                                        all.find((r) => r.id === c.reportId)
                                          ?.title
                                      }
                                    </button>
                                    <small className="muted block">
                                      {nameOf(c.claimant)}
                                    </small>
                                  </TableCell>
                                  <TableCell className="proof-cell">
                                    {c.proof}
                                  </TableCell>
                                  <TableCell>
                                    <span className={"pill " + c.status}>
                                      {c.status}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="table-actions">
                                      {c.status === "pending" ? (
                                        <>
                                          <button
                                            disabled={busy}
                                            className="primary compact"
                                            onClick={() =>
                                              void action(
                                                {
                                                  action: "approve",
                                                  claimId: c.id,
                                                },
                                                "Claim approved. The claimant can now see their collection code.",
                                              )
                                            }
                                          >
                                            Approve
                                          </button>
                                          <button
                                            disabled={busy}
                                            className="secondary compact"
                                            onClick={() =>
                                              void action(
                                                {
                                                  action: "reject",
                                                  claimId: c.id,
                                                },
                                                "Claim rejected",
                                              )
                                            }
                                          >
                                            Reject
                                          </button>
                                        </>
                                      ) : c.status === "approved" ? (
                                        <button
                                          className="primary compact"
                                          onClick={() => {
                                            setHandover(c);
                                            setHandoverCode("");
                                          }}
                                        >
                                          Confirm handover
                                        </button>
                                      ) : (
                                        <CheckCircle2
                                          className="muted"
                                          size={20}
                                        />
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <Blank
                            title="All caught up."
                            description="New ownership claims will appear here for review."
                          />
                        )}
                      </section>
                      {isModerator && <section className="desk-panel">
                        <h2>Community moderation</h2>
                        <p className="muted mb-4">
                          Flagged reports appear in notifications. Hide
                          inappropriate reports from the board.
                        </p>
                        <div className="moderation-list">
                          {all.map((r) => (
                            <div key={r.id}>
                              <button onClick={() => openItem(r.id)}>
                                <strong>{r.title}</strong>
                                <small>
                                  {nameOf(r.owner)} · {r.status}
                                </small>
                              </button>
                              {r.status !== "returned" && (
                                <button
                                  className="secondary compact"
                                  disabled={busy}
                                  onClick={() =>
                                    void action(
                                      {
                                        action:
                                          r.status === "hidden"
                                            ? "restore"
                                            : "hide",
                                        reportId: r.id,
                                      },
                                      r.status === "hidden"
                                        ? "Report restored"
                                        : "Report hidden",
                                    )
                                  }
                                >
                                  {r.status === "hidden" ? "Restore" : "Hide"}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>}
                      {isModerator && <section className="desk-panel">
                        <h2>Activity log</h2>
                        {data.audit.length ? (
                          data.audit.map((a) => (
                            <div className="audit-row" key={a.id}>
                              <CheckCircle2 size={17} />
                              <div>
                                <strong>{a.action}</strong>
                                <small>
                                  {nameOf(a.actor)} · {dateLabel(a.createdAt)}
                                </small>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="muted mt-3">
                            Moderation and handover actions are recorded here.
                          </p>
                        )}
                      </section>}
                    </>
                  )}
              </>
            )
          )}
          <footer className="page-footer">
            <span>VITFind</span>
            <p>A little less lost. A lot more connected.</p>
            <button onClick={() => setInfo(true)}>About & photo credits</button>
          </footer>
        </div>
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {nav
            .filter((n) => n.id !== "saved")
            .map((n) => (
              <button
                key={n.id}
                className={view === n.id ? "active" : ""}
                onClick={() => go(n.id)}
              >
                <n.icon size={21} />
                <span>{n.id === "reports" ? "My items" : n.label}</span>
              </button>
            ))}
          <button onClick={() => setProfileOpen(true)}>
            <Settings2 size={21} />
            <span>Account</span>
          </button>
        </nav>
      </main>

      <Sheet
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) closeItem();
        }}
      >
        <SheetContent className="detail-sheet">
          <SheetHeader>
            <SheetTitle>Item details</SheetTitle>
            <SheetDescription>
              Every detail brings it closer to home.
            </SheetDescription>
          </SheetHeader>
          {selectedReport ? (
            <>
              <Photo report={selectedReport} large />
              <div className="detail-body">
                <span className="card-category">{selectedReport.category}</span>
                <h2>{selectedReport.title}</h2>
                <div className="detail-meta">
                  <span>
                    <MapPin size={16} />
                    {selectedReport.location}
                  </span>
                  <span>
                    <Clock size={16} />
                    {selectedReport.date}
                  </span>
                </div>
                <p className="detail-description">
                  {selectedReport.description}
                </p>
                <div className="detail-owner">
                  <span className="avatar">
                    {initialsOf(nameOf(selectedReport.owner))}
                  </span>
                  <div>
                    Reported by {nameOf(selectedReport.owner)}
                    <small>Campus member</small>
                  </div>
                </div>
                <div className="info-strip">
                  <ShieldCheck />
                  <p>
                    For a safe return, confirm a detail only the owner would
                    know. Arrange collection in a safe, public place.
                  </p>
                </div>
                {selectedReport.status === "returned" ? (
                  <div className="success-banner">
                    <HeartHandshake />
                    This item has found its way home.
                  </div>
                ) : selectedReport.status === "hidden" ? (
                  <p className="muted">
                    This report is hidden by a moderator.
                  </p>
                ) : selectedReport.owner === account.id ? (
                  <button
                    className="primary full"
                    onClick={() => {
                      setEditReport(selectedReport);
                      setReportOpen(true);
                      closeItem();
                    }}
                  >
                    Edit my report
                  </button>
                ) : selectedReport.type === "found" ? (
                  <button
                    className="primary full"
                    disabled={data?.claims.some(
                      (c) =>
                        c.reportId === selectedReport.id &&
                        c.claimant === account.id,
                    )}
                    onClick={() => {
                      claimKey.current = crypto.randomUUID();
                      setClaimFor(selectedReport);
                      setClaimProof("");
                      closeItem();
                    }}
                  >
                    {data?.claims.some(
                      (c) =>
                        c.reportId === selectedReport.id &&
                        c.claimant === account.id,
                    )
                      ? "Claim already submitted"
                      : "This might be mine"}
                  </button>
                ) : selectedReport.type === "lost" ? (
                  <button
                    className="primary full"
                    onClick={() => {
                      newReport({
                        type: "found",
                        category: selectedReport.category,
                        location: selectedReport.location,
                      });
                      closeItem();
                    }}
                  >
                    I found something similar
                  </button>
                ) : null}
                <div className="detail-actions">
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      void action({
                        action: "save",
                        reportId: selectedReport.id,
                        saved: !data?.saved.includes(selectedReport.id),
                      })
                    }
                  >
                    <Bookmark size={17} />
                    {data?.saved.includes(selectedReport.id)
                      ? "Saved"
                      : "Save item"}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      setFlagFor(selectedReport.id);
                      setFlagReason("");
                      closeItem();
                    }}
                  >
                    <Flag size={16} />
                    Report a concern
                  </button>
                </div>
                {findMatches(selectedReport, all).length > 0 && (
                  <div className="detail-matches">
                    <h3>
                      <Sparkles size={18} />
                      Other possible connections
                    </h3>
                    {findMatches(selectedReport, all).map((m) => (
                      <button
                        key={m.report.id}
                        onClick={() => openItem(m.report.id)}
                      >
                        {m.report.title}
                        <ArrowUpRight size={16} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <Blank
              title="Item unavailable"
              description="This report may have been hidden or is no longer on this board."
            />
          )}
        </SheetContent>
      </Sheet>

      <ReportForm
        open={reportOpen}
        onOpenChange={setReportOpen}
        edit={editReport}
        prefill={prefill}
        busy={busy}
        submit={async (report) => {
          const result = await action(
            { action: editReport ? "edit" : "report", report },
            editReport
              ? "Your report is updated"
              : "Your report is on the campus board!",
          );
          if (result) {
            setReportOpen(false);
            go("reports");
          }
          return !!result;
        }}
      />
      <Dialog
        open={!!claimFor}
        onOpenChange={(o) => {
          if (!o) setClaimFor(null);
        }}
      >
        <DialogContent className="app-dialog">
          <DialogHeader>
            <DialogTitle>Let’s make sure it’s yours.</DialogTitle>
            <DialogDescription>
              Describe a unique detail of {claimFor?.title.toLowerCase()}. This
              is visible only to the finder and authorized moderators.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await action(
                  {
                    action: "claim",
                    id: claimKey.current,
                    reportId: claimFor?.id,
                    proof: claimProof,
                  },
                  "Claim sent to the finder",
                )
              ) {
                setClaimFor(null);
                go("reports");
              }
            }}
          >
            <label className="field">
              Ownership details
              <textarea
                required
                minLength={15}
                maxLength={1500}
                value={claimProof}
                onChange={(e) => setClaimProof(e.target.value)}
                placeholder="For example, an engraving, a sticker, or something inside…"
                rows={5}
              />
            </label>
            <p className="form-hint">
              <LockKeyhole size={15} />
              Don’t include passwords, identity numbers, or bank details.
            </p>
            <button
              className="primary full"
              disabled={busy || claimProof.trim().length < 15}
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}
              Submit claim
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Sheet open={noticesOpen} onOpenChange={setNoticesOpen}>
        <SheetContent className="detail-sheet notices-sheet">
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>
              Updates on your items and conversations.
            </SheetDescription>
          </SheetHeader>
          <div className="notice-controls">
            <button
              className="text-button"
              disabled={busy || !unread}
              onClick={() => void action({ action: "read-notifications" })}
            >
              Mark all as read
            </button>
            <button
              className="icon-btn"
              onClick={() => void load()}
              aria-label="Refresh notifications"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          {data?.notifications.length ? (
            data.notifications.map((n) => (
              <button
                className={"notification " + (!n.read ? "unread" : "")}
                key={n.id}
                onClick={() => {
                  setNoticesOpen(false);
                  if (data.claims.some((c) => c.reportId === n.reportId && c.claimant === account.id && c.status === "approved")) go("reports");
                  else if (all.some(r=>r.id===n.reportId && r.owner===account.id) && data.claims.some(c=>c.reportId===n.reportId)) go("desk");
                  else openItem(n.reportId);
                  void action({ action: "read-notifications" });
                }}
              >
                <span className="round-icon">
                  <Bell size={18} />
                </span>
                <div>
                  <p>{n.text}</p>
                  <small>{dateLabel(n.createdAt)}</small>
                </div>
                <ChevronRight size={16} />
              </button>
            ))
          ) : (
            <Blank
              title="You’re all caught up."
              description="Claims, messages, and collection updates will arrive here."
            />
          )}
        </SheetContent>
      </Sheet>
      {data && <AccountProfile open={profileOpen} onOpenChange={setProfileOpen} profile={data.user} busy={busy} signOutPath={signOutPath} save={async(profile)=>!!(await action({action:"profile",profile},"Profile updated"))} />}
      <Dialog open={info} onOpenChange={setInfo}>
        <DialogContent className="app-dialog about-dialog">
          <DialogHeader>
            <DialogTitle>A small act. A happy reunion.</DialogTitle>
            <DialogDescription>
              VITFind connects lost belongings with the people who miss them.
            </DialogDescription>
          </DialogHeader>
          <ol className="how-list">
            <li>
              <span>1</span>
              <div>
                <strong>Share what you lost or found.</strong>
                <p>
                  Add a clear photo, location, and useful description. Keep
                  unique identifying details private.
                </p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Follow a possible connection.</strong>
                <p>
                  Search the board or check Matches. Submit private proof when
                  you spot your item.
                </p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Bring it home safely.</strong>
                <p>
                  The finder reviews your private proof. Show your collection code
                  when picking up your item.
                </p>
              </div>
            </li>
          </ol>
          <p className="muted">Your reports and conversations are saved to your account. Suggestions compare item details, not images. Names and photos are visible on reports; email addresses and ownership proof are kept private. Sign-in does not verify university enrollment.</p>
          <details className="credits">
            <summary>Sample photography & credits</summary>
            <p>
              Sample listing images are illustrative, not actual campus reports.
            </p>
            <a
              href="https://unsplash.com/photos/black-headphones-on-white-table-pHqt1DsHCx0"
              target="_blank"
              rel="noreferrer"
            >
              Headphones — Milena Trifonova / Unsplash
            </a>
            <a
              href="https://unsplash.com/photos/brown-backpack-on-black-textile-rF7yUZIPDO0"
              target="_blank"
              rel="noreferrer"
            >
              Backpack — Harrison Hargrave / Unsplash
            </a>
            <a
              href="https://unsplash.com/photos/eyeglasses-on-white-surface-hepBEQDdQpw"
              target="_blank"
              rel="noreferrer"
            >
              Glasses — Jess Bailey / Unsplash
            </a>
            <a
              href="https://unsplash.com/photos/a-camera-on-a-table-68AfHGvombw"
              target="_blank"
              rel="noreferrer"
            >
              Camera — Howard Bouchevereau / Unsplash
            </a>
            <a
              href="https://unsplash.com/photos/a-close-up-of-a-wrist-watch-on-a-white-surface-BrhUVa3LnPs"
              target="_blank"
              rel="noreferrer"
            >
              Watch — Klim Musalimov / Unsplash
            </a>
            <a
              href="https://commons.wikimedia.org/wiki/File:Stainless_Steel_Water_Bottle.jpg"
              target="_blank"
              rel="noreferrer"
            >
              Bottle — Gannu03 / Wikimedia Commons
            </a>
            <p>
              Bottle resized and compressed under{" "}
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY-SA 4.0
              </a>
              . Other photos:{" "}
              <a
                href="https://unsplash.com/license"
                target="_blank"
                rel="noreferrer"
              >
                Unsplash License
              </a>
              .
            </p>
          </details>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!handover}
        onOpenChange={(o) => {
          if (!o) setHandover(null);
        }}
      >
        <DialogContent className="app-dialog">
          <DialogHeader>
            <DialogTitle>One last step to a reunion.</DialogTitle>
            <DialogDescription>
              Ask the claimant to show their six-digit collection code. Confirm
              only after physically returning the item.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await action(
                  {
                    action: "handover",
                    claimId: handover?.id,
                    code: handoverCode,
                  },
                  "Item reunited. Thank you for making it happen!",
                )
              )
                setHandover(null);
            }}
          >
            <label className="field">
              Collection code
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={handoverCode}
                onChange={(e) =>
                  setHandoverCode(e.target.value.replace(/\D/g, ""))
                }
              />
            </label>
            <button
              className="primary full"
              disabled={busy || handoverCode.length !== 6}
            >
              <HeartHandshake size={18} />
              Confirm item returned
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!flagFor}
        onOpenChange={(o) => {
          if (!o) setFlagFor(null);
        }}
      >
        <DialogContent className="app-dialog">
          <DialogHeader>
            <DialogTitle>Report a concern</DialogTitle>
            <DialogDescription>
              Tell us what needs attention. Your concern will be recorded for moderation. Contact campus security directly for urgent safety issues.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await action(
                  { action: "flag", reportId: flagFor, reason: flagReason },
                  "Your concern has been recorded",
                )
              )
                setFlagFor(null);
            }}
          >
            <label className="field">
              What’s wrong?
              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={4}
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              />
            </label>
            <button
              className="primary full"
              disabled={busy || flagReason.trim().length < 10}
            >
              Record concern
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Toaster richColors position="bottom-right" />
    </SidebarProvider>
  );
}
function ReportForm({
  open,
  onOpenChange,
  edit,
  prefill,
  busy,
  submit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edit: Report | null;
  prefill: Partial<Report>;
  busy: boolean;
  submit: (report: Report) => Promise<boolean>;
}) {
  const blank = () => ({
    id: crypto.randomUUID(),
    owner: "",
    type: "lost" as "lost" | "found",
    title: "",
    description: "",
    category: "Electronics",
    location: "Central Library",
    color: "",
    date: new Date().toISOString().slice(0, 10),
    image: "",
    status: "open" as const,
    createdAt: Date.now(),
    ...prefill,
  });
  const [form, setForm] = useState<Report | null>(null),
    [uploading, setUploading] = useState(false),
    [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setForm(edit ?? blank());
      setUploadError("");
    }
  }, [open, edit]);
  async function photo(file: File) {
    setUploadError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 12 * 1024 * 1024
    ) {
      setUploadError("Choose a JPG, PNG, or WebP photo smaller than 12 MB.");
      return;
    }
    setUploading(true);
    try {
      const image = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(Error("Couldn’t read that photo."))),
          "image/jpeg",
          0.82,
        ),
      );
      const r = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      const result = (await r.json()) as { error: string; url: string };
      if (!r.ok) throw Error(result.error);
      setForm((f) => (f ? { ...f, image: result.url } : f));
    } catch (e) {
      setUploadError(
        e instanceof Error
          ? e.message
          : "Photo upload failed. Your other details are still here.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  function field(key: keyof Report, value: string) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!busy && !uploading) onOpenChange(o);
      }}
    >
      <DialogContent className="app-dialog report-dialog">
        <DialogHeader>
          <DialogTitle>
            {edit ? "Update your report" : "Let’s bring it back."}
          </DialogTitle>
          <DialogDescription>
            {edit
              ? "Keep the details accurate so the right person can find it."
              : "A few details can make all the difference."}
          </DialogDescription>
        </DialogHeader>
        {form && (
          <form
            onSubmit={async (e: FormEvent) => {
              e.preventDefault();
              if (!uploading) await submit(form);
            }}
          >
            <Tabs
              value={form.type}
              onValueChange={(v) => {
                if (!edit) field("type", v);
              }}
            >
              <TabsList className="report-type">
                <TabsTrigger disabled={!!edit} value="lost">
                  <Search size={17} />I lost something
                </TabsTrigger>
                <TabsTrigger disabled={!!edit} value="found">
                  <HeartHandshake size={17} />I found something
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Upload item photo"
              onChange={(e) => {
                if (e.target.files?.[0]) void photo(e.target.files[0]);
              }}
            />
            <button
              type="button"
              disabled={uploading || busy}
              className={"upload-zone " + (form.image ? "has-photo" : "")}
              onClick={() => inputRef.current?.click()}
            >
              {form.image ? (
                <img src={form.image} alt="Your item preview" />
              ) : uploading ? (
                <LoaderCircle className="spin" size={28} />
              ) : (
                <Upload size={28} />
              )}
              <div>
                <strong>
                  {uploading
                    ? "Preparing your photo…"
                    : form.image
                      ? "Change photo"
                      : "Add a photo"}
                </strong>
                <span>JPG, PNG or WebP · up to 12 MB</span>
              </div>
            </button>
            {uploadError && (
              <p role="alert" className="field-error">
                {uploadError}
              </p>
            )}
            <label className="field">
              What is the item?
              <input
                required
                minLength={4}
                maxLength={100}
                value={form.title}
                onChange={(e) => field("title", e.target.value)}
                placeholder="e.g. Silver insulated water bottle"
              />
            </label>
            <div className="form-grid">
              <label className="field">
                Category
                <Choice
                  label="Item category"
                  value={form.category}
                  onChange={(v) => field("category", v)}
                  options={categories.slice(1)}
                />
              </label>
              <label className="field">
                Colour
                <input
                  maxLength={40}
                  value={form.color}
                  onChange={(e) => field("color", e.target.value)}
                  placeholder="e.g. Silver"
                />
              </label>
              <label className="field">
                Location
                <Choice
                  label="Item location"
                  value={form.location}
                  onChange={(v) => field("location", v)}
                  options={locations}
                />
              </label>
              <label className="field">
                Date {form.type === "lost" ? "lost" : "found"}
                <input
                  required
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.date}
                  onChange={(e) => field("date", e.target.value)}
                />
              </label>
            </div>
            <label className="field">
              Description
              <textarea
                required
                minLength={15}
                maxLength={1500}
                rows={3}
                value={form.description}
                onChange={(e) => field("description", e.target.value)}
                placeholder="Where did you last see it? Share helpful details, but keep one identifying detail private."
              />
            </label>
            <p className="form-hint">
              <ShieldCheck size={16} />
              Don’t post identity numbers, phone numbers, or sensitive
              documents.
            </p>
            <button className="primary full" disabled={busy || uploading}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <Plus size={18} />
              )}{" "}
              {edit ? "Save changes" : "Publish report"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
