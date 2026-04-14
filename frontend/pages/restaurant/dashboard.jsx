import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { useRestaurantAuth } from "../../hooks/useRestaurantAuth"; // Added Hook
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
  { label: "Profile", icon: User, href: "/restaurant/edit/basic-info" }, // Fixed Double Slash Bug
];

export default function Dashboard() {
  const router = useRouter();
  // Using centralized auth hook
  const { restaurant, loading: authLoading, restaurantId } = useRestaurantAuth();
  
  const [onboarding, setOnboarding] = useState(null);
  const [liveCheck, setLiveCheck] = useState(null);
  const [itemCount, setItemCount] = useState(0);
  const [catCount, setCatCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;

    // Fetch dashboard specific data
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

  // Show loader while auth or data is fetching
  if (authLoading || dataLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="animate-spin text-orange-500" size={36} />
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

  return (
    <>
      <Head>
        <title>Dashboard | Menuify</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Syne:wght@600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="min-h-screen bg-gray-50 flex">

        {/* Sidebar */}
        <aside className="fixed top-0 left-0 bottom-0 w-56 bg-white border-r border-gray-100 flex flex-col z-20 shadow-sm">
          <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed size={16} className="text-white" />
            </div>
            <div>
              <p style={{ fontFamily: "'Syne', sans-serif" }} className="text-sm font-bold text-gray-900 leading-tight">
                Menuify
              </p>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Restaurant OS</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Main</p>
            {NAV_MAIN.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link key={item.label} href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all
                    ${active
                      ? "bg-orange-50 text-orange-600 font-bold"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}
                >
                  <item.icon size={16} className={active ? "text-orange-500" : "text-gray-400"} />
                  {item.label}
                </Link>
              );
            })}

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mt-6 mb-2">Settings</p>
            {NAV_SETTINGS.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link key={item.label} href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all
                    ${active
                      ? "bg-orange-50 text-orange-600 font-bold"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}
                >
                  <item.icon size={16} className={active ? "text-orange-500" : "text-gray-400"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all font-medium"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="ml-56 flex-1 min-w-0">
          <main className="max-w-4xl mx-auto px-8 py-8 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-bold text-gray-900">
                  Dashboard
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">{today}</p>
              </div>
              <div className="flex items-center gap-3">
                {isLive ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                    Live & Accepting Orders
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                    Setup Mode
                  </span>
                )}
                <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-orange-200">
                  {ownerInitials}
                </div>
              </div>
            </div>

            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-orange-500 px-8 py-8 flex items-center justify-between shadow-xl shadow-orange-100">
              <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/4" />
              <div className="absolute right-20 bottom-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2" />

              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Welcome back,</p>
                <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="text-3xl font-bold text-white mb-2">
                  {restaurant?.owner_name} 👋
                </h2>
                <div className="flex items-center gap-2 text-sm text-white/80 font-medium">
                  <span className="px-2 py-0.5 bg-white/20 rounded-md capitalize">{restaurant?.city}</span>
                  <span className="w-1 h-1 rounded-full bg-white/40" />
                  <span className="capitalize">{restaurant?.business_type?.replace("_", " ")}</span>
                </div>
              </div>

              <div className="relative z-10 text-right bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                <p className="text-[10px] text-white/70 uppercase font-bold tracking-widest mb-1">Onboarding</p>
                <p style={{ fontFamily: "'Syne', sans-serif" }} className="text-4xl font-bold text-white">
                  {completionPercent}%
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Menu items", value: itemCount, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Categories", value: catCount, icon: ChefHat, color: "text-purple-500", bg: "bg-purple-50" },
                { label: "Orders today", value: 0, icon: ShoppingBag, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Setup Status", value: isLive ? "Live" : "Steps", icon: isLive ? CheckCircle2 : Circle, color: isLive ? "text-green-500" : "text-gray-400", bg: isLive ? "bg-green-50" : "bg-gray-50" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
                    <stat.icon size={18} className={stat.color} />
                  </div>
                  <p style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Checklist */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 style={{ fontFamily: "'Syne', sans-serif" }} className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                    Go-live checklist
                  </h3>
                  {completionPercent === 100 && (
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100 uppercase tracking-wider">
                      Ready to Launch
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {checklist.map((item, i) => {
                    const done = onboarding?.steps?.[i]?.completed ?? (completionPercent === 100);
                    return (
                      <div key={item.label} className="flex items-center gap-4 group">
                        {done ? <CheckCircle2 size={20} className="text-green-500 shrink-0" /> : <Circle size={20} className="text-gray-200 shrink-0" />}
                        <div className="min-w-0">
                          <p className={`text-sm font-bold ${done ? "text-gray-800" : "text-gray-400"}`}>{item.label}</p>
                          <p className="text-[11px] text-gray-400 truncate">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-50">
                   <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    <span>Progress</span>
                    <span>{completionPercent}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${completionPercent}%` }} />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <h3 style={{ fontFamily: "'Syne', sans-serif" }} className="text-sm font-bold text-gray-900 uppercase tracking-tight mb-6">
                  Quick actions
                </h3>
                <div className="space-y-2.5">
                  {quickActions.map((action) => (
                    <Link key={action.label} href={action.href}
                      className="flex items-center gap-3 p-3 border border-gray-100 rounded-2xl hover:border-orange-200 hover:bg-orange-50/50 transition-all group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors text-gray-500">
                        <action.icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">{action.label}</p>
                        <p className="text-[11px] text-gray-400">{action.desc}</p>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
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