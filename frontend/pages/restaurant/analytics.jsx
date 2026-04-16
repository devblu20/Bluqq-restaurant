import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  UtensilsCrossed, LayoutGrid, BookOpen, ShoppingBag, BarChart2,
  Settings, User, LogOut, TrendingUp, TrendingDown, IndianRupee,
  ShoppingCart, Star, Clock, ArrowUpRight, ArrowDownRight, ChefHat,
  Bike, Package, Calendar, Zap
} from "lucide-react";

/* ── Mock Data ── */
const REVENUE_WEEK = [
  { day: "Mon", revenue: 3200, orders: 14 },
  { day: "Tue", revenue: 4100, orders: 18 },
  { day: "Wed", revenue: 3700, orders: 16 },
  { day: "Thu", revenue: 5200, orders: 23 },
  { day: "Fri", revenue: 6800, orders: 31 },
  { day: "Sat", revenue: 8400, orders: 38 },
  { day: "Sun", revenue: 7100, orders: 32 },
];

const REVENUE_MONTH = [
  { day: "1", revenue: 2800, orders: 12 }, { day: "3", revenue: 3400, orders: 15 },
  { day: "5", revenue: 4200, orders: 19 }, { day: "7", revenue: 3800, orders: 17 },
  { day: "9", revenue: 5100, orders: 23 }, { day: "11", revenue: 4600, orders: 21 },
  { day: "13", revenue: 6200, orders: 28 }, { day: "15", revenue: 7400, orders: 33 },
  { day: "17", revenue: 5800, orders: 26 }, { day: "19", revenue: 6900, orders: 31 },
  { day: "21", revenue: 8200, orders: 37 }, { day: "23", revenue: 7600, orders: 34 },
  { day: "25", revenue: 9100, orders: 41 }, { day: "27", revenue: 8400, orders: 38 },
  { day: "30", revenue: 7200, orders: 32 },
];

const TOP_ITEMS = [
  { name: "Paneer Butter Masala", orders: 84, revenue: 23520, trend: "+12%" },
  { name: "Veg Biryani",          orders: 72, revenue: 18720, trend: "+8%"  },
  { name: "Dal Makhani",          orders: 61, revenue: 13420, trend: "+5%"  },
  { name: "Masala Dosa",          orders: 55, revenue: 6600,  trend: "-2%"  },
  { name: "Garlic Naan",          orders: 148,revenue: 5920,  trend: "+18%" },
];

const ORDER_TYPE_DATA = [
  { name: "Delivery", value: 52, color: "#0891b2" },
  { name: "Dine-In",  value: 31, color: "#1a6b3a" },
  { name: "Takeaway", value: 17, color: "#d97706" },
];

const HOURLY = [
  { hour: "9AM", orders: 4 }, { hour: "10AM", orders: 7 }, { hour: "11AM", orders: 11 },
  { hour: "12PM", orders: 18 }, { hour: "1PM", orders: 22 }, { hour: "2PM", orders: 15 },
  { hour: "3PM", orders: 8 }, { hour: "4PM", orders: 6 }, { hour: "5PM", orders: 9 },
  { hour: "6PM", orders: 14 }, { hour: "7PM", orders: 21 }, { hour: "8PM", orders: 26 },
  { hour: "9PM", orders: 19 }, { hour: "10PM", orders: 12 },
];

const CATEGORY_REV = [
  { name: "Main Course", revenue: 42000 },
  { name: "Breads",      revenue: 18000 },
  { name: "Rice",        revenue: 15000 },
  { name: "Starters",    revenue: 12000 },
  { name: "Beverages",   revenue: 8000  },
  { name: "Desserts",    revenue: 5000  },
];

const NAV_MAIN = [
  { label: "Dashboard", icon: LayoutGrid,  href: "/restaurant/dashboard" },
  { label: "Menu",      icon: BookOpen,    href: "/restaurant/edit/menu" },
  { label: "Orders",    icon: ShoppingBag, href: "/restaurant/orders" },
  { label: "Analytics", icon: BarChart2,   href: "/restaurant/analytics" },
];
const NAV_SETTINGS = [
  { label: "Settings", icon: Settings, href: "/restaurant/edit/order-settings" },
  { label: "Profile",  icon: User,     href: "/restaurant/edit/basic-info" },
];

/* ── Custom Tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: "1.5px solid #dceee3", borderRadius: 12, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", fontFamily: "'Sora', sans-serif" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#9dbeaa", marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 13, fontWeight: 700, color: p.color || "#1a6b3a" }}>
          {p.name === "revenue" ? `₹${p.value.toLocaleString()}` : `${p.value} orders`}
        </p>
      ))}
    </div>
  );
};

/* ── Stat Card ── */
function StatCard({ label, value, sub, icon: Icon, iconBg, cardBg, valColor, labelColor, trend, trendUp }) {
  return (
    <div style={{ background: cardBg, borderRadius: 22, padding: "24px", border: "1.5px solid rgba(255,255,255,0.9)", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", transition: "transform 0.18s, box-shadow 0.18s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.09)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.05)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <Icon size={20} color="white" />
        </div>
        {trend && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: trendUp ? "#1a6b3a" : "#dc2626", background: trendUp ? "#e6f4ec" : "#fff5f5", padding: "4px 10px", borderRadius: 999, border: `1.5px solid ${trendUp ? "#cde8d6" : "#fecaca"}` }}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </span>
        )}
      </div>
      <p style={{ fontSize: 36, fontWeight: 800, color: valColor, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6 }}>{value}</p>
      <p style={{ fontSize: 10, fontWeight: 700, color: labelColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: labelColor, marginTop: 4, opacity: 0.7 }}>{sub}</p>}
    </div>
  );
}

/* ── Main Page ── */
export default function AnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState("week");
  const chartData = period === "week" ? REVENUE_WEEK : REVENUE_MONTH;
  const totalRevenue = chartData.reduce((a, d) => a + d.revenue, 0);
  const totalOrders  = chartData.reduce((a, d) => a + d.orders, 0);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("restaurant_id");
    router.push("/restaurant/login");
  };

  return (
    <>
      <Head>
        <title>Analytics | Menuify</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #eef5f0; font-family: 'DM Sans', sans-serif; }
          h1,h2,h3,h4,p,span,button,label { font-family: 'DM Sans', sans-serif; }
          .display { font-family: 'Sora', sans-serif !important; }

          .nav-link { text-decoration: none; display: flex; transition: background 0.15s; }
          .nav-link:hover { background: #e6f4ec !important; }
          .logout-btn { border: none; cursor: pointer; transition: background 0.15s, color 0.15s; font-family: 'DM Sans', sans-serif; }
          .logout-btn:hover { background: #fff0f3 !important; color: #e11d48 !important; }
          .period-btn { border: none; cursor: pointer; transition: all 0.15s; font-family: 'Sora', sans-serif; }
          .period-btn:hover { background: #e6f4ec !important; }

          /* Recharts overrides */
          .recharts-cartesian-axis-tick text { font-family: 'DM Sans', sans-serif; font-size: 11px; fill: #9dbeaa; font-weight: 600; }
          .recharts-legend-item-text { font-family: 'DM Sans', sans-serif !important; font-size: 12px !important; }

          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #b8d8c4; border-radius: 4px; }
        `}</style>
      </Head>

      <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#eef5f0", display: "flex" }}>

        {/* ── Sidebar ── */}
        <aside style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 260, background: "#ffffff", borderRight: "1.5px solid #dceee3", display: "flex", flexDirection: "column", zIndex: 20 }}>
          <div style={{ padding: "22px 22px 18px", borderBottom: "1.5px solid #edf6f0", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <UtensilsCrossed size={18} color="white" />
            </div>
            <div>
              <p className="display" style={{ fontSize: 16, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>Menuify</p>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#6aad7a", textTransform: "uppercase", letterSpacing: "0.14em" }}>Restaurant OS</p>
            </div>
          </div>
          <nav style={{ flex: 1, padding: "20px 14px", overflowY: "auto" }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#9dbeaa", textTransform: "uppercase", letterSpacing: "0.16em", padding: "0 10px", marginBottom: 10 }}>Navigation</p>
            {NAV_MAIN.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link key={item.label} href={item.href} className="nav-link" style={{ alignItems: "center", gap: 11, width: "100%", padding: "11px 12px", borderRadius: 12, fontSize: 14, fontWeight: active ? 700 : 500, color: active ? "#1a6b3a" : "#4a7a58", background: active ? "#e6f4ec" : "transparent", marginBottom: 3 }}>
                  <item.icon size={16} color={active ? "#1a6b3a" : "#9dbeaa"} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {active && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1a6b3a" }} />}
                </Link>
              );
            })}
            <div style={{ borderTop: "1.5px solid #edf6f0", margin: "16px 0 14px" }} />
            <p style={{ fontSize: 9, fontWeight: 700, color: "#9dbeaa", textTransform: "uppercase", letterSpacing: "0.16em", padding: "0 10px", marginBottom: 10 }}>Settings</p>
            {NAV_SETTINGS.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link key={item.label} href={item.href} className="nav-link" style={{ alignItems: "center", gap: 11, width: "100%", padding: "11px 12px", borderRadius: 12, fontSize: 14, fontWeight: active ? 700 : 500, color: active ? "#1a6b3a" : "#4a7a58", background: active ? "#e6f4ec" : "transparent", marginBottom: 3 }}>
                  <item.icon size={16} color={active ? "#1a6b3a" : "#9dbeaa"} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div style={{ padding: "14px 14px 18px", borderTop: "1.5px solid #edf6f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#f2f9f4", marginBottom: 6 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800 }}>R</div>
              <div><p style={{ fontSize: 13, fontWeight: 700, color: "#1a2e1f" }}>Restaurant Owner</p><p style={{ fontSize: 11, color: "#9dbeaa" }}>Admin</p></div>
            </div>
            <button onClick={handleLogout} className="logout-btn" style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 12px", borderRadius: 12, fontSize: 13, color: "#9dbeaa", background: "transparent", fontWeight: 500 }}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <main style={{ maxWidth: 1060, margin: "0 auto", padding: "32px 32px 60px", display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h1 className="display" style={{ fontSize: 30, fontWeight: 800, color: "#111827", letterSpacing: "-0.025em" }}>Analytics</h1>
                <p style={{ fontSize: 13, color: "#6aad7a", fontWeight: 500, marginTop: 3 }}>Performance overview for your restaurant</p>
              </div>
              {/* Period toggle */}
              <div style={{ display: "flex", background: "white", border: "1.5px solid #dceee3", borderRadius: 14, padding: 4, gap: 4 }}>
                {[["week", "This Week"], ["month", "This Month"]].map(([val, lbl]) => (
                  <button key={val} className="period-btn" onClick={() => setPeriod(val)} style={{
                    padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    background: period === val ? "#1a6b3a" : "transparent",
                    color: period === val ? "white" : "#4a7a58",
                  }}>{lbl}</button>
                ))}
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              <StatCard label="Total Revenue"   value={`₹${(totalRevenue/1000).toFixed(1)}k`} sub={`${period === "week" ? "7" : "30"} days`} icon={IndianRupee}  iconBg="#1a6b3a" cardBg="#f4faf6" valColor="#1a2e1f" labelColor="#6aad7a" trend="+14%" trendUp />
              <StatCard label="Total Orders"    value={totalOrders}   sub="All types"          icon={ShoppingCart} iconBg="#d97706" cardBg="#fefdf0" valColor="#3d2a00" labelColor="#b08030" trend="+9%"  trendUp />
              <StatCard label="Avg Order Value" value={`₹${Math.round(totalRevenue/totalOrders)}`} sub="Per order"  icon={TrendingUp}   iconBg="#4f46e5" cardBg="#f3f2ff" valColor="#1e1a5e" labelColor="#7068c8" trend="+5%"  trendUp />
              <StatCard label="Avg Rating"      value="4.6"           sub="Based on reviews"  icon={Star}         iconBg="#db2777" cardBg="#fff5f9" valColor="#4a0a28" labelColor="#d05080" trend="+0.2" trendUp />
            </div>

            {/* Revenue + Orders Chart */}
            <div style={{ background: "white", borderRadius: 24, padding: "26px 28px", border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f2f9f4", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <TrendingUp size={17} color="#1a6b3a" />
                  </div>
                  <div>
                    <h3 className="display" style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Revenue & Orders</h3>
                    <p style={{ fontSize: 11, color: "#9dbeaa" }}>₹{totalRevenue.toLocaleString()} total · {totalOrders} orders</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#1a6b3a" }} /><span style={{ fontSize: 11, fontWeight: 600, color: "#6aad7a" }}>Revenue</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#d97706" }} /><span style={{ fontSize: 11, fontWeight: 600, color: "#b08030" }}>Orders</span></div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1a6b3a" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#1a6b3a" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#d97706" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf6f0" />
                  <XAxis dataKey={period === "week" ? "day" : "day"} tick={{ fontSize: 11, fill: "#9dbeaa", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="rev" orientation="left"  tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#9dbeaa" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11, fill: "#9dbeaa" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area yAxisId="rev" type="monotone" dataKey="revenue" name="revenue" stroke="#1a6b3a" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: "#1a6b3a", stroke: "white", strokeWidth: 2 }} />
                  <Area yAxisId="ord" type="monotone" dataKey="orders"  name="orders"  stroke="#d97706" strokeWidth={2.5} fill="url(#ordGrad)" dot={false} activeDot={{ r: 5, fill: "#d97706", stroke: "white", strokeWidth: 2 }} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Row: Hourly Heatmap + Order Type Pie */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>

              {/* Hourly Orders Bar */}
              <div style={{ background: "white", borderRadius: 24, padding: "26px 28px", border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f3f2ff", border: "1.5px solid #c4bffa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Clock size={17} color="#4f46e5" />
                  </div>
                  <div>
                    <h3 className="display" style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Peak Hours</h3>
                    <p style={{ fontSize: 11, color: "#9dbeaa" }}>Orders by hour today</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={HOURLY} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf6f0" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9dbeaa", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9dbeaa" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="orders" name="orders" radius={[6, 6, 0, 0]}>
                      {HOURLY.map((entry, i) => (
                        <Cell key={i} fill={entry.orders >= 20 ? "#1a6b3a" : entry.orders >= 12 ? "#4a9a62" : "#b8ddc4"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Order Type Pie */}
              <div style={{ background: "white", borderRadius: 24, padding: "26px 24px", border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f0fafe", border: "1.5px solid #a5f3fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bike size={17} color="#0891b2" />
                  </div>
                  <div>
                    <h3 className="display" style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Order Types</h3>
                    <p style={{ fontSize: 11, color: "#9dbeaa" }}>Split by category</p>
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={ORDER_TYPE_DATA} cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={4} dataKey="value" stroke="none">
                        {ORDER_TYPE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}%`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 8 }}>
                    {ORDER_TYPE_DATA.map((d) => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#4a7a58" }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Row: Top Items + Category Revenue */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* Top Items */}
              <div style={{ background: "white", borderRadius: 24, padding: "26px 24px", border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f4faf6", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap size={17} color="#1a6b3a" fill="#1a6b3a" />
                  </div>
                  <h3 className="display" style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Top Dishes</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {TOP_ITEMS.map((item, i) => {
                    const maxOrders = TOP_ITEMS[0].orders;
                    const pct = Math.round((item.orders / maxOrders) * 100);
                    const up = item.trend.startsWith("+");
                    return (
                      <div key={item.name}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 22, height: 22, borderRadius: 7, background: i === 0 ? "#1a6b3a" : "#f2f9f4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: i === 0 ? "white" : "#9dbeaa", flexShrink: 0 }}>{i + 1}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.name}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1a6b3a" }}>₹{item.revenue.toLocaleString()}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: up ? "#1a6b3a" : "#dc2626", background: up ? "#e6f4ec" : "#fff5f5", padding: "2px 7px", borderRadius: 999 }}>{item.trend}</span>
                          </div>
                        </div>
                        <div style={{ height: 5, background: "#edf6f0", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: i === 0 ? "#1a6b3a" : "#b8ddc4", borderRadius: 999, transition: "width 0.8s ease" }} />
                        </div>
                        <p style={{ fontSize: 10, color: "#9dbeaa", marginTop: 3 }}>{item.orders} orders</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category Revenue */}
              <div style={{ background: "white", borderRadius: 24, padding: "26px 24px", border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fefdf0", border: "1.5px solid #f0e4a0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ChefHat size={17} color="#d97706" />
                  </div>
                  <h3 className="display" style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Revenue by Category</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={CATEGORY_REV} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf6f0" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "#9dbeaa" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "#4a7a58", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => [`₹${v.toLocaleString()}`, "Revenue"]} />
                    <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                      {CATEGORY_REV.map((_, i) => (
                        <Cell key={i} fill={["#1a6b3a","#2d8a52","#4aa86e","#6ac48a","#9ddcb0","#c6f0d6"][i] || "#c6f0d6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </main>
        </div>
      </div>
    </>
  );
}