import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  getMe, getMenuItems, getCategories, createMenuItem,
  updateMenuItem, createCategory, uploadMenuImage, deleteMenuItem
} from "../../../services/api";
import {
  Loader2, Plus, PenLine, X, Search, ChefHat, ImageIcon,
  ToggleLeft, ToggleRight, FolderPlus, Save, Upload, Sparkles,
  ScanLine, Trash2, UtensilsCrossed, LayoutGrid, BookOpen,
  ShoppingBag, BarChart2, Settings, User, LogOut, Tag
} from "lucide-react";

/* ── Sidebar (same as dashboard) ── */
const NAV_MAIN = [
  { label: "Dashboard", icon: LayoutGrid, href: "/restaurant/dashboard" },
  { label: "Menu",      icon: BookOpen,   href: "/restaurant/edit/menu" },
  { label: "Orders",    icon: ShoppingBag,href: "/restaurant/orders" },
  { label: "Analytics", icon: BarChart2,  href: "/restaurant/analytics" },
];
const NAV_SETTINGS = [
  { label: "Settings", icon: Settings, href: "/restaurant/edit/order-settings" },
  { label: "Profile",  icon: User,     href: "/restaurant/edit/basic-info" },
];

function Sidebar({ restaurant, onLogout, currentPath }) {
  const ownerInitials = restaurant?.owner_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "R";
  return (
    <aside style={{
      position: "fixed", top: 0, left: 0, bottom: 0, width: 260,
      background: "#ffffff", borderRight: "1.5px solid #dceee3",
      display: "flex", flexDirection: "column", zIndex: 20,
    }}>
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
        <button onClick={onLogout} style={{
          display: "flex", alignItems: "center", gap: 9, width: "100%",
          padding: "9px 12px", borderRadius: 12, fontSize: 13, color: "#9dbeaa",
          background: "transparent", border: "none", fontWeight: 500, fontFamily: "'Inter', sans-serif",
          cursor: "pointer", transition: "background 0.15s, color 0.15s",
        }}>
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}

/* ── AI Scanner ── */
function MenuScanner({ restaurantId, onScanComplete }) {
  const [scanning, setScanning] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    setScanning(true);
    const formData = new FormData();
    formData.append("file", file);
    const toastId = toast.loading("AI is reading your menu...");
    try {
      await uploadMenuImage(restaurantId, formData);
      toast.success("Menu scanned! Items added.", { id: toastId });
      onScanComplete();
    } catch {
      toast.error("Scan failed. Try a clearer photo.", { id: toastId });
    } finally {
      setScanning(false);
      e.target.value = null;
    }
  };

  return (
    <div style={{
      position: "relative", overflow: "hidden", borderRadius: 22,
      background: "linear-gradient(135deg, #0f3d20 0%, #1a6b3a 50%, #22a855 100%)",
      padding: "32px 36px", marginBottom: 28,
      boxShadow: "0 12px 40px rgba(26,107,58,0.2)",
    }}>
      {/* decorative circles */}
      <div style={{ position: "absolute", top: -20, right: 120, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -30, right: 60, width: 90, height: 90, borderRadius: "50%", background: "rgba(0,0,0,0.08)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {scanning ? <Loader2 size={26} color="white" style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={26} color="white" />}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 6 }}>AI Powered</p>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: "white", marginBottom: 4 }}>Smart Menu Scanner</h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Upload a photo of your paper menu — AI extracts dishes & prices automatically.</p>
        </div>
        <label style={{
          display: "flex", alignItems: "center", gap: 10, padding: "14px 24px",
          background: "white", color: "#1a6b3a", fontWeight: 800, fontSize: 14,
          borderRadius: 14, cursor: "pointer", flexShrink: 0,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)", transition: "transform 0.15s",
        }}>
          <Upload size={18} />
          {scanning ? "Processing..." : "Scan Menu Photo"}
          <input type="file" style={{ display: "none" }} accept="image/*" onChange={handleFileChange} disabled={scanning} />
        </label>
      </div>
    </div>
  );
}

/* ── Item Card ── */
function MenuItemCard({ item, categories, onEdit, onToggle, onDelete }) {
  const cat = categories.find(c => c.id === item.category_id);
  return (
    <div style={{
      background: item.is_available ? "white" : "#fafafa",
      borderRadius: 20, padding: 18, border: "1.5px solid #e8f0eb",
      boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      opacity: item.is_available ? 1 : 0.65,
      transition: "transform 0.16s, box-shadow 0.16s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.09)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.04)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 58, height: 58, borderRadius: 14, background: "#f2f9f4", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
          {item.image_url
            ? <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <ImageIcon size={20} color="#9dbeaa" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
              {item.description && <p style={{ fontSize: 11, color: "#9dbeaa", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>{item.description}</p>}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => onEdit(item)} style={{
                width: 30, height: 30, borderRadius: 10, background: "#f2f9f4", border: "1.5px solid #dceee3",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.15s",
              }} onMouseEnter={e => e.currentTarget.style.background = "#e6f4ec"} onMouseLeave={e => e.currentTarget.style.background = "#f2f9f4"}>
                <PenLine size={13} color="#1a6b3a" />
              </button>
              <button onClick={() => onDelete(item)} style={{
                width: 30, height: 30, borderRadius: 10, background: "#fff5f5", border: "1.5px solid #fecaca",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.15s",
              }} onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"} onMouseLeave={e => e.currentTarget.style.background = "#fff5f5"}>
                <Trash2 size={13} color="#ef4444" />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#1a6b3a" }}>₹{item.price}</span>
            {cat && (
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 10px", background: "#f2f9f4", color: "#4a7a58", borderRadius: 999, border: "1.5px solid #dceee3" }}>
                {cat.name}
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1.5px solid #edf6f0" }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: item.is_available ? "#1a6b3a" : "#9ca3af" }}>
          {item.is_available ? "● In Stock" : "○ Out of Stock"}
        </span>
        <button onClick={() => onToggle(item)} style={{ background: "none", border: "none", cursor: "pointer", color: item.is_available ? "#1a6b3a" : "#d1d5db", transition: "color 0.2s" }}>
          {item.is_available ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
        </button>
      </div>
    </div>
  );
}

/* ── Add/Edit Modal ── */
function ItemModal({ item, categories, onClose, onSave }) {
  const isEdit = !!item?.id;
  const [form, setForm] = useState({
    name: item?.name || "", description: item?.description || "",
    price: item?.price || "", category_id: item?.category_id || (categories[0]?.id || ""),
    is_available: item?.is_available ?? true, image_url: item?.image_url || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target ? e.target.value : e }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) { toast.error("Name and price are required"); return; }
    setSaving(true);
    await onSave({ ...item, ...form, price: parseFloat(form.price) });
    setSaving(false);
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", fontSize: 14,
    background: "#f8fdfb", border: "1.5px solid #dceee3", borderRadius: 12,
    color: "#111827", outline: "none", fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1.5px solid #edf6f0", background: "#f8fdfb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChefHat size={16} color="white" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{isEdit ? "Update Dish" : "Add New Dish"}</h3>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f0f0f0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color="#6b7280" />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 6, display: "block" }}>Item Name *</label>
            <input style={inputStyle} value={form.name} onChange={set("name")} required />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 6, display: "block" }}>Description</label>
            <textarea style={{ ...inputStyle, resize: "none", height: 80 }} value={form.description} onChange={set("description")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 6, display: "block" }}>Price (₹) *</label>
              <input style={inputStyle} type="number" value={form.price} onChange={set("price")} required />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 6, display: "block" }}>Category</label>
              <select style={inputStyle} value={form.category_id} onChange={set("category_id")}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 700, border: "1.5px solid #dceee3", background: "white", color: "#4a7a58", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: "#1a6b3a", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 16px rgba(26,107,58,0.3)" }}>
              {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
              {isEdit ? "Update Dish" : "Add to Menu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function EditMenuPage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [modal, setModal] = useState(null);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [showCatInput, setShowCatInput] = useState(false);

  const restaurantId = typeof window !== "undefined" ? localStorage.getItem("restaurant_id") : null;

  const fetchData = useCallback(async (id) => {
    try {
      const [meRes, itemRes, catRes] = await Promise.all([getMe(), getMenuItems(id), getCategories(id)]);
      setRestaurant(meRes.data);
      setItems(itemRes.data || []);
      setCategories(catRes.data || []);
    } catch {
      toast.error("Fetch failed");
      router.replace("/restaurant/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !restaurantId) { router.replace("/restaurant/login"); return; }
    fetchData(restaurantId);
  }, [fetchData, restaurantId, router]);

  const handleSaveItem = async (formData) => {
    try {
      if (formData.id) {
        const res = await updateMenuItem(restaurantId, formData.id, formData);
        setItems(prev => prev.map(i => i.id === formData.id ? res.data : i));
        toast.success("Item updated!");
      } else {
        const res = await createMenuItem(restaurantId, formData);
        setItems(prev => [...prev, res.data]);
        toast.success(`"${res.data.name}" added!`);
      }
      setModal(null);
    } catch {
      toast.error("Failed to save item");
    }
  };

  const handleToggle = async (item) => {
    try {
      const res = await updateMenuItem(restaurantId, item.id, { is_available: !item.is_available });
      setItems(prev => prev.map(i => i.id === item.id ? res.data : i));
    } catch { toast.error("Update failed"); }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from your menu?`)) return;
    try {
      await deleteMenuItem(restaurantId, item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success("Dish removed");
    } catch { toast.error("Could not delete dish"); }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await createCategory(restaurantId, { name: newCatName });
      setCategories(prev => [...prev, res.data]);
      setNewCatName(""); setShowCatInput(false);
      toast.success("Category created");
    } catch { toast.error("Failed to add category"); }
    finally { setAddingCat(false); }
  };

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterCat === "all" || item.category_id === filterCat)
  );

  const ownerInitials = restaurant?.owner_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "R";

  if (loading) return (
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

  return (
    <>
      <Head>
        <title>Menu Management | Menuify</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #eef5f0; font-family: 'Inter', sans-serif; }
          @keyframes spin { to { transform: rotate(360deg); } }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #b8d8c4; border-radius: 4px; }
        `}</style>
      </Head>

      <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "#eef5f0", display: "flex" }}>
        <Sidebar restaurant={restaurant} onLogout={() => { localStorage.clear(); router.push("/restaurant/login"); }} currentPath="/restaurant/edit/menu" />

        <div style={{ marginLeft: 260, flex: 1, minWidth: 0 }}>
          <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 32px 60px", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Menu Management</h1>
                <p style={{ fontSize: 13, color: "#6aad7a", marginTop: 4, fontWeight: 500 }}>
                  {items.length} dish{items.length !== 1 ? "es" : ""} in your menu
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => setShowCatInput(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 12, background: "white", border: "1.5px solid #dceee3", color: "#1a6b3a", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f2f9f4"}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}
                >
                  <Tag size={15} /> Add Category
                </button>
                <button
                  onClick={() => setModal({})}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, background: "#1a6b3a", color: "white", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(26,107,58,0.3)", transition: "transform 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <Plus size={16} /> Add Dish
                </button>
              </div>
            </div>

            {/* Add Category Input */}
            {showCatInput && (
              <div style={{ background: "white", borderRadius: 18, padding: "18px 22px", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <FolderPlus size={18} color="#1a6b3a" />
                <input
                  value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  placeholder="Category name (e.g. Starters, Mains...)"
                  style={{ flex: 1, padding: "9px 14px", fontSize: 14, background: "#f8fdfb", border: "1.5px solid #dceee3", borderRadius: 10, outline: "none", fontFamily: "'Inter', sans-serif" }}
                  onKeyDown={e => e.key === "Enter" && handleAddCategory()}
                />
                <button onClick={handleAddCategory} disabled={addingCat} style={{ padding: "9px 18px", borderRadius: 10, background: "#1a6b3a", color: "white", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
                  {addingCat ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Create"}
                </button>
                <button onClick={() => setShowCatInput(false)} style={{ padding: "9px 14px", borderRadius: 10, background: "#f2f9f4", color: "#4a7a58", fontWeight: 600, fontSize: 13, border: "1.5px solid #dceee3", cursor: "pointer" }}>Cancel</button>
              </div>
            )}

            {/* AI Scanner */}
            <MenuScanner restaurantId={restaurantId} onScanComplete={() => fetchData(restaurantId)} />

            {/* Search & Filter */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <Search size={15} color="#9dbeaa" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Find a dish..."
                  style={{ width: "100%", paddingLeft: 40, paddingRight: 16, paddingTop: 11, paddingBottom: 11, fontSize: 14, background: "white", border: "1.5px solid #dceee3", borderRadius: 14, outline: "none", fontFamily: "'Inter', sans-serif", color: "#111827" }}
                />
              </div>
              <select
                value={filterCat} onChange={e => setFilterCat(e.target.value)}
                style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, background: "white", border: "1.5px solid #dceee3", borderRadius: 14, color: "#4a7a58", cursor: "pointer", outline: "none", fontFamily: "'Inter', sans-serif" }}
              >
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Category Pills */}
            {categories.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => setFilterCat("all")}
                  style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "1.5px solid", borderColor: filterCat === "all" ? "#1a6b3a" : "#dceee3", background: filterCat === "all" ? "#e6f4ec" : "white", color: filterCat === "all" ? "#1a6b3a" : "#4a7a58", cursor: "pointer", transition: "all 0.15s" }}
                >All</button>
                {categories.map(c => (
                  <button key={c.id}
                    onClick={() => setFilterCat(c.id)}
                    style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "1.5px solid", borderColor: filterCat === c.id ? "#1a6b3a" : "#dceee3", background: filterCat === c.id ? "#e6f4ec" : "white", color: filterCat === c.id ? "#1a6b3a" : "#4a7a58", cursor: "pointer", transition: "all 0.15s" }}
                  >{c.name}</button>
                ))}
              </div>
            )}

            {/* Items Grid */}
            {filtered.length === 0 ? (
              <div style={{ background: "white", borderRadius: 24, padding: "64px 32px", textAlign: "center", border: "1.5px dashed #dceee3" }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: "#f2f9f4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <ChefHat size={28} color="#9dbeaa" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a2e1f", marginBottom: 8 }}>No dishes found</h3>
                <p style={{ fontSize: 13, color: "#9dbeaa" }}>Add your first dish or try a different filter</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {filtered.map(item => (
                  <MenuItemCard key={item.id} item={item} categories={categories}
                    onEdit={setModal} onToggle={handleToggle} onDelete={handleDeleteItem} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {modal !== null && (
        <ItemModal item={modal.id ? modal : null} categories={categories} onClose={() => setModal(null)} onSave={handleSaveItem} />
      )}
    </>
  );
}