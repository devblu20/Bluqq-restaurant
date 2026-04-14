import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import OnboardingLayout from "@/components/OnboardingLayout";
import {
  getCategories,
  getMenuItems,
  createMenuItem,
  createCategory,
  updateMenuItem,
  uploadMenuImage,
} from "@/services/api";
import {
  Loader2, Plus, Sparkles, UploadCloud, Search,
  X, ToggleLeft, ToggleRight, UtensilsCrossed,
} from "lucide-react";

export default function MenuPage() {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState(null);
  const [activeTab, setActiveTab] = useState("scan");
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", price: "", description: "", category_id: "" });
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("restaurant_id");
    if (!id) { router.replace("/restaurant/login"); return; }
    setRestaurantId(id);
  }, [router]);

  const loadMenuData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const [catRes, itemRes] = await Promise.all([
        getCategories(restaurantId),
        getMenuItems(restaurantId),
      ]);
      setCategories(catRes.data || []);
      setItems(itemRes.data || []);
    } catch {
      toast.error("Failed to load menu data");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { if (restaurantId) loadMenuData(); }, [restaurantId, loadMenuData]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    const formData = new FormData();
    formData.append("file", file);
    const toastId = toast.loading("AI is scanning your menu...");
    try {
      const res = await uploadMenuImage(restaurantId, formData);
      toast.success(`Success! Added ${res.data.total_items_saved} items.`, { id: toastId });
      await loadMenuData();
      setActiveTab("manual");
    } catch {
      toast.error("Scan failed. Use a clear photo.", { id: toastId });
    } finally {
      setScanning(false);
      e.target.value = null;
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const { data } = await createCategory(restaurantId, { name: newCatName });
      setCategories((prev) => [...prev, data]);
      setNewCatName("");
      toast.success("Category created");
    } catch {
      toast.error("Failed to add category");
    } finally {
      setAddingCat(false);
    }
  };

  const handleAddItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price) {
      toast.error("Name and price required");
      return;
    }
    setSavingItem(true);
    try {
      const { data } = await createMenuItem(restaurantId, {
        ...itemForm,
        price: parseFloat(itemForm.price),
        is_available: true,
      });
      setItems((prev) => [...prev, data]);
      setItemForm({ name: "", price: "", description: "", category_id: "" });
      setShowItemForm(false);
      toast.success("Dish added!");
    } catch {
      toast.error("Failed to add item");
    } finally {
      setSavingItem(false);
    }
  };

  const toggleAvailability = async (item) => {
    try {
      await updateMenuItem(restaurantId, item.id, { is_available: !item.is_available });
      setItems((prev) =>
        prev.map((i) => i.id === item.id ? { ...i, is_available: !i.is_available } : i)
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );
  const grouped = categories.reduce((acc, cat) => {
    acc[cat.name] = filteredItems.filter((i) => i.category_id === cat.id);
    return acc;
  }, {});
  const uncategorized = filteredItems.filter((i) => !i.category_id);

  // ── Loading state ──
  if (loading && !items.length) return (
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
        <title>Menu Setup | Menuify</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #eef5f0; font-family: 'Inter', sans-serif; }
          @keyframes spin  { to { transform: rotate(360deg); } }

          .tab-btn { cursor: pointer; border: none; font-family: 'Inter', sans-serif; transition: background 0.15s, color 0.15s; }
          .tab-btn:hover { opacity: 0.85; }

          .upload-zone { transition: background 0.18s; cursor: pointer; }
          .upload-zone:hover { background: #f0faf3 !important; }

          .input-field { font-family: 'Inter', sans-serif; font-size: 14px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
          .input-field:focus { border-color: #1a6b3a !important; box-shadow: 0 0 0 3px rgba(26,107,58,0.1); }

          .action-btn { font-family: 'Inter', sans-serif; cursor: pointer; border: none; transition: background 0.15s, transform 0.1s; }
          .action-btn:hover { opacity: 0.9; }
          .action-btn:active { transform: scale(0.97); }

          .item-row { transition: border-color 0.15s, box-shadow 0.15s; }
          .item-row:hover { border-color: #cde8d6 !important; box-shadow: 0 2px 10px rgba(26,107,58,0.07); }

          .toggle-btn { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; }

          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #b8d8c4; border-radius: 4px; }
        `}</style>
      </Head>

      <OnboardingLayout currentStep="menu" title="Setup Menu">
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px 120px", fontFamily: "'Inter', sans-serif" }}>

          {/* ── Header Card ── */}
          <div style={{
            background: "white", borderRadius: 22, padding: "24px 28px",
            border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
            marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
          }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", marginBottom: 4 }}>
                Your Menu
              </h1>
              <p style={{ fontSize: 13, color: "#9dbeaa", fontWeight: 500 }}>
                Add dishes to start taking orders
              </p>
            </div>

            {/* Tab switcher */}
            <div style={{ display: "flex", background: "#f2f9f4", padding: 5, borderRadius: 14, border: "1.5px solid #dceee3", gap: 4 }}>
              {[
                { key: "scan",   icon: Sparkles, label: "AI Scan" },
                { key: "manual", icon: Plus,      label: `Manual (${items.length})` },
              ].map(({ key, icon: Icon, label }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className="tab-btn"
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                      background: active ? "#1a6b3a" : "transparent",
                      color: active ? "white" : "#6aad7a",
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── AI Scan Tab ── */}
          {activeTab === "scan" && (
            <div style={{ background: "white", borderRadius: 22, border: "2px dashed #cde8d6", padding: "60px 40px", textAlign: "center" }}
              className="upload-zone">
              <input type="file" accept="image/*" onChange={handleFileUpload} disabled={scanning} id="file-upload" style={{ display: "none" }} />
              <label htmlFor="file-upload" style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 22,
                  background: "#f2f9f4", border: "1.5px solid #cde8d6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 22,
                }}>
                  {scanning
                    ? <Loader2 size={36} color="#1a6b3a" style={{ animation: "spin 1s linear infinite" }} />
                    : <UploadCloud size={36} color="#1a6b3a" />}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.01em", marginBottom: 10 }}>
                  {scanning ? "AI is reading your menu..." : "Upload Menu Photo"}
                </h3>
                <p style={{ fontSize: 13, color: "#9dbeaa", maxWidth: 300, lineHeight: 1.6 }}>
                  Snap a photo of your printed menu. We'll automatically extract names and prices.
                </p>
              </label>
            </div>
          )}

          {/* ── Manual Tab ── */}
          {activeTab === "manual" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Search + New Category */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Search */}
                <div style={{ position: "relative" }}>
                  <Search size={16} color="#9dbeaa" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input
                    className="input-field"
                    placeholder="Search dishes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: "100%", paddingLeft: 40, paddingRight: 14,
                      paddingTop: 12, paddingBottom: 12,
                      background: "white", border: "1.5px solid #dceee3",
                      borderRadius: 14, color: "#111827",
                    }}
                  />
                </div>

                {/* New Category */}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input-field"
                    placeholder="New category name..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                    style={{
                      flex: 1, padding: "12px 14px",
                      background: "white", border: "1.5px solid #dceee3",
                      borderRadius: 14, color: "#111827",
                    }}
                  />
                  <button
                    onClick={handleAddCategory}
                    disabled={addingCat}
                    className="action-btn"
                    style={{
                      padding: "12px 20px", borderRadius: 14, fontSize: 13,
                      fontWeight: 700, background: "#1a6b3a", color: "white",
                      opacity: addingCat ? 0.6 : 1,
                    }}
                  >
                    {addingCat ? "..." : "Add"}
                  </button>
                </div>
              </div>

              {/* Add Item Button / Form */}
              {!showItemForm ? (
                <button
                  onClick={() => setShowItemForm(true)}
                  className="action-btn"
                  style={{
                    width: "100%", padding: "15px", borderRadius: 16,
                    background: "#1a6b3a", color: "white", fontSize: 14, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 16px rgba(26,107,58,0.2)",
                  }}
                >
                  <Plus size={18} /> Add New Dish
                </button>
              ) : (
                <div style={{
                  background: "white", borderRadius: 22, padding: "24px 26px",
                  border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Dish Details</h3>
                    <button onClick={() => setShowItemForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9dbeaa", display: "flex" }}>
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <input
                      className="input-field"
                      placeholder="Dish Name *"
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                      style={{ padding: "12px 14px", background: "#f8fbf9", border: "1.5px solid #dceee3", borderRadius: 12, color: "#111827" }}
                    />
                    <input
                      className="input-field"
                      type="number"
                      placeholder="Price (₹) *"
                      value={itemForm.price}
                      onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                      style={{ padding: "12px 14px", background: "#f8fbf9", border: "1.5px solid #dceee3", borderRadius: 12, color: "#111827" }}
                    />
                  </div>

                  <select
                    className="input-field"
                    value={itemForm.category_id}
                    onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                    style={{
                      width: "100%", padding: "12px 14px", marginBottom: 18,
                      background: "#f8fbf9", border: "1.5px solid #dceee3",
                      borderRadius: 12, color: "#111827",
                    }}
                  >
                    <option value="">No Category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={handleAddItem}
                      disabled={savingItem}
                      className="action-btn"
                      style={{ flex: 1, padding: "13px", borderRadius: 12, background: "#1a6b3a", color: "white", fontSize: 14, fontWeight: 700, opacity: savingItem ? 0.6 : 1 }}
                    >
                      {savingItem ? "Saving..." : "Save Dish"}
                    </button>
                    <button
                      onClick={() => setShowItemForm(false)}
                      className="action-btn"
                      style={{ flex: 1, padding: "13px", borderRadius: 12, background: "#f2f9f4", color: "#4a7a58", fontSize: 14, fontWeight: 700 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* ── Menu List ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 8 }}>
                {Object.keys(grouped).map((catName) =>
                  grouped[catName].length > 0 && (
                    <div key={catName}>
                      {/* Category header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 4, height: 22, borderRadius: 999, background: "#1a6b3a" }} />
                        <h3 style={{ fontSize: 11, fontWeight: 800, color: "#1a6b3a", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                          {catName}
                        </h3>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "#6aad7a",
                          background: "#e6f4ec", padding: "2px 10px", borderRadius: 999,
                          border: "1.5px solid #cde8d6",
                        }}>
                          {grouped[catName].length}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {grouped[catName].map((item) => (
                          <MenuItemRow key={item.id} item={item} onToggle={() => toggleAvailability(item)} />
                        ))}
                      </div>
                    </div>
                  )
                )}

                {uncategorized.length > 0 && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 4, height: 22, borderRadius: 999, background: "#b8d8c4" }} />
                      <h3 style={{ fontSize: 11, fontWeight: 800, color: "#9dbeaa", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                        Uncategorized
                      </h3>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: "#9dbeaa",
                        background: "#f2f9f4", padding: "2px 10px", borderRadius: 999,
                        border: "1.5px solid #dceee3",
                      }}>
                        {uncategorized.length}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {uncategorized.map((item) => (
                        <MenuItemRow key={item.id} item={item} onToggle={() => toggleAvailability(item)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Nav ── */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20,
          background: "white", borderTop: "1.5px solid #dceee3",
          padding: "14px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.05)",
        }}>
          <button
            onClick={() => router.push("/restaurant/onboarding/operations")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 700, color: "#9dbeaa",
              fontFamily: "'Inter', sans-serif", padding: "10px 18px",
            }}
          >
            ← Back
          </button>
          <button
            onClick={() => {
              if (!items.length) return toast.error("Add at least one item");
              router.push("/restaurant/onboarding/order-settings");
            }}
            className="action-btn"
            style={{
              padding: "12px 36px", borderRadius: 14, fontSize: 14, fontWeight: 700,
              background: "#1a6b3a", color: "white",
              boxShadow: "0 4px 16px rgba(26,107,58,0.2)",
            }}
          >
            Continue →
          </button>
        </div>
      </OnboardingLayout>
    </>
  );
}

// ── Menu Item Row sub-component ──
function MenuItemRow({ item, onToggle }) {
  return (
    <div
      className="item-row"
      style={{
        background: item.is_available ? "white" : "#fafaf9",
        border: "1.5px solid #dceee3",
        borderRadius: 16, padding: "14px 18px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        opacity: item.is_available ? 1 : 0.55,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 700,
          color: item.is_available ? "#111827" : "#9dbeaa",
          textDecoration: item.is_available ? "none" : "line-through",
          marginBottom: item.description ? 3 : 0,
        }}>
          {item.name}
        </p>
        {item.description && (
          <p style={{ fontSize: 11, color: "#9dbeaa", fontStyle: "italic" }}>
            {item.description}
          </p>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#1a2e1f" }}>
          ₹{item.price}
        </span>
        <button className="toggle-btn" onClick={onToggle}>
          {item.is_available
            ? <ToggleRight size={30} color="#1a6b3a" />
            : <ToggleLeft size={30} color="#b8d8c4" />}
        </button>
      </div>
    </div>
  );
}