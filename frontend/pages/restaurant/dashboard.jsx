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
  Circle, UtensilsCrossed, TrendingUp, Zap, Flame
} from "lucide-react";

const NAV_MAIN = [
  { label: "Dashboard", icon: LayoutGrid, href: "/restaurant/dashboard" },
  { label: "Menu",      icon: BookOpen,   href: "/restaurant/edit/menu" },
  { label: "Orders",    icon: ShoppingBag,href: "/restaurant/edit/order-settings" },
  { label: "Analytics", icon: BarChart2,  href: "/restaurant/analytics" },
];

const NAV_SETTINGS = [
  { label: "Settings", icon: Settings, href: "/restaurant/edit/order-settings" },
  { label: "Profile",  icon: User,     href: "/restaurant/edit/basic-info" },
];

export default function Dashboard() {
  const router = useRouter();
  const { restaurant, loading: authLoading, restaurantId } = useRestaurantAuth();

  const [onboarding,  setOnboarding]  = useState(null);
  const [liveCheck,   setLiveCheck]   = useState(null);
  const [itemCount,   setItemCount]   = useState(0);
  const [catCount,    setCatCount]    = useState(0);
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
    <div style={{ minHeight: "100vh", background: "#eef5f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <UtensilsCrossed size={22} color="white" />
        </div>
        <Loader2 size={24} color="#1a6b3a" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    </div>
  );

  const completionPercent = onboarding?.completion_percent || 0;
  const isLive            = liveCheck?.ready_for_launch;
  const ownerInitials     = restaurant?.owner_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "R";
  const today             = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const checklist = [
    { label: "Basic restaurant info",    desc: "Name, location, type configured" },
    { label: "Operational settings",     desc: "Hours and availability set" },
    { label: "Menu items",               desc: `${itemCount} item${itemCount !== 1 ? "s" : ""} added` },
    { label: "Order & payment settings", desc: "Payment method configured" },
  ];

  const quickActions = [
    { label: "Edit basic info",  desc: "Update restaurant details",   href: "/restaurant/edit/basic-info",     icon: PenLine,   iconBg: "#1a6b3a", cardBg: "#f4faf6", border: "#cde8d6" },
    { label: "Manage menu",      desc: "Add, edit or toggle items",   href: "/restaurant/edit/menu",           icon: BookOpen,  iconBg: "#d97706", cardBg: "#fefdf4", border: "#f0e4a0" },
    { label: "Order settings",   desc: "Payment & delivery config",   href: "/restaurant/edit/order-settings", icon: Settings,  iconBg: "#db2777", cardBg: "#fff5f9", border: "#fbc8dc" },
    { label: "View analytics",   desc: "Orders, revenue & trends",    href: "/restaurant/analytics",           icon: BarChart2, iconBg: "#4f46e5", cardBg: "#f5f4ff", border: "#c4bffa" },
  ];

  const stats = [
    { label: "MENU ITEMS",   value: itemCount, icon: BookOpen,    cardBg: "#f4faf6", iconBg: "#1a6b3a", valColor: "#1a2e1f", labelColor: "#6aad7a" },
    { label: "CATEGORIES",   value: catCount,  icon: ChefHat,     cardBg: "#fefdf0", iconBg: "#d97706", valColor: "#3d2a00", labelColor: "#b08030" },
    { label: "ORDERS TODAY", value: 0,         icon: ShoppingBag, cardBg: "#fff5f8", iconBg: "#db2777", valColor: "#4a0a28", labelColor: "#d05080" },
    {
      label: "SETUP STATUS",
      value: isLive ? "Live" : `${completionPercent}%`,
      icon: TrendingUp,
      cardBg: "#f3f2ff", iconBg: "#4f46e5", valColor: "#1e1a5e", labelColor: "#7068c8",
    },
  ];

  return (
    <>
      <Head>
        <title>Dashboard | Menuify</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #eef5f0; font-family: 'Inter', sans-serif; }
          @keyframes spin  { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }

          /* Stat cards */
          .stat-card { transition: transform 0.18s, box-shadow 0.18s; }
          .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.09) !important; }

          /* Action links — <Link> renders as <a>, so target 'a' */
          .action-link { text-decoration: none; display: flex; transition: transform 0.16s, box-shadow 0.16s; }
          .action-link:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0,0,0,0.09) !important; }

          /* Sidebar nav links */
          .nav-link { text-decoration: none; display: flex; transition: background 0.15s, color 0.15s; }
          .nav-link:hover { background: #e6f4ec !important; color: #1a6b3a !important; }

          /* Logout */
          .logout-btn { border: none; cursor: pointer; transition: background 0.15s, color 0.15s; }
          .logout-btn:hover { background: #fff0f3 !important; color: #e11d48 !important; }

          /* Progress bar */
          .progress-fill { background: linear-gradient(90deg, #1a6b3a, #34d058); }

          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #b8d8c4; border-radius: 4px; }
        `}</style>
      </Head>

      <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "#eef5f0", display: "flex" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 260,
          background: "#ffffff", borderRight: "1.5px solid #dceee3",
          display: "flex", flexDirection: "column", zIndex: 20,
        }}>
          {/* Logo */}
          <div style={{ padding: "22px 22px 18px", borderBottom: "1.5px solid #edf6f0", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <UtensilsCrossed size={18} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>Menuify</p>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#6aad7a", textTransform: "uppercase", letterSpacing: "0.14em" }}>Restaurant OS</p>
            </div>
          </div>

          {/* Nav links — all use Next.js <Link> for proper routing */}
          <nav style={{ flex: 1, padding: "20px 14px", overflowY: "auto" }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: "#9dbeaa", textTransform: "uppercase", letterSpacing: "0.16em", padding: "0 10px", marginBottom: 10 }}>Navigation</p>

            {NAV_MAIN.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link key={item.label} href={item.href} className="nav-link" style={{
                  alignItems: "center", gap: 11, width: "100%",
                  padding: "11px 12px", borderRadius: 12, fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#1a6b3a" : "#4a7a58",
                  background: active ? "#e6f4ec" : "transparent",
                  marginBottom: 3,
                }}>
                  <item.icon size={16} color={active ? "#1a6b3a" : "#9dbeaa"} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {active && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1a6b3a" }} />}
                </Link>
              );
            })}

            <div style={{ borderTop: "1.5px solid #edf6f0", margin: "16px 0 14px" }} />
            <p style={{ fontSize: 9, fontWeight: 800, color: "#9dbeaa", textTransform: "uppercase", letterSpacing: "0.16em", padding: "0 10px", marginBottom: 10 }}>Settings</p>

            {NAV_SETTINGS.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link key={item.label} href={item.href} className="nav-link" style={{
                  alignItems: "center", gap: 11, width: "100%",
                  padding: "11px 12px", borderRadius: 12, fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#1a6b3a" : "#4a7a58",
                  background: active ? "#e6f4ec" : "transparent",
                  marginBottom: 3,
                }}>
                  <item.icon size={16} color={active ? "#1a6b3a" : "#9dbeaa"} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {active && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1a6b3a" }} />}
                </Link>
              );
            })}
          </nav>

          {/* User card + logout */}
          <div style={{ padding: "14px 14px 18px", borderTop: "1.5px solid #edf6f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#f2f9f4", marginBottom: 6 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                {ownerInitials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1a2e1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{restaurant?.owner_name}</p>
                <p style={{ fontSize: 11, color: "#9dbeaa", textTransform: "capitalize" }}>{restaurant?.business_type?.replace("_", " ")}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn" style={{
              display: "flex", alignItems: "center", gap: 9, width: "100%",
              padding: "9px 12px", borderRadius: 12, fontSize: 13, color: "#9dbeaa",
              background: "transparent", fontWeight: 500, fontFamily: "'Inter', sans-serif",
            }}>
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 32px 60px", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* Topbar */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L14.4 9.6H22.4L16 14.4L18.4 22L12 17.2L5.6 22L8 14.4L1.6 9.6H9.6L12 2Z" fill="#1a6b3a" />
                  </svg>
                  <p style={{ fontSize: 12, color: "#6aad7a", fontWeight: 500 }}>{today}</p>
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Dashboard</h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {isLive ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 999, background: "white", color: "#166534", border: "1.5px solid #bbf7d0" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
                    Live & Accepting Orders
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 999, background: "white", color: "#92600a", border: "1.5px solid #e0cc80" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#d97706" }} />
                    Setup in Progress
                  </span>
                )}
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 800 }}>
                  {ownerInitials}
                </div>
              </div>
            </div>

            {/* Hero Banner */}
            <div style={{
              position: "relative", overflow: "hidden", borderRadius: 24,
              background: "linear-gradient(135deg, #0f3d20 0%, #1a6b3a 50%, #22a855 100%)",
              padding: "38px 44px", boxShadow: "0 16px 48px rgba(26,107,58,0.22)",
            }}>
              <div style={{ position: "absolute", top: -20, right: 260, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: -40, right: 180, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -30, right: 320, width: 90, height: 90, borderRadius: "50%", background: "rgba(0,0,0,0.08)", pointerEvents: "none" }} />

              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                    <Flame size={13} color="#fde047" />
                    <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.2em" }}>Welcome Back</p>
                  </div>
                  <h2 style={{ fontSize: 42, fontWeight: 800, color: "white", letterSpacing: "-0.025em", lineHeight: 1.05, marginBottom: 18 }}>
                    {restaurant?.owner_name} 👋
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ padding: "5px 14px", borderRadius: 8, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                      {restaurant?.city}
                    </span>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 500, textTransform: "capitalize" }}>
                      {restaurant?.business_type?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Circular progress ring */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <div style={{ position: "relative", width: 130, height: 130 }}>
                    <svg style={{ width: 130, height: 130, transform: "rotate(-90deg)" }} viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke="#fde047" strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionPercent / 100)}`}
                        style={{ transition: "stroke-dashoffset 1.2s ease", filter: "drop-shadow(0 0 6px rgba(253,224,71,0.6))" }}
                      />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <p style={{ fontSize: 30, fontWeight: 800, color: "white", lineHeight: 1 }}>
                        {completionPercent}<span style={{ fontSize: 16, fontWeight: 700 }}>%</span>
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.2em" }}>Onboarding</p>
                </div>
              </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {stats.map((stat) => (
                <div key={stat.label} className="stat-card" style={{
                  background: stat.cardBg, borderRadius: 20, padding: "24px",
                  border: "1.5px solid rgba(255,255,255,0.9)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: stat.iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                    <stat.icon size={20} color="white" />
                  </div>
                  <p style={{ fontSize: 38, fontWeight: 800, color: stat.valColor, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 8 }}>{stat.value}</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: stat.labelColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Bottom Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* Go-live Checklist */}
              <div style={{ background: "white", borderRadius: 22, padding: "26px", border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: "#f2f9f4", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CheckCircle2 size={17} color="#1a6b3a" />
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Go-live Checklist</h3>
                  </div>
                  {completionPercent === 100 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#1a6b3a", background: "#e6f4ec", padding: "4px 12px", borderRadius: 999, border: "1.5px solid #b8ddc4" }}>
                      Ready ✓
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {checklist.map((item, i) => {
                    const done = onboarding?.steps?.[i]?.completed ?? (completionPercent === 100);
                    return (
                      <div key={item.label} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "11px 14px", borderRadius: 14,
                        background: done ? "#f4faf6" : "#fafafa",
                        border: `1.5px solid ${done ? "#cde8d6" : "#f0ece8"}`,
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: done ? "#1a6b3a" : "transparent",
                          border: done ? "none" : "2px solid #d4d0ca",
                          boxShadow: done ? "0 2px 8px rgba(26,107,58,0.25)" : "none",
                        }}>
                          {done && <CheckCircle2 size={13} color="white" strokeWidth={2.5} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: done ? 600 : 500, color: done ? "#1a2e1f" : "#b0a898" }}>{item.label}</p>
                          <p style={{ fontSize: 11, color: done ? "#7aad8a" : "#c8c0b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.desc}</p>
                        </div>
                        {done && <Zap size={12} color="#1a6b3a" fill="#1a6b3a" style={{ flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1.5px solid #edf6f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                    <span style={{ color: "#9dbeaa" }}>Progress</span>
                    <span style={{ color: "#1a6b3a" }}>{completionPercent}%</span>
                  </div>
                  <div style={{ height: 7, background: "#e6f4ec", borderRadius: 999, overflow: "hidden" }}>
                    <div className="progress-fill" style={{ height: "100%", width: `${completionPercent}%`, borderRadius: 999, transition: "width 1.2s ease" }} />
                  </div>
                </div>
              </div>

              {/* Quick Actions — all use <Link href="..."> for real navigation */}
              <div style={{ background: "white", borderRadius: 22, padding: "26px", border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "#f2f9f4", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap size={17} color="#1a6b3a" fill="#1a6b3a" />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Quick Actions</h3>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {quickActions.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="action-link"
                      style={{
                        alignItems: "center", gap: 14,
                        padding: "12px 14px", borderRadius: 14,
                        background: action.cardBg, border: `1.5px solid ${action.border}`,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: action.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 3px 10px rgba(0,0,0,0.15)" }}>
                        <action.icon size={16} color="white" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{action.label}</p>
                        <p style={{ fontSize: 11, color: "#9dbeaa" }}>{action.desc}</p>
                      </div>
                      <ArrowRight size={15} color="#9dbeaa" style={{ flexShrink: 0 }} />
                    </Link>
                  ))}
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>
    </>
  );
}