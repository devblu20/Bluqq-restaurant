import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import RestaurantLayout from "../../../components/OnboardingLayout";
import {
  getMe, getMenuItems, getCategories,
  createMenuItem, updateMenuItem, createCategory,
  uploadMenuImage, deleteMenuItem
} from "../../../services/api";
import {
  Loader2, Plus, PenLine, X, Search, ChefHat,
  ImageIcon, ToggleLeft, ToggleRight, Tag, Save,
  Upload, Sparkles, ScanLine, Trash2, UtensilsCrossed
} from "lucide-react";

/* ══════════════════════════════════════
   AI Scanner
══════════════════════════════════════ */
function MenuScanner({ restaurantId, onScanComplete }) {
  const [scanning, setScanning] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    setScanning(true);
    const fd = new FormData();
    fd.append("file", file);
    const tid = toast.loading("AI is reading your menu… Please wait.");
    try {
      await uploadMenuImage(restaurantId, fd);
      toast.success("Menu scanned! Items added.", { id: tid });
      onScanComplete();
    } catch {
      toast.error("AI Scan failed. Try a clearer photo.", { id: tid });
    } finally {
      setScanning(false);
      e.target.value = null;
    }
  };

  return (
    <div style={{
      position: "relative", overflow: "hidden", borderRadius: 20,
      background: "linear-gradient(135deg, #0f3d20 0%, #1a6b3a 55%, #22a855 100%)",
      padding: "28px 32px", marginBottom: 24,
      boxShadow: "0 12px 40px rgba(26,107,58,0.22)",
    }}>
      {/* decorative icon */}
      <ScanLine size={110} color="rgba(255,255,255,0.06)" style={{ position: "absolute", right: -10, bottom: -10, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {scanning
            ? <Loader2 size={26} color="white" style={{ animation: "spin 1s linear infinite" }} />
            : <Sparkles size={26} color="#fde047" />}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 4 }}>Smart AI Scanner</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Upload a photo of your paper menu — AI auto-extracts dishes & prices.</p>
        </div>
        <label style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 24px", borderRadius: 14,
          background: "white", color: "#1a6b3a",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
          transition: "transform 0.15s, box-shadow 0.15s",
          flexShrink: 0,
        }}
          onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseOut={e => e.currentTarget.style.transform = "none"}
        >
          <Upload size={16} />
          {scanning ? "Processing…" : "Scan Menu Photo"}
          <input type="file" style={{ display: "none" }} accept="image/*" onChange={handleFileChange} disabled={scanning} />
        </label>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   Menu Item Card
══════════════════════════════════════ */
function MenuItemCard({ item, categories, onEdit, onToggle, onDelete }) {
  const cat = categories.find(c => c.id === item.category_id);
  return (
    <div style={{
      background: item.is_available ? "white" : "#fafaf9",
      borderRadius: 18,
      border: `1.5px solid ${item.is_available ? "#dceee3" : "#ece8e3"}`,
      padding: "16px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      opacity: item.is_available ? 1 : 0.65,
      transition: "box-shadow 0.18s, transform 0.18s",
    }}
      onMouseOver={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseOut={e => { e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Thumbnail */}
        <div style={{ width: 56, height: 56, borderRadius: 12, background: "#f4faf6", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
          {item.image_url
            ? <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <ImageIcon size={18} color="#9dbeaa" />}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1a2e1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
              {item.description && <p style={{ fontSize: 11, color: "#9dbeaa", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>{item.description}</p>}
            </div>
            {/* Action buttons */}
            <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
              <ActionBtn onClick={() => onEdit(item)} hoverBg="#e6f4ec" hoverColor="#1a6b3a" title="Edit">
                <PenLine size={12} />
              </ActionBtn>
              <ActionBtn onClick={() => onDelete(item)} hoverBg="#fff0f3" hoverColor="#e11d48" title="Delete">
                <Trash2 size={12} />
              </ActionBtn>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#1a6b3a" }}>₹{item.price}</span>
            {cat && (
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 999, background: "#f2f9f4", border: "1.5px solid #cde8d6", color: "#4a7a58" }}>
                {cat.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1.5px solid #edf6f0" }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: item.is_available ? "#1a6b3a" : "#9dbeaa" }}>
          {item.is_available ? "● In Stock" : "○ Out of Stock"}
        </span>
        <button type="button" onClick={() => onToggle(item)} style={{ background: "none", border: "none", cursor: "pointer", color: item.is_available ? "#1a6b3a" : "#cde8d6", transition: "color 0.2s" }}>
          {item.is_available ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
        </button>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, hoverBg, hoverColor, children, title }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseOver={() => setHov(true)}
      onMouseOut={() => setHov(false)}
      style={{
        width: 28, height: 28, borderRadius: 8, border: `1.5px solid ${hov ? "transparent" : "#dceee3"}`,
        background: hov ? hoverBg : "white",
        color: hov ? hoverColor : "#9dbeaa",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

/* ══════════════════════════════════════
   Add / Edit Modal
══════════════════════════════════════ */
function ItemModal({ item, categories, onClose, onSave }) {
  const isEdit = !!item?.id;
  const [form, setForm] = useState({
    name: item?.name || "",
    description: item?.description || "",
    price: item?.price || "",
    category_id: item?.category_id || (categories[0]?.id || ""),
    is_available: item?.is_available ?? true,
    image_url: item?.image_url || "",
  });
  const [saving, setSaving] = useState(false);
  const set = key => e => setForm(f => ({ ...f, [key]: e.target ? e.target.value : e }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) { toast.error("Name and price are required"); return; }
    setSaving(true);
    await onSave({ ...item, ...form, price: parseFloat(form.price) });
    setSaving(false);
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(10,20,12,0.55)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "white", borderRadius: 22, width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", overflow: "hidden" }}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 18px", borderBottom: "1.5px solid #edf6f0", background: "#f4faf6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChefHat size={15} color="white" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{isEdit ? "Update Menu Item" : "Add New Dish"}</h3>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #dceee3", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9dbeaa" }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <ModalField label="Item Name *">
            <input style={modalInput} value={form.name} onChange={set("name")} placeholder="e.g. Paneer Tikka" required />
          </ModalField>

          <ModalField label="Description">
            <textarea style={{ ...modalInput, resize: "none", height: 72 }} value={form.description} onChange={set("description")} placeholder="Short description…" />
          </ModalField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <ModalField label="Price (₹) *">
              <input style={modalInput} type="number" value={form.price} onChange={set("price")} placeholder="0" required />
            </ModalField>
            <ModalField label="Category">
              <select style={modalInput} value={form.category_id} onChange={set("category_id")}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </ModalField>
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1.5px solid #dceee3", background: "white", fontSize: 13, fontWeight: 700, color: "#6aad7a", cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: "13px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#1a6b3a,#22a855)",
              fontSize: 13, fontWeight: 700, color: "white", cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              boxShadow: "0 4px 14px rgba(26,107,58,0.25)",
            }}>
              {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
              {isEdit ? "Update Dish" : "Add to Menu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const modalInput = {
  width: "100%", padding: "10px 13px", fontSize: 13, fontFamily: "'Inter', sans-serif",
  fontWeight: 500, color: "#1a2e1f", background: "#f4faf6",
  border: "1.5px solid #cde8d6", borderRadius: 10, outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

function ModalField({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#4a7a58", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════
   Main Page
══════════════════════════════════════ */
export default function EditMenuPage() {
  const router = useRouter();
  const [restaurant,    setRestaurant]   = useState(null);
  const [items,         setItems]        = useState([]);
  const [categories,    setCategories]   = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [search,        setSearch]       = useState("");
  const [filterCat,     setFilterCat]    = useState("all");
  const [modal,         setModal]        = useState(null);
  const [newCatName,    setNewCatName]   = useState("");
  const [addingCat,     setAddingCat]    = useState(false);
  const [showCatInput,  setShowCatInput] = useState(false);

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
    } catch {
      toast.error("Update failed");
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from your menu?`)) return;
    try {
      await deleteMenuItem(restaurantId, item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success("Dish removed");
    } catch {
      toast.error("Could not delete dish");
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await createCategory(restaurantId, { name: newCatName });
      setCategories(prev => [...prev, res.data]);
      setNewCatName("");
      setShowCatInput(false);
      toast.success("Category created");
    } catch {
      toast.error("Failed to add category");
    } finally {
      setAddingCat(false);
    }
  };

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || item.category_id === filterCat;
    return matchSearch && matchCat;
  });

  /* ── Loader ── */
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
          .search-input:focus { border-color: #1a6b3a !important; box-shadow: 0 0 0 3px rgba(26,107,58,0.1) !important; outline: none; }
          .cat-select:focus { border-color: #1a6b3a !important; box-shadow: 0 0 0 3px rgba(26,107,58,0.1) !important; outline: none; }
          .modal-input-focus:focus { border-color: #1a6b3a; box-shadow: 0 0 0 3px rgba(26,107,58,0.1); }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #b8d8c4; border-radius: 4px; }
        `}</style>
      </Head>

      <RestaurantLayout restaurant={restaurant} onLogout={() => { localStorage.clear(); router.push("/restaurant/login"); }}>
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 32px 60px" }}>

          {/* ── Page Header ── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28, paddingBottom: 22, borderBottom: "1.5px solid #dceee3", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChefHat size={18} color="white" />
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Manage Menu</h1>
              </div>
              <p style={{ fontSize: 13, color: "#6aad7a", fontWeight: 500, marginLeft: 48 }}>
                {items.length} dish{items.length !== 1 ? "es" : ""} in your menu
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {/* Add Category */}
              {showCatInput ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddCategory()}
                    placeholder="Category name…"
                    style={{ padding: "10px 14px", borderRadius: 12, border: "1.5px solid #cde8d6", background: "white", fontSize: 13, fontWeight: 500, color: "#1a2e1f", outline: "none", width: 160 }}
                  />
                  <button onClick={handleAddCategory} disabled={addingCat} style={{ padding: "10px 16px", borderRadius: 12, background: "#f2f9f4", border: "1.5px solid #cde8d6", color: "#1a6b3a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {addingCat ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Add"}
                  </button>
                  <button onClick={() => setShowCatInput(false)} style={{ padding: "10px 12px", borderRadius: 12, border: "1.5px solid #dceee3", background: "white", color: "#9dbeaa", cursor: "pointer" }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowCatInput(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 18px", borderRadius: 12, border: "1.5px solid #cde8d6", background: "white", color: "#1a6b3a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  <Tag size={15} /> New Category
                </button>
              )}

              <button onClick={() => setModal({})} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "11px 20px", borderRadius: 12,
                background: "linear-gradient(135deg,#1a6b3a,#22a855)",
                color: "white", fontSize: 13, fontWeight: 700,
                border: "none", cursor: "pointer",
                boxShadow: "0 4px 16px rgba(26,107,58,0.25)",
              }}>
                <Plus size={16} /> Add Dish
              </button>
            </div>
          </div>

          {/* ── AI Scanner ── */}
          <MenuScanner restaurantId={restaurantId} onScanComplete={() => fetchData(restaurantId)} />

          {/* ── Search + Filter ── */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={15} color="#9dbeaa" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                className="search-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Find a dish…"
                style={{ width: "100%", paddingLeft: 42, paddingRight: 16, paddingTop: 11, paddingBottom: 11, fontSize: 13, fontWeight: 500, color: "#1a2e1f", background: "white", border: "1.5px solid #dceee3", borderRadius: 12, transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: "'Inter', sans-serif" }}
              />
            </div>
            <select
              className="cat-select"
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#4a7a58", background: "white", border: "1.5px solid #dceee3", borderRadius: 12, cursor: "pointer", transition: "border-color 0.15s", fontFamily: "'Inter', sans-serif" }}
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* ── Category pills ── */}
          {categories.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              <button
                onClick={() => setFilterCat("all")}
                style={{ padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1.5px solid ${filterCat === "all" ? "#1a6b3a" : "#dceee3"}`, background: filterCat === "all" ? "#e6f4ec" : "white", color: filterCat === "all" ? "#1a6b3a" : "#6aad7a", transition: "all 0.15s" }}
              >
                All ({items.length})
              </button>
              {categories.map(cat => {
                const count = items.filter(i => i.category_id === cat.id).length;
                const active = filterCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCat(cat.id)}
                    style={{ padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1.5px solid ${active ? "#1a6b3a" : "#dceee3"}`, background: active ? "#e6f4ec" : "white", color: active ? "#1a6b3a" : "#6aad7a", transition: "all 0.15s" }}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Grid / Empty state ── */}
          {filtered.length === 0 ? (
            <div style={{ background: "white", border: "1.5px dashed #cde8d6", borderRadius: 22, padding: "64px 32px", textAlign: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: "#f2f9f4", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <ChefHat size={26} color="#1a6b3a" />
              </div>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 6 }}>No dishes found</p>
              <p style={{ fontSize: 13, color: "#9dbeaa" }}>
                {search ? `No results for "${search}"` : "Add your first dish to get started"}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              {filtered.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  onEdit={setModal}
                  onToggle={handleToggle}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          )}

        </main>
      </RestaurantLayout>

      {modal !== null && (
        <ItemModal
          item={modal.id ? modal : null}
          categories={categories}
          onClose={() => setModal(null)}
          onSave={handleSaveItem}
        />
      )}
    </>
  );
}