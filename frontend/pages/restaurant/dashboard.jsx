import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { useRestaurantAuth } from "../../hooks/useRestaurantAuth";
import {
  getOnboardingStatus, goLiveCheck, getMenuItems, getCategories
} from "../../services/api";
import {
  LayoutGrid, BookOpen, ShoppingBag, BarChart2, Settings, User,
  LogOut, ChefHat, PenLine, ArrowRight, Loader2, CheckCircle2,
  Circle, UtensilsCrossed
} from "lucide-react";

const NAV_MAIN = [
  { label: "Dashboard", icon: LayoutGrid, href: "/restaurant/dashboard" },
  { label: "Menu", icon: BookOpen, href: "/restaurant/edit/menu" },
  { label: "Orders", icon: ShoppingBag, href: "/restaurant/orders" },
  { label: "Analytics", icon: BarChart2, href: "/restaurant/analytics" },
];

const NAV_SETTINGS = [
  { label: "Settings", icon: Settings, href: "/restaurant/edit/order-settings" },
  { label: "Profile", icon: User, href: "/restaurant/edit/basic-info" },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=IBM+Plex+Mono:wght@400;500&family=Figtree:wght@300;400;500;600&display=swap');

  :root {
    --ink: #0a0a0f;
    --ink-soft: #14141c;
    --ink-muted: #1e1e2a;
    --border: rgba(255,255,255,0.06);
    --border-hover: rgba(255,255,255,0.12);
    --text-primary: #f0ede8;
    --text-secondary: #8a8694;
    --text-muted: #4a4760;
    --accent: #e85d3a;
    --accent-glow: rgba(232, 93, 58, 0.15);
    --accent-soft: rgba(232, 93, 58, 0.08);
    --gold: #c9a85c;
    --gold-soft: rgba(201, 168, 92, 0.1);
    --green: #4ade80;
    --green-soft: rgba(74, 222, 128, 0.08);
    --font-display: 'Playfair Display', Georgia, serif;
    --font-body: 'Figtree', sans-serif;
    --font-mono: 'IBM Plex Mono', monospace;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--ink);
    color: var(--text-primary);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
  }

  .dashboard-root {
    min-height: 100vh;
    background: var(--ink);
    display: flex;
    position: relative;
  }

  .noise-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-size: 128px;
  }

  /* ── Sidebar ── */
  .sidebar {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    width: 220px;
    background: var(--ink-soft);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    z-index: 20;
  }

  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 22px 20px 20px;
    border-bottom: 1px solid var(--border);
  }

  .logo-icon {
    width: 34px; height: 34px;
    border-radius: 8px;
    background: var(--accent);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 0 20px var(--accent-glow);
  }

  .logo-name {
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
  }

  .logo-tag {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-muted);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .nav-section-label {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-muted);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 0 16px;
    margin-bottom: 4px;
  }

  .sidebar-nav {
    flex: 1;
    padding: 20px 12px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-label-wrap {
    margin-top: 20px;
    margin-bottom: 6px;
  }
  .nav-label-wrap:first-child { margin-top: 0; }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    transition: all 0.15s ease;
    border: 1px solid transparent;
  }

  .nav-link:hover {
    color: var(--text-primary);
    background: rgba(255,255,255,0.04);
    border-color: var(--border);
  }

  .nav-link.active {
    color: var(--text-primary);
    background: var(--accent-soft);
    border-color: rgba(232, 93, 58, 0.2);
    font-weight: 600;
  }

  .nav-link.active svg { color: var(--accent); }

  .sidebar-footer {
    padding: 12px;
    border-top: 1px solid var(--border);
  }

  .logout-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
    transition: all 0.15s;
    font-family: var(--font-body);
  }

  .logout-btn:hover {
    color: #fc8181;
    background: rgba(252, 129, 129, 0.07);
  }

  /* ── Main ── */
  .main-content {
    margin-left: 220px;
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
  }

  .page-inner {
    max-width: 960px;
    margin: 0 auto;
    padding: 36px 40px 60px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  /* ── Header ── */
  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .page-title {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 900;
    color: var(--text-primary);
    letter-spacing: -0.5px;
    line-height: 1.1;
  }

  .page-date {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 5px;
    letter-spacing: 0.05em;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 6px 12px;
    border-radius: 100px;
  }

  .status-badge.live {
    background: var(--green-soft);
    color: var(--green);
    border: 1px solid rgba(74, 222, 128, 0.15);
  }

  .status-badge.setup {
    background: var(--accent-soft);
    color: var(--accent);
    border: 1px solid rgba(232, 93, 58, 0.15);
  }

  .status-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .status-dot.pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  .avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: var(--ink-muted);
    border: 1px solid var(--border-hover);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  /* ── Welcome Banner ── */
  .welcome-banner {
    position: relative;
    overflow: hidden;
    border-radius: 16px;
    background: var(--ink-soft);
    border: 1px solid var(--border);
    padding: 36px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .banner-bg-circle1 {
    position: absolute;
    right: -60px; top: -60px;
    width: 280px; height: 280px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(232,93,58,0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  .banner-bg-line {
    position: absolute;
    left: 0; bottom: 0;
    right: 0; top: 0;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 60px,
      rgba(255,255,255,0.015) 60px,
      rgba(255,255,255,0.015) 61px
    );
    pointer-events: none;
  }

  .banner-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .banner-name {
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 900;
    color: var(--text-primary);
    line-height: 1.05;
    letter-spacing: -1px;
    margin-bottom: 14px;
  }

  .banner-meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .banner-chip {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-secondary);
    background: rgba(255,255,255,0.06);
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid var(--border);
    text-transform: capitalize;
    letter-spacing: 0.04em;
  }

  .banner-sep {
    width: 3px; height: 3px;
    border-radius: 50%;
    background: var(--text-muted);
  }

  .percent-box {
    position: relative;
    text-align: right;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px 24px;
    min-width: 120px;
  }

  .percent-label {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-muted);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .percent-value {
    font-family: var(--font-display);
    font-size: 48px;
    font-weight: 900;
    color: var(--accent);
    line-height: 1;
    letter-spacing: -2px;
  }

  /* ── Stats Grid ── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .stat-card {
    background: var(--ink-soft);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px;
    transition: border-color 0.2s, transform 0.2s;
  }

  .stat-card:hover {
    border-color: var(--border-hover);
    transform: translateY(-1px);
  }

  .stat-icon-wrap {
    width: 36px; height: 36px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
  }

  .stat-value {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 900;
    color: var(--text-primary);
    letter-spacing: -1px;
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-label {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  /* ── Two-col section ── */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .card {
    background: var(--ink-soft);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
  }

  .card-heading {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .ready-badge {
    font-size: 9px;
    color: var(--green);
    background: var(--green-soft);
    border: 1px solid rgba(74,222,128,0.15);
    padding: 3px 8px;
    border-radius: 100px;
    letter-spacing: 0.08em;
  }

  /* ── Checklist ── */
  .checklist {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .check-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .check-item-text { flex: 1; min-width: 0; }

  .check-item-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .check-item-label.pending {
    color: var(--text-muted);
    font-weight: 400;
  }

  .check-item-desc {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .progress-section {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }

  .progress-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .progress-meta-label {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .progress-bar-track {
    height: 3px;
    background: rgba(255,255,255,0.06);
    border-radius: 100px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 100px;
    transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 10px var(--accent-glow);
  }

  /* ── Quick Actions ── */
  .action-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .action-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    text-decoration: none;
    transition: all 0.15s ease;
    background: rgba(255,255,255,0.02);
    group: true;
  }

  .action-link:hover {
    border-color: rgba(232, 93, 58, 0.25);
    background: var(--accent-soft);
    transform: translateX(2px);
  }

  .action-icon {
    width: 34px; height: 34px;
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-muted);
    flex-shrink: 0;
    transition: all 0.15s;
  }

  .action-link:hover .action-icon {
    background: rgba(232, 93, 58, 0.12);
    border-color: rgba(232, 93, 58, 0.2);
    color: var(--accent);
  }

  .action-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .action-desc {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
  }

  .action-arrow {
    color: var(--text-muted);
    margin-left: auto;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .action-link:hover .action-arrow {
    color: var(--accent);
    transform: translateX(3px);
  }

  /* ── Loader ── */
  .loader-screen {
    min-height: 100vh;
    background: var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

export default function Dashboard() {
  const router = useRouter();
  const { restaurant, loading: authLoading, restaurantId } = useRestaurantAuth();

  const [onboarding, setOnboarding] = useState(null);
  const [liveCheck, setLiveCheck] = useState(null);
  const [itemCount, setItemCount] = useState(0);
  const [catCount, setCatCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    Promise.all([
      getOnboardingStatus(restaurantId),
      goLiveCheck(restaurantId),
      getMenuItems(restaurantId),
      getCategories(restaurantId),
    ])
      .then(([obRes, liveRes, itemRes, catRes]) => {
        setOnboarding(obRes.data);
        setLiveCheck(liveRes.data);
        setItemCount(itemRes.data?.length || 0);
        setCatCount(catRes.data?.length || 0);
      })
      .catch((err) => console.error("Dashboard data fetch failed:", err))
      .finally(() => setDataLoading(false));
  }, [restaurantId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("restaurant_id");
    router.push("/restaurant/login");
  };

  if (authLoading || dataLoading) return (
    <div className="loader-screen">
      <style>{styles}</style>
      <Loader2 style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} size={32} />
    </div>
  );

  const completionPercent = onboarding?.completion_percent || 0;
  const isLive = liveCheck?.ready_for_launch;
  const ownerInitials = restaurant?.owner_name
    ?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "R";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const checklist = [
    { label: "Basic restaurant info", desc: "Name, location, type configured" },
    { label: "Operational settings", desc: "Hours and availability set" },
    { label: "Menu items", desc: `${itemCount} item${itemCount !== 1 ? "s" : ""} added` },
    { label: "Order & payment settings", desc: "Payment method configured" },
  ];

  const quickActions = [
    { label: "Edit basic info", desc: "Update restaurant details", href: "/restaurant/edit/basic-info", icon: PenLine },
    { label: "Manage menu", desc: "Add, edit or toggle items", href: "/restaurant/edit/menu", icon: BookOpen },
    { label: "Order settings", desc: "Payment & delivery config", href: "/restaurant/edit/order-settings", icon: Settings },
    { label: "View analytics", desc: "Orders, revenue & trends", href: "/restaurant/analytics", icon: BarChart2 },
  ];

  const stats = [
    { label: "Menu Items", value: itemCount, icon: BookOpen, iconColor: "#818cf8", iconBg: "rgba(129,140,248,0.1)" },
    { label: "Categories", value: catCount, icon: ChefHat, iconColor: "#c9a85c", iconBg: "rgba(201,168,92,0.1)" },
    { label: "Orders Today", value: 0, icon: ShoppingBag, iconColor: "#e85d3a", iconBg: "rgba(232,93,58,0.1)" },
    { label: "Setup Status", value: isLive ? "Live" : "Pending", icon: isLive ? CheckCircle2 : Circle, iconColor: isLive ? "#4ade80" : "#4a4760", iconBg: isLive ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)" },
  ];

  return (
    <>
      <Head>
        <title>Dashboard — Menuify</title>
      </Head>
      <style>{styles}</style>

      <div className="dashboard-root">
        <div className="noise-overlay" />

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <UtensilsCrossed size={15} color="white" />
            </div>
            <div>
              <div className="logo-name">Menuify</div>
              <div className="logo-tag">Restaurant OS</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-label-wrap">
              <div className="nav-section-label">Main</div>
            </div>
            {NAV_MAIN.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link key={item.label} href={item.href} className={`nav-link${active ? " active" : ""}`}>
                  <item.icon size={15} />
                  {item.label}
                </Link>
              );
            })}

            <div className="nav-label-wrap">
              <div className="nav-section-label">Config</div>
            </div>
            {NAV_SETTINGS.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link key={item.label} href={item.href} className={`nav-link${active ? " active" : ""}`}>
                  <item.icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <button onClick={handleLogout} className="logout-btn">
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="main-content">
          <div className="page-inner">

            {/* Header */}
            <div className="page-header">
              <div>
                <h1 className="page-title">Dashboard</h1>
                <div className="page-date">{today.toUpperCase()}</div>
              </div>
              <div className="header-right">
                {isLive ? (
                  <div className="status-badge live">
                    <span className="status-dot pulse" />
                    Live & Accepting
                  </div>
                ) : (
                  <div className="status-badge setup">
                    <span className="status-dot" />
                    Setup Mode
                  </div>
                )}
                <div className="avatar">{ownerInitials}</div>
              </div>
            </div>

            {/* Welcome Banner */}
            <div className="welcome-banner">
              <div className="banner-bg-circle1" />
              <div className="banner-bg-line" />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div className="banner-label">Welcome back</div>
                <div className="banner-name">{restaurant?.owner_name} 👋</div>
                <div className="banner-meta">
                  <span className="banner-chip">{restaurant?.city}</span>
                  <span className="banner-sep" />
                  <span className="banner-chip" style={{ textTransform: "capitalize" }}>
                    {restaurant?.business_type?.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="percent-box" style={{ position: "relative", zIndex: 1 }}>
                <div className="percent-label">Onboarding</div>
                <div className="percent-value">{completionPercent}%</div>
              </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
              {stats.map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="stat-icon-wrap" style={{ background: s.iconBg }}>
                    <s.icon size={16} style={{ color: s.iconColor }} />
                  </div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Checklist + Actions */}
            <div className="two-col">

              {/* Checklist */}
              <div className="card">
                <div className="card-heading">
                  Go-live checklist
                  {completionPercent === 100 && <span className="ready-badge">Ready ✓</span>}
                </div>

                <div className="checklist">
                  {checklist.map((item, i) => {
                    const done = onboarding?.steps?.[i]?.completed ?? (completionPercent === 100);
                    return (
                      <div key={item.label} className="check-item">
                        {done
                          ? <CheckCircle2 size={18} style={{ color: "#4ade80", flexShrink: 0 }} />
                          : <Circle size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                        }
                        <div className="check-item-text">
                          <div className={`check-item-label${done ? "" : " pending"}`}>{item.label}</div>
                          <div className="check-item-desc">{item.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="progress-section">
                  <div className="progress-meta">
                    <span className="progress-meta-label">Progress</span>
                    <span className="progress-meta-label" style={{ color: "var(--accent)" }}>{completionPercent}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${completionPercent}%` }} />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card">
                <div className="card-heading">Quick actions</div>
                <div className="action-list">
                  {quickActions.map((action) => (
                    <Link key={action.label} href={action.href} className="action-link">
                      <div className="action-icon">
                        <action.icon size={15} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="action-label">{action.label}</div>
                        <div className="action-desc">{action.desc}</div>
                      </div>
                      <ArrowRight size={14} className="action-arrow" />
                    </Link>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}