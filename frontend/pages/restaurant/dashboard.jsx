import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

function useRestaurantAuth() {
  return {
    restaurant: { owner_name: "Arjun Sharma", city: "Mumbai", business_type: "fine_dining" },
    loading: false,
    restaurantId: "demo-123",
  };
}

const getOnboardingStatus = async () => ({ data: { completion_percent: 75, steps: [{ completed: true }, { completed: true }, { completed: true }, { completed: false }] } });
const goLiveCheck = async () => ({ data: { ready_for_launch: false } });
const getMenuItems = async () => ({ data: Array(12).fill(null) });
const getCategories = async () => ({ data: Array(4).fill(null) });

import {
  LayoutGrid, BookOpen, ShoppingBag, BarChart2, Settings, User,
  LogOut, ChefHat, PenLine, ArrowRight, Loader2, CheckCircle2,
  UtensilsCrossed, TrendingUp, Zap, Star, Crown, Gem
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

export default function Dashboard() {
  const { restaurant, loading: authLoading, restaurantId } = useRestaurantAuth();
  const [onboarding, setOnboarding] = useState(null);
  const [liveCheck, setLiveCheck] = useState(null);
  const [itemCount, setItemCount] = useState(0);
  const [catCount, setCatCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [activePath, setActivePath] = useState("/restaurant/dashboard");

  useEffect(() => {
    if (!restaurantId) return;
    Promise.all([getOnboardingStatus(restaurantId), goLiveCheck(restaurantId), getMenuItems(restaurantId), getCategories(restaurantId)])
      .then(([obRes, liveRes, itemRes, catRes]) => {
        setOnboarding(obRes.data); setLiveCheck(liveRes.data);
        setItemCount(itemRes.data?.length || 0); setCatCount(catRes.data?.length || 0);
      })
      .catch(console.error).finally(() => setDataLoading(false));
  }, [restaurantId]);

  const handleLogout = () => {
    typeof localStorage !== "undefined" && localStorage.removeItem("token");
    typeof localStorage !== "undefined" && localStorage.removeItem("restaurant_id");
  };

  if (authLoading || dataLoading) return (
    <div style={{ minHeight: "100vh", background: "#faf7f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#1a1035,#2d1f5e)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(26,16,53,0.3)" }}>
          <UtensilsCrossed size={22} color="#c9a84c" />
        </div>
        <Loader2 size={24} color="#c9a84c" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    </div>
  );

  const completionPercent = onboarding?.completion_percent || 0;
  const isLive = liveCheck?.ready_for_launch;
  const ownerInitials = restaurant?.owner_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "R";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const checklist = [
    { label: "Basic restaurant info", desc: "Name, location, type configured" },
    { label: "Operational settings", desc: "Hours and availability set" },
    { label: "Menu items", desc: `${itemCount} item${itemCount !== 1 ? "s" : ""} added` },
    { label: "Order & payment settings", desc: "Payment method configured" },
  ];

  const quickActions = [
    { label: "Edit basic info", desc: "Update restaurant details", icon: PenLine, bg: "#f5f0ff", border: "#d4b8ff", iconColor: "#6d28d9" },
    { label: "Manage menu", desc: "Add, edit or toggle items", icon: BookOpen, bg: "#fff8e6", border: "#f5d98a", iconColor: "#92600a" },
    { label: "Order settings", desc: "Payment & delivery config", icon: Settings, bg: "#fff0f5", border: "#f9b8d0", iconColor: "#be185d" },
    { label: "View analytics", desc: "Orders, revenue & trends", icon: BarChart2, bg: "#f0f5ff", border: "#b8ccf9", iconColor: "#1e40af" },
  ];

  const stats = [
    { label: "Menu Items", value: itemCount, icon: BookOpen, bg: "linear-gradient(135deg,#1a1035,#2d1f5e)", glow: "rgba(26,16,53,0.35)" },
    { label: "Categories", value: catCount, icon: ChefHat, bg: "linear-gradient(135deg,#78350f,#b45309)", glow: "rgba(120,53,15,0.3)" },
    { label: "Orders Today", value: 0, icon: ShoppingBag, bg: "linear-gradient(135deg,#831843,#be185d)", glow: "rgba(131,24,67,0.3)" },
    { label: "Setup Status", value: isLive ? "Live" : `${completionPercent}%`, icon: isLive ? Zap : TrendingUp, bg: isLive ? "linear-gradient(135deg,#064e3b,#065f46)" : "linear-gradient(135deg,#312e81,#4338ca)", glow: isLive ? "rgba(6,78,59,0.3)" : "rgba(49,46,129,0.3)" },
  ];

  return (
    <>
      <Head>
        <title>Dashboard | Menuify</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          *{box-sizing:border-box;}
          body{background:#faf7f0;margin:0;}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
          .nav-btn:hover{background:rgba(201,168,76,0.08)!important;color:#c9a84c!important;}
          .stat-card{transition:transform 0.2s ease,box-shadow 0.2s ease;}
          .stat-card:hover{transform:translateY(-4px);}
          .action-btn{transition:all 0.18s ease;}
          .action-btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,0,0,0.1)!important;}
          .action-btn:hover .arrow-icon{transform:translateX(3px);opacity:1!important;}
          .arrow-icon{transition:all 0.18s ease;}
          .gold-bar{background:linear-gradient(90deg,#c9a84c,#f0d080,#c9a84c);}
          ::-webkit-scrollbar{width:3px;}
          ::-webkit-scrollbar-track{background:transparent;}
          ::-webkit-scrollbar-thumb{background:#c9a84c44;border-radius:4px;}
        `}</style>
      </Head>

      <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", minHeight: "100vh", background: "#faf7f0", display: "flex" }}>

        {/* ── Luxury Sidebar ── */}
        <aside style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 248,
          background: "#0f0b1e",
          borderRight: "1px solid rgba(201,168,76,0.15)",
          display: "flex", flexDirection: "column", zIndex: 20,
          boxShadow: "6px 0 40px rgba(0,0,0,0.2)"
        }}>
          {/* Subtle top glow */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,#c9a84c55,transparent)" }} />

          {/* Logo */}
          <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#c9a84c,#f0d080)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 16px rgba(201,168,76,0.35)" }}>
                <UtensilsCrossed size={18} color="#1a1035" />
              </div>
              <div>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "#f0d080", margin: 0, letterSpacing: "0.02em" }}>Menuify</p>
                <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(201,168,76,0.45)", textTransform: "uppercase", letterSpacing: "0.18em", margin: 0 }}>Restaurant OS</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "20px 12px", overflowY: "auto" }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(201,168,76,0.3)", textTransform: "uppercase", letterSpacing: "0.18em", padding: "0 10px", marginBottom: 8 }}>Main</p>
            {NAV_MAIN.map((item) => {
              const active = activePath === item.href;
              return (
                <button key={item.label} onClick={() => setActivePath(item.href)} className="nav-btn" style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 12px", borderRadius: 10, fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#f0d080" : "rgba(255,255,255,0.35)",
                  background: active ? "rgba(201,168,76,0.12)" : "transparent",
                  border: active ? "1px solid rgba(201,168,76,0.2)" : "1px solid transparent",
                  cursor: "pointer", transition: "all 0.15s", textAlign: "left", marginBottom: 2,
                }}>
                  <item.icon size={14} color={active ? "#c9a84c" : "rgba(255,255,255,0.2)"} />
                  {item.label}
                  {active && <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "#c9a84c", boxShadow: "0 0 6px #c9a84c" }} />}
                </button>
              );
            })}

            <div style={{ borderTop: "1px solid rgba(201,168,76,0.08)", margin: "14px 0" }} />
            <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(201,168,76,0.3)", textTransform: "uppercase", letterSpacing: "0.18em", padding: "0 10px", marginBottom: 8 }}>Settings</p>
            {NAV_SETTINGS.map((item) => {
              const active = activePath === item.href;
              return (
                <button key={item.label} onClick={() => setActivePath(item.href)} className="nav-btn" style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 12px", borderRadius: 10, fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#f0d080" : "rgba(255,255,255,0.35)",
                  background: active ? "rgba(201,168,76,0.12)" : "transparent",
                  border: active ? "1px solid rgba(201,168,76,0.2)" : "1px solid transparent",
                  cursor: "pointer", transition: "all 0.15s", textAlign: "left", marginBottom: 2,
                }}>
                  <item.icon size={14} color={active ? "#c9a84c" : "rgba(255,255,255,0.2)"} />
                  {item.label}
                  {active && <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "#c9a84c", boxShadow: "0 0 6px #c9a84c" }} />}
                </button>
              );
            })}
          </nav>

          {/* User card */}
          <div style={{ padding: "12px 12px 16px", borderTop: "1px solid rgba(201,168,76,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.12)", marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#c9a84c,#f0d080)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1035", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                {ownerInitials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#f0d080", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{restaurant?.owner_name}</p>
                <p style={{ fontSize: 10, color: "rgba(201,168,76,0.4)", margin: 0, textTransform: "capitalize" }}>{restaurant?.business_type?.replace("_", " ")}</p>
              </div>
            </div>
            <button onClick={handleLogout} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px",
              borderRadius: 10, fontSize: 12, color: "rgba(255,255,255,0.2)",
              background: "transparent", border: "none", cursor: "pointer", fontWeight: 500,
              transition: "all 0.15s"
            }}
              onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "transparent"; }}
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div style={{ marginLeft: 248, flex: 1, minWidth: 0 }}>
          <main style={{ maxWidth: 980, margin: "0 auto", padding: "36px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 11, color: "#b8a070", fontWeight: 500, margin: "0 0 4px", letterSpacing: "0.05em" }}>{today}</p>
                <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 700, color: "#1a1035", margin: 0, letterSpacing: "-0.01em" }}>
                  Good Day, {restaurant?.owner_name?.split(" ")[0]}
                </h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {isLive ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "7px 16px", borderRadius: 999, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", letterSpacing: "0.03em" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
                    Live & Accepting Orders
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "7px 16px", borderRadius: 999, background: "#fffbeb", color: "#92600a", border: "1px solid #fde68a", letterSpacing: "0.03em" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                    Setup in Progress
                  </span>
                )}
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#c9a84c,#f0d080)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1035", fontSize: 12, fontWeight: 800, boxShadow: "0 4px 14px rgba(201,168,76,0.35)" }}>
                  {ownerInitials}
                </div>
              </div>
            </div>

            {/* ── Hero Banner ── */}
            <div style={{
              position: "relative", overflow: "hidden", borderRadius: 28,
              background: "linear-gradient(135deg, #0f0b1e 0%, #1a1035 40%, #2d1f5e 100%)",
              padding: "40px 44px",
              boxShadow: "0 24px 64px rgba(15,11,30,0.3), 0 0 0 1px rgba(201,168,76,0.15)"
            }}>
              {/* Glow effects */}
              <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,168,76,0.12),transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -40, left: "30%", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.1),transparent 70%)", pointerEvents: "none" }} />
              {/* Gold top line */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(201,168,76,0.6),transparent)" }} />

              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <Crown size={13} color="#c9a84c" />
                    <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(201,168,76,0.5)", textTransform: "uppercase", letterSpacing: "0.2em", margin: 0 }}>Welcome back</p>
                  </div>
                  <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 44, fontWeight: 700, color: "#f5efe0", margin: "0 0 18px", letterSpacing: "-0.01em", lineHeight: 1.05 }}>
                    {restaurant?.owner_name} <span style={{ fontSize: 36 }}>✦</span>
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ padding: "5px 14px", borderRadius: 8, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", fontSize: 12, color: "rgba(240,208,128,0.8)", fontWeight: 600, textTransform: "capitalize" }}>
                      {restaurant?.city}
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(201,168,76,0.3)" }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textTransform: "capitalize", fontWeight: 500 }}>
                      {restaurant?.business_type?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Ring */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <div style={{ position: "relative", width: 120, height: 120 }}>
                    <svg style={{ width: 120, height: 120, transform: "rotate(-90deg)" }} viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(201,168,76,0.1)" strokeWidth="6" />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke="url(#luxRing)" strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionPercent / 100)}`}
                        style={{ transition: "stroke-dashoffset 1.2s ease" }}
                      />
                      <defs>
                        <linearGradient id="luxRing" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#c9a84c" />
                          <stop offset="50%" stopColor="#f0d080" />
                          <stop offset="100%" stopColor="#c9a84c" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <Gem size={13} color="#c9a84c" style={{ marginBottom: 2 }} />
                      <p style={{ fontSize: 26, fontWeight: 800, color: "#f0d080", margin: 0, lineHeight: 1 }}>{completionPercent}<span style={{ fontSize: 13 }}>%</span></p>
                    </div>
                  </div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(201,168,76,0.35)", textTransform: "uppercase", letterSpacing: "0.18em", margin: 0 }}>Onboarding</p>
                </div>
              </div>
            </div>

            {/* ── Stat Cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {stats.map((stat) => (
                <div key={stat.label} className="stat-card" style={{
                  background: stat.bg, borderRadius: 20, padding: "22px 22px",
                  boxShadow: `0 8px 32px ${stat.glow}, 0 0 0 1px rgba(255,255,255,0.08)`,
                  position: "relative", overflow: "hidden"
                }}>
                  <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)" }} />
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, border: "1px solid rgba(255,255,255,0.1)" }}>
                    <stat.icon size={18} color="rgba(255,255,255,0.85)" />
                  </div>
                  <p style={{ fontSize: 34, fontWeight: 800, color: "white", margin: "0 0 4px", letterSpacing: "-0.03em", lineHeight: 1 }}>{stat.value}</p>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* ── Bottom Cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* Checklist */}
              <div style={{ background: "white", borderRadius: 24, padding: 28, boxShadow: "0 4px 24px rgba(26,16,53,0.07), 0 0 0 1px rgba(201,168,76,0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#1a1035,#2d1f5e)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(26,16,53,0.25)" }}>
                      <CheckCircle2 size={15} color="#c9a84c" />
                    </div>
                    <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 700, color: "#1a1035", margin: 0 }}>Go-live Checklist</h3>
                  </div>
                  {completionPercent === 100 && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: "#92600a", background: "#fffbeb", padding: "4px 12px", borderRadius: 999, border: "1px solid #fde68a" }}>
                      <Star size={9} fill="#f59e0b" color="#f59e0b" /> Ready
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {checklist.map((item, i) => {
                    const done = onboarding?.steps?.[i]?.completed ?? (completionPercent === 100);
                    return (
                      <div key={item.label} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14,
                        background: done ? "#faf7f0" : "#fafafa",
                        border: `1px solid ${done ? "rgba(201,168,76,0.2)" : "#f3f0ea"}`,
                        transition: "all 0.15s"
                      }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "linear-gradient(135deg,#c9a84c,#f0d080)" : "transparent", border: done ? "none" : "2px solid #e5ddd0", boxShadow: done ? "0 3px 10px rgba(201,168,76,0.3)" : "none" }}>
                          {done && <CheckCircle2 size={13} color="#1a1035" strokeWidth={2.5} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: done ? 700 : 500, color: done ? "#1a1035" : "#c0b8ac", margin: 0 }}>{item.label}</p>
                          <p style={{ fontSize: 11, color: done ? "#b8a070" : "#d4cfc8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.desc}</p>
                        </div>
                        {done && (
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#faf0d0", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Star size={9} color="#c9a84c" fill="#c9a84c" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #f3f0ea" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                    <span style={{ color: "#c0b8ac" }}>Progress</span>
                    <span style={{ color: "#c9a84c" }}>{completionPercent}%</span>
                  </div>
                  <div style={{ height: 6, background: "#f3f0ea", borderRadius: 999, overflow: "hidden" }}>
                    <div className="gold-bar" style={{ height: "100%", width: `${completionPercent}%`, borderRadius: 999, transition: "width 1.2s ease", boxShadow: "0 0 8px rgba(201,168,76,0.4)" }} />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ background: "white", borderRadius: 24, padding: 28, boxShadow: "0 4px 24px rgba(26,16,53,0.07), 0 0 0 1px rgba(201,168,76,0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#1a1035,#2d1f5e)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(26,16,53,0.25)" }}>
                    <Zap size={15} color="#c9a84c" fill="#c9a84c" />
                  </div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 700, color: "#1a1035", margin: 0 }}>Quick Actions</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => setActivePath(action.href)}
                      className="action-btn"
                      style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                        borderRadius: 16, background: action.bg, border: `1px solid ${action.border}`,
                        cursor: "pointer", textAlign: "left", width: "100%",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                      }}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: "white", border: `1px solid ${action.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                        <action.icon size={15} color={action.iconColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1035", margin: 0 }}>{action.label}</p>
                        <p style={{ fontSize: 11, color: "#b8a898", margin: 0 }}>{action.desc}</p>
                      </div>
                      <ArrowRight size={14} color={action.iconColor} className="arrow-icon" style={{ opacity: 0.4, flexShrink: 0 }} />
                    </button>
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
