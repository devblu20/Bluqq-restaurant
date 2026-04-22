import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { getMe, getRestaurant, updateRestaurant } from "../../services/api";
import {
  Loader2, Store, MapPin, Phone, Mail, Save, User,
  UtensilsCrossed, LayoutGrid, BookOpen, ShoppingBag,
  BarChart2, Settings, LogOut, ChevronLeft, Building2,
  Pencil, CheckCircle2, Globe, Hash,MessageCircle
} from "lucide-react";

/* ─────────────────────────────── NAV DATA ─────────────────────────────── */
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

const BUSINESS_TYPES = [
  { value: "dine_in",  label: "Dine-In",  emoji: "🍽️" },
  { value: "takeaway", label: "Takeaway",  emoji: "🥡" },
  { value: "delivery", label: "Delivery",  emoji: "🛵" },
];

/* ─────────────────────────────── SIDEBAR ─────────────────────────────── */
function Sidebar({ restaurant, onLogout, currentPath }) {
  const ownerInitials =
    restaurant?.owner_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "R";
  return (
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

      {/* Nav */}
      <nav style={{ flex: 1, padding: "20px 14px", overflowY: "auto" }}>
        <p style={{ fontSize: 9, fontWeight: 800, color: "#9dbeaa", textTransform: "uppercase", letterSpacing: "0.16em", padding: "0 10px", marginBottom: 10 }}>Navigation</p>
        {NAV_MAIN.map((item) => {
          const active = currentPath === item.href;
          return (
            <Link key={item.label} href={item.href} style={{
              textDecoration: "none", display: "flex", alignItems: "center", gap: 11, width: "100%",
              padding: "11px 12px", borderRadius: 12, fontSize: 14,
              fontWeight: active ? 700 : 500,
              color: active ? "#1a6b3a" : "#4a7a58",
              background: active ? "#e6f4ec" : "transparent",
              marginBottom: 3, transition: "background 0.15s, color 0.15s",
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
          const active = currentPath === item.href;
          return (
            <Link key={item.label} href={item.href} style={{
              textDecoration: "none", display: "flex", alignItems: "center", gap: 11, width: "100%",
              padding: "11px 12px", borderRadius: 12, fontSize: 14,
              fontWeight: active ? 700 : 500,
              color: active ? "#1a6b3a" : "#4a7a58",
              background: active ? "#e6f4ec" : "transparent",
              marginBottom: 3, transition: "background 0.15s",
            }}>
              <item.icon size={16} color={active ? "#1a6b3a" : "#9dbeaa"} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {active && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1a6b3a" }} />}
            </Link>
          );
        })}
      </nav>

      {/* User Card */}
      <div style={{ padding: "14px 14px 18px", borderTop: "1.5px solid #edf6f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#f2f9f4", marginBottom: 6 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
            {ownerInitials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a2e1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{restaurant?.owner_name}</p>
            <p style={{ fontSize: 11, color: "#9dbeaa", textTransform: "capitalize" }}>{restaurant?.business_type?.replace(/_/g, " ")}</p>
          </div>
        </div>
        <button onClick={onLogout} style={{
          display: "flex", alignItems: "center", gap: 9, width: "100%",
          padding: "9px 12px", borderRadius: 12, fontSize: 13, color: "#9dbeaa",
          background: "transparent", border: "none", fontWeight: 500,
          fontFamily: "'Inter', sans-serif", cursor: "pointer",
        }}>
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}

/* ─────────────────────────────── SECTION CARD ─────────────────────────── */
function Card({ title, icon: Icon, badge, children }) {
  return (
    <div style={{
      background: "white", borderRadius: 22, padding: "26px 28px",
      border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, paddingBottom: 16, borderBottom: "1.5px solid #edf6f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: "#f2f9f4", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={16} color="#1a6b3a" />
          </div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</h2>
        </div>
        {badge && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#1a6b3a", background: "#e6f4ec", padding: "4px 12px", borderRadius: 999, border: "1.5px solid #b8ddc4" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────── FIELD WRAP ─────────────────────────────── */
function FieldWrap({ label, required, hint, error, children }) {
  return (
    <div style={{ width: "100%" }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 7 }}>
        {label}
        {required && <span style={{ color: "#1a6b3a", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && !error && <p style={{ fontSize: 11, color: "#9dbeaa", marginTop: 5 }}>{hint}</p>}
      {error && <p style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, marginTop: 5 }}>{error}</p>}
    </div>
  );
}

/* ─────────────────────────────── MAIN PAGE ─────────────────────────────── */
export default function EditBasicInfoPage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [fetching, setFetching]     = useState(true);
  const [saving, setSaving]         = useState(false);
  const [savedOnce, setSavedOnce]   = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm();

  const watchedName = watch("name", "");
  const watchedOwner = watch("owner_name", "");
  const ownerInitials = watchedOwner?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "R";

  useEffect(() => {
    const id = localStorage.getItem("restaurant_id"); // ← YEH ADD KARO
  if (!id) return;

    Promise.all([getMe(), getRestaurant(id)])
      .then(([meRes, restRes]) => {
        setRestaurant(meRes.data);
        const formData = { ...restRes.data };
        if (formData.business_type && typeof formData.business_type === "string") {
          formData.business_type = formData.business_type.split(",").filter(Boolean);
        } else if (!formData.business_type) {
          formData.business_type = [];
        }
        reset(formData);
      })
      .catch(() => {
        toast.error("Session expired. Please login again.");
        router.replace("/restaurant/login");
      })
      .finally(() => setFetching(false));
  }, [reset]);

  const onSubmit = async (data) => {
    setSaving(true);
    const id = localStorage.getItem("restaurant_id");
    try {
      const payload = {
        ...data,
        business_type: Array.isArray(data.business_type)
          ? data.business_type.join(",")
          : data.business_type,
      };
      const res = await updateRestaurant(id, payload);
      setRestaurant(res.data);
      toast.success("Profile updated!");
      setSavedOnce(true);
      setTimeout(() => setSavedOnce(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* ── Input style ── */
  const inputStyle = {
    width: "100%", padding: "11px 14px", fontSize: 14,
    fontFamily: "'Inter', sans-serif", fontWeight: 500,
    color: "#1a2e1f", background: "#f4faf6",
    border: "1.5px solid #cde8d6", borderRadius: 12, outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
  };
  const iconInputStyle = { ...inputStyle, paddingLeft: 42 };

  /* ── Loader ── */
  if (fetching) return (
    <div style={{ minHeight: "100vh", background: "#eef5f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <UtensilsCrossed size={22} color="white" />
        </div>
        <Loader2 size={24} color="#1a6b3a" style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "#6aad7a", fontWeight: 600 }}>Loading profile…</p>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Restaurant Profile | Menuify</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #eef5f0; font-family: 'Inter', sans-serif; }
          @keyframes spin    { to { transform: rotate(360deg); } }
          @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
          @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.45} }

          .field-input-focus:focus {
            border-color: #1a6b3a !important;
            background: #fff !important;
            box-shadow: 0 0 0 3px rgba(26,107,58,0.1) !important;
          }
          .biz-label {
            display: flex; align-items: center; gap: 12px;
            padding: 14px 16px; border-radius: 14px;
            border: 1.5px solid #cde8d6; background: #f4faf6;
            cursor: pointer; transition: all 0.15s; user-select: none;
          }
          .biz-label:hover { border-color: #1a6b3a; background: #e6f4ec; }
          .biz-label.checked { border-color: #1a6b3a; background: #e6f4ec; box-shadow: 0 0 0 3px rgba(26,107,58,0.08); }

          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #b8d8c4; border-radius: 4px; }
        `}</style>
      </Head>

      <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "#eef5f0", display: "flex" }}>

        <Sidebar
          restaurant={restaurant}
          onLogout={() => { localStorage.clear(); router.push("/restaurant/login"); }}
          currentPath="/restaurant/edit/basic-info"
        />

        <div style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 36px 100px", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* ── Back button ── */}
            <button
              onClick={() => router.push("/restaurant/dashboard")}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6aad7a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Inter', sans-serif", width: "fit-content" }}
            >
              <ChevronLeft size={15} /> Back to Dashboard
            </button>

            {/* ── Profile Hero Banner ── */}
            <div style={{
              position: "relative", overflow: "hidden", borderRadius: 24,
              background: "linear-gradient(135deg, #0f3d20 0%, #1a6b3a 55%, #22a855 100%)",
              padding: "32px 40px", boxShadow: "0 16px 48px rgba(26,107,58,0.22)",
            }}>
              {/* Decorative circles */}
              <div style={{ position: "absolute", top: -30, right: 200, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -20, right: 80, width: 100, height: 100, borderRadius: "50%", background: "rgba(0,0,0,0.07)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: 20, right: 60, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 28 }}>
                {/* Avatar */}
                <div style={{
                  width: 80, height: 80, borderRadius: 22,
                  background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, backdropFilter: "blur(8px)",
                }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: "white" }}>{ownerInitials}</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 6 }}>
                    Restaurant Profile
                  </p>
                  <h1 style={{ fontSize: 32, fontWeight: 800, color: "white", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 10 }}>
                    {watchedName || restaurant?.name || "Your Restaurant"}
                  </h1>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {restaurant?.city && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                        <MapPin size={11} /> {restaurant.city}
                      </span>
                    )}
                    {restaurant?.business_type && (
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500, textTransform: "capitalize" }}>
                        {restaurant.business_type.replace(/_/g, " ").replace(/,/g, " · ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit badge */}
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 16, background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Pencil size={20} color="white" />
                  </div>
                  <p style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.16em" }}>Edit Mode</p>
                </div>
              </div>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* ── Section 1: Basic Details ── */}
              <Card title="Basic Details" icon={Store}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

                  <FieldWrap label="Restaurant Name" required error={errors.name?.message}>
                    <input
                      className="field-input-focus"
                      style={{ ...inputStyle, ...(errors.name ? { borderColor: "#ef4444", background: "#fff8f8" } : {}) }}
                      placeholder="e.g. Spice Garden"
                      {...register("name", { required: "Restaurant name is required" })}
                    />
                  </FieldWrap>

                  <FieldWrap label="Owner Name" required error={errors.owner_name?.message}>
                    <input
                      className="field-input-focus"
                      style={{ ...inputStyle, ...(errors.owner_name ? { borderColor: "#ef4444", background: "#fff8f8" } : {}) }}
                      placeholder="e.g. Rahul Sharma"
                      {...register("owner_name", { required: "Owner name is required" })}
                    />
                  </FieldWrap>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <FieldWrap label="Description" hint="Shown as tagline on your digital menu">
                      <input
                        className="field-input-focus"
                        style={inputStyle}
                        placeholder="e.g. Authentic North Indian cuisine since 2015"
                        {...register("description")}
                      />
                    </FieldWrap>
                  </div>

                  {/* Business Type */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <FieldWrap label="Business Type" hint="Select all that apply" error={errors.business_type?.message}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 4 }}>
                        {BUSINESS_TYPES.map((t) => (
                          <label key={t.value} className="biz-label">
                            <input
                              type="checkbox"
                              value={t.value}
                              style={{ accentColor: "#1a6b3a", width: 17, height: 17, flexShrink: 0 }}
                              {...register("business_type", { required: "Select at least one type" })}
                            />
                            <span style={{ fontSize: 20 }}>{t.emoji}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2e1f" }}>{t.label}</span>
                          </label>
                        ))}
                      </div>
                    </FieldWrap>
                  </div>

                </div>
              </Card>

              {/* ── Section 2: Contact ── */}
              <Card title="Contact Information" icon={Phone}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

                  <FieldWrap label="Email Address" required error={errors.email?.message}>
                    <div style={{ position: "relative" }}>
                      <Mail size={15} color="#9dbeaa" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      <input
                        className="field-input-focus"
                        style={{ ...iconInputStyle, ...(errors.email ? { borderColor: "#ef4444", background: "#fff8f8" } : {}) }}
                        type="email"
                        placeholder="restaurant@email.com"
                        {...register("email", {
                          required: "Email is required",
                          pattern: { value: /^\S+@\S+$/i, message: "Invalid email" },
                        })}
                      />
                    </div>
                  </FieldWrap>

                  <FieldWrap label="Phone Number" required error={errors.phone?.message}>
                    <div style={{ position: "relative" }}>
                      <Phone size={15} color="#9dbeaa" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      <input
                        className="field-input-focus"
                        style={{ ...iconInputStyle, ...(errors.phone ? { borderColor: "#ef4444", background: "#fff8f8" } : {}) }}
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        {...register("phone", { required: "Phone number is required" })}
                      />
                    </div>
                  </FieldWrap>

                </div>
              </Card>

              {/* ── Section 3: Location ── */}
              <Card title="Store Location" icon={MapPin}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

                  <FieldWrap label="City" required error={errors.city?.message}>
                    <div style={{ position: "relative" }}>
                      <Globe size={15} color="#9dbeaa" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      <input
                        className="field-input-focus"
                        style={{ ...iconInputStyle, ...(errors.city ? { borderColor: "#ef4444", background: "#fff8f8" } : {}) }}
                        placeholder="e.g. Mandsaur"
                        {...register("city", { required: "City is required" })}
                      />
                    </div>
                  </FieldWrap>

                  <FieldWrap label="Full Address" hint="Street, locality, landmark">
                    <div style={{ position: "relative" }}>
                      <Building2 size={15} color="#9dbeaa" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      <input
                        className="field-input-focus"
                        style={iconInputStyle}
                        placeholder="123 Main St, Bandra West…"
                        {...register("address")}
                      />
                    </div>
                  </FieldWrap>

                </div>
              </Card>

              {/* ── Submit ── */}
              <div style={{ paddingTop: 4 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    padding: "16px", borderRadius: 16,
                    background: savedOnce
                      ? "linear-gradient(135deg, #166534 0%, #16a34a 100%)"
                      : "linear-gradient(135deg, #1a6b3a 0%, #22a855 100%)",
                    color: "white", fontWeight: 800, fontSize: 15,
                    border: "none", cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: "0 8px 24px rgba(26,107,58,0.28)",
                    transition: "transform 0.15s, box-shadow 0.15s, opacity 0.15s",
                    opacity: saving ? 0.7 : 1,
                    fontFamily: "'Inter', sans-serif",
                  }}
                  onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(26,107,58,0.34)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(26,107,58,0.28)"; }}
                >
                  {saving ? (
                    <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Saving Changes…</>
                  ) : savedOnce ? (
                    <><CheckCircle2 size={18} /> Profile Updated!</>
                  ) : (
                    <><Save size={18} /> Update Profile</>
                  )}
                </button>
                <p style={{ textAlign: "center", fontSize: 12, color: "#9dbeaa", marginTop: 10 }}>
                  Changes reflect on your digital menu immediately.
                </p>
              </div>

            </form>
          </main>
        </div>
      </div>

      {/* ── Floating Unsaved Bar ── */}
      {isDirty && !saving && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          width: "90%", maxWidth: 520, background: "#111827", color: "white",
          padding: "16px 20px", borderRadius: 18, boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          animation: "slideUp 0.3s ease", zIndex: 99,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fde047", display: "inline-block", animation: "pulse 2s infinite" }} />
            <p style={{ fontSize: 13, fontWeight: 600 }}>You have unsaved changes</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => reset()}
              style={{ padding: "8px 14px", borderRadius: 10, background: "transparent", color: "#9ca3af", border: "1px solid #374151", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
            >
              Discard
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              style={{ padding: "8px 18px", borderRadius: 10, background: "#1a6b3a", color: "white", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif" }}
            >
              <Save size={12} /> Save
            </button>
          </div>
        </div>
      )}
    </>
  );
}
