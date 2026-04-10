import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  getCategories,
  getMenuItems,
  createMenuItem,
  createCategory,
  updateMenuItem,
  uploadMenuImage, // Updated to match our API service
} from "../../../services/api";
import {
  UtensilsCrossed,
  ArrowLeft,
  Plus,
  Sparkles,
  UploadCloud,
  Loader2,
  Tag,
  ToggleLeft,
  ToggleRight,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  PenLine,
  BookOpen,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Main Onboarding Menu Page
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingMenuPage() {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState(null);

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [activePanel, setActivePanel] = useState(null); // "manual" | "scan" | null

  useEffect(() => {
    const id = localStorage.getItem("restaurant_id");
    const token = localStorage.getItem("token");
    if (!token || !id) {
      router.replace("/restaurant/login");
      return;
    }
    setRestaurantId(id);
  }, [router]);

  const loadMenu = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const [catRes, itemRes] = await Promise.all([
        getCategories(restaurantId),
        getMenuItems(restaurantId),
      ]);
      setCategories(catRes.data);
      setItems(itemRes.data);
    } catch (err) {
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadMenu();
  }, [restaurantId, loadMenu]);

  // filter logic
  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedItems = categories.reduce((acc, cat) => {
    acc[cat.id] = {
      cat,
      items: filteredItems.filter((i) => i.category_id === cat.id),
    };
    return acc;
  }, {});
  const uncategorized = filteredItems.filter((i) => !i.category_id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/restaurant/dashboard"
              className="text-gray-400 hover:text-gray-700 transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
              <UtensilsCrossed className="text-white" size={16} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">
                Menu Manager
              </p>
              <p className="text-xs text-gray-400">
                {items.length} items · {categories.length} categories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePanel(activePanel === "scan" ? null : "scan")}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm
                ${
                  activePanel === "scan"
                    ? "bg-orange-600 text-white"
                    : "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"
                }`}
            >
              <Sparkles size={15} />
              <span className="hidden sm:inline">AI Scan</span>
            </button>
            <button
              onClick={() =>
                setActivePanel(activePanel === "manual" ? null : "manual")
              }
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm
                ${
                  activePanel === "manual"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add Item</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div
          className={`grid gap-6 transition-all ${
            activePanel ? "grid-cols-1 lg:grid-cols-5" : "grid-cols-1"
          }`}
        >
          {/* ── LEFT: Menu list ──────────────────────────────────────── */}
          <div className={activePanel ? "lg:col-span-3" : "col-span-1"}>
            <div className="relative mb-4">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-300 outline-none transition-all"
                placeholder="Search items…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-orange-400" size={28} />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                onScan={() => setActivePanel("scan")}
                onManual={() => setActivePanel("manual")}
              />
            ) : (
              <div className="space-y-4">
                {categories.map((cat) => (
                  <CategoryBlock
                    key={cat.id}
                    category={cat}
                    items={groupedItems[cat.id]?.items || []}
                    restaurantId={restaurantId}
                    onRefresh={loadMenu}
                  />
                ))}
                {uncategorized.length > 0 && (
                  <CategoryBlock
                    category={{ id: "__none__", name: "Uncategorized" }}
                    items={uncategorized}
                    restaurantId={restaurantId}
                    onRefresh={loadMenu}
                  />
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Side Panels ─────────────────────────────────────────── */}
          {activePanel && (
            <div className="lg:col-span-2">
              <div className="sticky top-24 space-y-4">
                {activePanel === "manual" && (
                  <ManualAddPanel
                    restaurantId={restaurantId}
                    categories={categories}
                    onAdded={loadMenu}
                    onClose={() => setActivePanel(null)}
                  />
                )}
                {activePanel === "scan" && (
                  <AIScanPanel
                    restaurantId={restaurantId}
                    onScanned={loadMenu}
                    onClose={() => setActivePanel(null)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CategoryBlock Component
// ─────────────────────────────────────────────────────────────────────────────

function CategoryBlock({ category, items, restaurantId, onRefresh }) {
  const [open, setOpen] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  const handleToggle = async (item) => {
    setTogglingId(item.id);
    try {
      await updateMenuItem(restaurantId, item.id, {
        is_available: !item.is_available,
      });
      onRefresh();
    } catch {
      toast.error("Update failed");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left"
      >
        <span className="flex items-center gap-2">
          <Tag size={14} className="text-orange-500" />
          <span className="text-sm font-bold text-gray-800">{category.name}</span>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
            {items.length}
          </span>
        </span>
        {open ? (
          <ChevronUp size={15} className="text-gray-400" />
        ) : (
          <ChevronDown size={15} className="text-gray-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-gray-50">
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-3 italic">
              No items in this category.
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        item.is_available ? "text-gray-800" : "text-gray-400 line-through"
                      }`}
                    >
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-gray-400 truncate max-w-xs">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-sm font-bold text-orange-600">
                      ₹{item.price}
                    </span>
                    <button
                      onClick={() => handleToggle(item)}
                      className="text-gray-300 hover:text-orange-500 transition"
                    >
                      {togglingId === item.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : item.is_available ? (
                        <ToggleRight size={24} className="text-orange-500" />
                      ) : (
                        <ToggleLeft size={24} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ManualAddPanel Component
// ─────────────────────────────────────────────────────────────────────────────

function ManualAddPanel({ restaurantId, categories, onAdded, onClose }) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    category_id: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price) {
      toast.error("Name and Price are required");
      return;
    }
    setSaving(true);
    try {
      await createMenuItem(restaurantId, {
        ...form,
        price: parseFloat(form.price),
        is_available: true,
      });
      toast.success("Dish added!");
      setForm({
        name: "",
        price: "",
        description: "",
        category_id: form.category_id,
      });
      onAdded();
    } catch {
      toast.error("Failed to add dish");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-right-5">
      <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50/50">
        <span className="font-bold text-gray-800 flex items-center gap-2">
          <PenLine size={16} /> Add Item Manually
        </span>
        <button onClick={onClose} className="hover:rotate-90 transition-transform">
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
            Dish Name
          </label>
          <input
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 transition"
            placeholder="e.g. Paneer Tikka"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
            Price ₹
          </label>
          <input
            type="number"
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 transition"
            placeholder="299"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
            Category
          </label>
          <select
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 transition"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 transition resize-none"
          rows={3}
          placeholder="Description (Optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition shadow-lg shadow-orange-100 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Save to Menu
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AIScanPanel Component
// ─────────────────────────────────────────────────────────────────────────────

function AIScanPanel({ restaurantId, onScanned, onClose }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleScan = async () => {
    if (!file) {
      toast.error("Please select a menu photo");
      return;
    }
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file); // Fixed: Backend expects single "file"

    try {
      const res = await uploadMenuImage(restaurantId, formData);
      setResult(res.data);
      if (res.data.total_items_saved > 0) {
        toast.success(`Success! Saved ${res.data.total_items_saved} items.`);
        onScanned(); // This refreshes the main list
      } else {
        toast("No new items found.", { icon: "ℹ️" });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "AI Scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-right-5">
      <div className="px-5 py-4 border-b flex justify-between items-center bg-orange-50/50">
        <span className="font-bold text-orange-800 flex items-center gap-2">
          <Sparkles size={16} /> AI Menu Scanner
        </span>
        <button onClick={onClose}>
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer 
            ${file ? "border-green-400 bg-green-50/30" : "border-orange-200 hover:bg-orange-50"}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
          {loading ? (
            <Sparkles className="animate-pulse mx-auto text-orange-500" size={40} />
          ) : file ? (
            <CheckCircle2 className="mx-auto text-green-500" size={40} />
          ) : (
            <UploadCloud className="mx-auto text-orange-300" size={40} />
          )}

          <p className="mt-3 text-sm font-bold text-gray-700">
            {loading ? "AI is reading menu..." : file ? file.name : "Upload Menu Photo"}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            JPG, PNG or WebP (Max 10MB)
          </p>
        </div>

        <button
          onClick={handleScan}
          disabled={loading || !file}
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Sparkles size={18} />
          )}
          {loading ? "Processing..." : "Start AI Scan"}
        </button>

        {result && (
          <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
              Scan Summary
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400">New Items</p>
                <p className="font-bold text-orange-600">{result.total_items_saved}</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400">Categories</p>
                <p className="font-bold text-gray-700">{result.total_categories_created}</p>
              </div>
            </div>
            <button 
              onClick={() => { setFile(null); setResult(null); }}
              className="w-full mt-3 text-[10px] font-bold text-gray-400 hover:text-orange-500 transition uppercase tracking-wider"
            >
              Scan Another Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState Component
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ onScan, onManual }) {
  return (
    <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-3xl">
      <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <BookOpen size={40} className="text-orange-200" />
      </div>
      <h3 className="text-xl font-bold text-gray-800">Your Menu is Empty</h3>
      <p className="text-gray-400 text-sm mt-2 mb-8 max-w-xs mx-auto">
        Start building your digital menu by scanning a photo or adding items manually.
      </p>
      <div className="flex justify-center gap-4">
        <button
          onClick={onScan}
          className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition shadow-lg shadow-orange-100"
        >
          <Sparkles size={18} /> AI Scan
        </button>
        <button
          onClick={onManual}
          className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition"
        >
          <Plus size={18} /> Manual
        </button>
      </div>
    </div>
  );
}