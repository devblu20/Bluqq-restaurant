import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import {
  UtensilsCrossed, ShoppingBag, Clock, CheckCircle2, XCircle,
  ChefHat, Bike, LayoutGrid, BookOpen, BarChart2, Settings,
  User, LogOut, Search, Filter, RefreshCw, Eye, Phone,
  MapPin, Calendar, TrendingUp, Loader2, AlertCircle, Package
} from "lucide-react";

/* ── Fake order data ── */
const MOCK_ORDERS = [
  { id: "ORD-1041", customer: "Rahul Sharma", phone: "+91 98765 43210", items: [{ name: "Paneer Butter Masala", qty: 2, price: 280 }, { name: "Garlic Naan", qty: 4, price: 40 }], total: 720, status: "delivered", type: "delivery", address: "12, Shastri Nagar, Mandsaur", time: "12:34 PM", date: "Today" },
  { id: "ORD-1040", customer: "Priya Verma", phone: "+91 91234 56789", items: [{ name: "Dal Makhani", qty: 1, price: 220 }, { name: "Jeera Rice", qty: 1, price: 160 }], total: 380, status: "out_for_delivery", type: "delivery", address: "45, Gandhi Chowk, Mandsaur", time: "12:51 PM", date: "Today" },
  { id: "ORD-1039", customer: "Amit Patel", phone: "+91 99887 76655", items: [{ name: "Veg Biryani", qty: 1, price: 260 }, { name: "Raita", qty: 1, price: 60 }], total: 320, status: "preparing", type: "dine_in", address: "Table 4", time: "1:02 PM", date: "Today" },
  { id: "ORD-1038", customer: "Sunita Joshi", phone: "+91 88776 65544", items: [{ name: "Masala Dosa", qty: 2, price: 120 }, { name: "Filter Coffee", qty: 2, price: 80 }], total: 400, status: "confirmed", type: "takeaway", address: "Pickup", time: "1:15 PM", date: "Today" },
  { id: "ORD-1037", customer: "Deepak Gupta", phone: "+91 77665 54433", items: [{ name: "Chole Bhature", qty: 1, price: 180 }], total: 180, status: "cancelled", type: "delivery", address: "8, MG Road, Mandsaur", time: "11:20 AM", date: "Today" },
  { id: "ORD-1036", customer: "Kavita Singh", phone: "+91 66554 43322", items: [{ name: "Tandoori Chicken", qty: 1, price: 320 }, { name: "Laccha Paratha", qty: 2, price: 60 }], total: 440, status: "delivered", type: "dine_in", address: "Table 2", time: "10:45 AM", date: "Today" },
  { id: "ORD-1035", customer: "Mohan Das", phone: "+91 55443 32211", items: [{ name: "Aloo Paratha", qty: 3, price: 90 }, { name: "Lassi", qty: 2, price: 80 }], total: 430, status: "delivered", type: "takeaway", address: "Pickup", time: "9:30 AM", date: "Today" },
  { id: "ORD-1034", customer: "Neha Sharma", phone: "+91 44332 21100", items: [{ name: "Kadhai Paneer", qty: 1, price: 260 }, { name: "Butter Naan", qty: 3, price: 45 }], total: 395, status: "delivered", type: "delivery", address: "22, Subhash Nagar", time: "8:15 PM", date: "Yesterday" },
];

const STATUS_CONFIG = {
  confirmed:        { label: "Confirmed",        color: "#4f46e5", bg: "#f0f0ff", border: "#c7c6fa", icon: CheckCircle2, dot: "#4f46e5" },
  preparing:        { label: "Preparing",         color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: ChefHat,      dot: "#d97706" },
  out_for_delivery: { label: "Out for Delivery",  color: "#0891b2", bg: "#f0fafe", border: "#a5f3fc", icon: Bike,         dot: "#0891b2" },
  delivered:        { label: "Delivered",          color: "#1a6b3a", bg: "#f4faf6", border: "#cde8d6", icon: CheckCircle2, dot: "#22c55e" },
  cancelled:        { label: "Cancelled",          color: "#dc2626", bg: "#fff5f5", border: "#fecaca", icon: XCircle,      dot: "#ef4444" },
};

const TYPE_CONFIG = {
  delivery: { label: "Delivery", icon: Bike,        color: "#0891b2" },
  dine_in:  { label: "Dine-In",  icon: UtensilsCrossed, color: "#7c3aed" },
  takeaway: { label: "Takeaway", icon: Package,     color: "#d97706" },
};

const NAV_MAIN = [
  { label: "Dashboard", icon: LayoutGrid, href: "/restaurant/dashboard" },
  { label: "Menu",      icon: BookOpen,   href: "/restaurant/edit/menu" },
  { label: "WhatsApp AI", icon: MessageCircle,   href: "/restaurant/whatsapp-chat" },
  { label: "Orders",    icon: ShoppingBag,href: "/restaurant/orders" },
  { label: "Analytics", icon: BarChart2,  href: "/restaurant/analytics" },
];

const NAV_SETTINGS = [
  { label: "Settings", icon: Settings, href: "/restaurant/edit/order-settings" },
  { label: "Profile",  icon: User,     href: "/restaurant/edit/basic-info" },
];

/* ── Order Detail Drawer ── */
function OrderDrawer({ order, onClose, onStatusChange }) {
  if (!order) return null;
  const st = STATUS_CONFIG[order.status];
  const tp = TYPE_CONFIG[order.type];
  const NEXT_STATUS = { confirmed: "preparing", preparing: "out_for_delivery", out_for_delivery: "delivered" };
  const NEXT_LABEL  = { confirmed: "Start Preparing", preparing: "Mark Out for Delivery", out_for_delivery: "Mark Delivered" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }} onClick={onClose}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }} />
      <div
        style={{ width: 420, background: "white", height: "100%", overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer header */}
        <div style={{ padding: "24px 24px 20px", borderBottom: "1.5px solid #edf6f0", background: "#f8fdfb" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#9dbeaa", letterSpacing: "0.12em", textTransform: "uppercase" }}>Order Details</span>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #dceee3", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#9dbeaa" }}>×</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>{order.id}</h2>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, background: st.bg, color: st.color, border: `1.5px solid ${st.border}` }}>
              {st.label}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#9dbeaa", marginTop: 4 }}>{order.date} · {order.time}</p>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>

          {/* Customer info */}
          <div style={{ background: "#f8fdfb", borderRadius: 16, padding: 16, border: "1.5px solid #edf6f0" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#9dbeaa", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Customer</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{order.customer}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <Phone size={13} color="#9dbeaa" />
              <span style={{ fontSize: 13, color: "#4a7a58" }}>{order.phone}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <MapPin size={13} color="#9dbeaa" />
              <span style={{ fontSize: 13, color: "#4a7a58" }}>{order.address}</span>
            </div>
          </div>

          {/* Order type */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "#f8fdfb", border: "1.5px solid #edf6f0" }}>
            <tp.icon size={16} color={tp.color} />
            <span style={{ fontSize: 13, fontWeight: 700, color: tp.color }}>{tp.label}</span>
          </div>

          {/* Items */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#9dbeaa", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Items Ordered</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "#f8fdfb", border: "1.5px solid #edf6f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#e6f4ec", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#1a6b3a" }}>{item.qty}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a6b3a" }}>₹{item.qty * item.price}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 14px 0", marginTop: 4, borderTop: "1.5px dashed #dceee3" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#1a6b3a" }}>₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ padding: "16px 24px 28px", borderTop: "1.5px solid #edf6f0", display: "flex", flexDirection: "column", gap: 10 }}>
          {NEXT_STATUS[order.status] && (
            <button
              onClick={() => onStatusChange(order.id, NEXT_STATUS[order.status])}
              style={{ width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg, #1a6b3a, #22a855)", color: "white", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(26,107,58,0.25)" }}
            >
              {NEXT_LABEL[order.status]}
            </button>
          )}
          {order.status !== "cancelled" && order.status !== "delivered" && (
            <button
              onClick={() => onStatusChange(order.id, "cancelled")}
              style={{ width: "100%", padding: "12px", borderRadius: 14, background: "white", color: "#dc2626", fontWeight: 700, fontSize: 13, border: "1.5px solid #fecaca", cursor: "pointer" }}
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders]         = useState(MOCK_ORDERS);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilter]   = useState("all");
  const [selectedOrder, setSelected]= useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const ownerInitials = "R";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("restaurant_id");
    router.push("/restaurant/login");
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    setSelected(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const filtered = orders.filter(o => {
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) || o.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: "Total Today",  value: orders.filter(o => o.date === "Today").length,                          icon: ShoppingBag, bg: "#f4faf6", iconBg: "#1a6b3a", val: "#1a2e1f", lbl: "#6aad7a" },
    { label: "Preparing",    value: orders.filter(o => o.status === "preparing").length,                    icon: ChefHat,     bg: "#fffbeb", iconBg: "#d97706", val: "#3d2a00", lbl: "#b08030" },
    { label: "Out for Del.", value: orders.filter(o => o.status === "out_for_delivery").length,              icon: Bike,        bg: "#f0fafe", iconBg: "#0891b2", val: "#0c3a4a", lbl: "#0891b2" },
    { label: "Delivered",    value: orders.filter(o => o.status === "delivered" && o.date === "Today").length, icon: CheckCircle2,bg: "#f3f2ff", iconBg: "#4f46e5", val: "#1e1a5e", lbl: "#7068c8" },
  ];

  return (
    <>
      <Head>
        <title>Orders | Menuify</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #eef5f0; font-family: 'Inter', sans-serif; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }

          .nav-link { text-decoration: none; display: flex; transition: background 0.15s; }
          .nav-link:hover { background: #e6f4ec !important; }
          .logout-btn { border: none; cursor: pointer; transition: background 0.15s, color 0.15s; }
          .logout-btn:hover { background: #fff0f3 !important; color: #e11d48 !important; }
          .stat-card { transition: transform 0.18s, box-shadow 0.18s; }
          .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.09) !important; }
          .order-row { transition: background 0.15s, box-shadow 0.15s; cursor: pointer; }
          .order-row:hover { background: #f4faf6 !important; }
          .filter-btn { border: none; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #b8d8c4; border-radius: 4px; }
        `}</style>
      </Head>

      <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "#eef5f0", display: "flex" }}>

        {/* ── Sidebar ── */}
        <aside style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 260, background: "#ffffff", borderRight: "1.5px solid #dceee3", display: "flex", flexDirection: "column", zIndex: 20 }}>
          <div style={{ padding: "22px 22px 18px", borderBottom: "1.5px solid #edf6f0", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <UtensilsCrossed size={18} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>Menuify</p>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#6aad7a", textTransform: "uppercase", letterSpacing: "0.14em" }}>Restaurant OS</p>
            </div>
          </div>

          <nav style={{ flex: 1, padding: "20px 14px", overflowY: "auto" }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: "#9dbeaa", textTransform: "uppercase", letterSpacing: "0.16em", padding: "0 10px", marginBottom: 10 }}>Navigation</p>
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
            <p style={{ fontSize: 9, fontWeight: 800, color: "#9dbeaa", textTransform: "uppercase", letterSpacing: "0.16em", padding: "0 10px", marginBottom: 10 }}>Settings</p>
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
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{ownerInitials}</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1a2e1f" }}>Restaurant Owner</p>
                <p style={{ fontSize: 11, color: "#9dbeaa" }}>Admin</p>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn" style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 12px", borderRadius: 12, fontSize: 13, color: "#9dbeaa", background: "transparent", fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <main style={{ maxWidth: 1060, margin: "0 auto", padding: "32px 32px 60px", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* Topbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Orders</h1>
                <p style={{ fontSize: 13, color: "#6aad7a", fontWeight: 500, marginTop: 3 }}>Track and manage all incoming orders</p>
              </div>
              <button onClick={handleRefresh} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 12, background: "white", border: "1.5px solid #dceee3", color: "#1a6b3a", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                <RefreshCw size={15} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                Refresh
              </button>
            </div>

            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {stats.map((s) => (
                <div key={s.label} className="stat-card" style={{ background: s.bg, borderRadius: 20, padding: "22px", border: "1.5px solid rgba(255,255,255,0.9)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                    <s.icon size={18} color="white" />
                  </div>
                  <p style={{ fontSize: 34, fontWeight: 800, color: s.val, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6 }}>{s.value}</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: s.lbl, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filters + Search */}
            <div style={{ background: "white", borderRadius: 20, padding: "18px 20px", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <Search size={15} color="#9dbeaa" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by order ID or customer..."
                  style={{ width: "100%", paddingLeft: 38, paddingRight: 14, paddingTop: 10, paddingBottom: 10, fontSize: 13, background: "#f8fdfb", border: "1.5px solid #dceee3", borderRadius: 12, outline: "none", fontFamily: "'Inter', sans-serif", color: "#111827" }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[["all", "All"], ["confirmed", "Confirmed"], ["preparing", "Preparing"], ["out_for_delivery", "Delivering"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]].map(([val, lbl]) => (
                  <button key={val} className="filter-btn" onClick={() => setFilter(val)} style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                    background: filterStatus === val ? "#1a6b3a" : "#f4faf6",
                    color: filterStatus === val ? "white" : "#4a7a58",
                    border: `1.5px solid ${filterStatus === val ? "#1a6b3a" : "#dceee3"}`,
                  }}>{lbl}</button>
                ))}
              </div>
            </div>

            {/* Orders Table */}
            <div style={{ background: "white", borderRadius: 22, border: "1.5px solid #dceee3", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
              {/* Table head */}
              <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 100px 110px 90px 80px", gap: 0, padding: "12px 20px", background: "#f8fdfb", borderBottom: "1.5px solid #edf6f0" }}>
                {["Order ID", "Customer", "Items", "Total", "Type", "Status"].map(h => (
                  <p key={h} style={{ fontSize: 10, fontWeight: 800, color: "#9dbeaa", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</p>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: "60px 32px", textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f2f9f4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <ShoppingBag size={24} color="#9dbeaa" />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#1a2e1f" }}>No orders found</p>
                  <p style={{ fontSize: 13, color: "#9dbeaa", marginTop: 4 }}>Try changing the filter or search query</p>
                </div>
              ) : (
                filtered.map((order, idx) => {
                  const st = STATUS_CONFIG[order.status];
                  const tp = TYPE_CONFIG[order.type];
                  return (
                    <div
                      key={order.id}
                      className="order-row"
                      onClick={() => setSelected(order)}
                      style={{
                        display: "grid", gridTemplateColumns: "130px 1fr 100px 110px 90px 80px",
                        padding: "16px 20px", alignItems: "center",
                        borderBottom: idx < filtered.length - 1 ? "1.5px solid #f0f7f2" : "none",
                        background: "white",
                      }}
                    >
                      {/* Order ID */}
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 800, color: "#1a6b3a" }}>{order.id}</p>
                        <p style={{ fontSize: 11, color: "#9dbeaa", marginTop: 2 }}>{order.date} · {order.time}</p>
                      </div>

                      {/* Customer */}
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{order.customer}</p>
                        <p style={{ fontSize: 11, color: "#9dbeaa", marginTop: 2 }}>{order.address}</p>
                      </div>

                      {/* Items count */}
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#4a7a58" }}>
                          {order.items.reduce((a, i) => a + i.qty, 0)} items
                        </p>
                        <p style={{ fontSize: 11, color: "#9dbeaa", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}>
                          {order.items[0].name}{order.items.length > 1 ? ` +${order.items.length - 1}` : ""}
                        </p>
                      </div>

                      {/* Total */}
                      <p style={{ fontSize: 15, fontWeight: 800, color: "#1a6b3a" }}>₹{order.total}</p>

                      {/* Type */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <tp.icon size={13} color={tp.color} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: tp.color }}>{tp.label}</span>
                      </div>

                      {/* Status */}
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: st.bg, color: st.color, border: `1.5px solid ${st.border}`, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot, flexShrink: 0, animation: order.status === "out_for_delivery" ? "pulse 1.5s infinite" : "none" }} />
                        {st.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <p style={{ fontSize: 12, color: "#9dbeaa", textAlign: "center" }}>
              Showing {filtered.length} of {orders.length} orders · Click any row to view details
            </p>
          </main>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <OrderDrawer
          order={orders.find(o => o.id === selectedOrder.id)}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}
