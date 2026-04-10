import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import RestaurantLayout from "../../../components/OnboardingLayout";
import { 
  getMe, 
  getMenuItems, 
  getCategories, 
  createMenuItem, 
  updateMenuItem, 
  createCategory,
  uploadMenuImage,
  deleteMenuItem // Add this import
} from "../../../services/api";
import {
  Loader2, Plus, PenLine, X, Search,
  ChefHat, ImageIcon, ToggleLeft, ToggleRight,
  Tag, FolderPlus, Save, ArrowLeft, Upload, Sparkles, ScanLine, Trash2
} from "lucide-react";

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all";

/* ── AI Menu Scanner Component ── */
function MenuScanner({ restaurantId, onScanComplete }) {
  const [scanning, setScanning] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setScanning(true);
    const formData = new FormData();
    formData.append("file", file);

    const toastId = toast.loading("AI is reading your menu... Please wait.");

    try {
      await uploadMenuImage(restaurantId, formData);
      toast.success("Menu scanned successfully! Items added.", { id: toastId });
      onScanComplete(); 
    } catch (err) {
      console.error(err);
      toast.error("AI Scan failed. Please try a clearer photo.", { id: toastId });
    } finally {
      setScanning(false);
      e.target.value = null;
    }
  };

  return (
    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 mb-10 shadow-xl shadow-orange-100 relative overflow-hidden group">
      <ScanLine size={120} className="absolute -right-4 -bottom-4 text-white/10 group-hover:rotate-12 transition-transform duration-500" />
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
          {scanning ? <Loader2 className="animate-spin" size={30} /> : <Sparkles size={30} className="animate-pulse" />}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 style={{ fontFamily: "'Syne', sans-serif" }} className="text-xl font-bold text-white">Smart AI Scanner</h3>
          <p className="text-orange-100 text-sm mt-1">Upload a photo of your paper menu. AI will auto-extract dishes & prices.</p>
        </div>
        <label className="cursor-pointer flex items-center gap-3 px-8 py-4 bg-white text-orange-600 font-bold rounded-2xl hover:bg-orange-50 transition-all active:scale-95 shadow-lg group">
          <Upload size={20} className="group-hover:-translate-y-1 transition-transform" />
          {scanning ? "Processing..." : "Scan Menu Photo"}
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={scanning} />
        </label>
      </div>
    </div>
  );
}

/* ── Item card ── */
function MenuItemCard({ item, categories, onEdit, onToggle, onDelete }) {
  const cat = categories.find(c => c.id === item.category_id);
  return (
    <div className={`bg-white border rounded-2xl p-4 transition-all hover:shadow-md ${item.is_available ? "border-gray-100 shadow-sm" : "border-gray-100 opacity-60 bg-gray-50/30"}`}>
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
          {item.image_url
            ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            : <ImageIcon size={18} className="text-gray-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
              {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 italic">{item.description}</p>}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => onEdit(item)}
                className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-blue-50 flex items-center justify-center transition-colors group">
                <PenLine size={12} className="text-gray-400 group-hover:text-blue-500" />
              </button>
              {/* DELETE ICON ADDED HERE */}
              <button onClick={() => onDelete(item)}
                className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center transition-colors group">
                <Trash2 size={12} className="text-gray-400 group-hover:text-red-500" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm font-bold text-orange-500">₹{item.price}</span>
            {cat && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200 font-bold">{cat.name}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className={`text-[10px] font-bold uppercase ${item.is_available ? "text-green-500" : "text-gray-400"}`}>
          {item.is_available ? "In Stock" : "Out of Stock"}
        </span>
        <button type="button" onClick={() => onToggle(item)}
          className={`transition-all duration-300 ${item.is_available ? "text-orange-500" : "text-gray-300"}`}>
          {item.is_available ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
        </button>
      </div>
    </div>
  );
}

/* ── Add/Edit modal ── */
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

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target ? e.target.value : e }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) { toast.error("Name and price are required"); return; }
    setSaving(true);
    await onSave({ ...item, ...form, price: parseFloat(form.price) });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-900 text-lg">{isEdit ? "Update Menu Item" : "Add New Dish"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-400 transition-all"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="text-[10px] font-bold uppercase text-gray-500 mb-1.5 block">Item name *</label><input className={inputCls} value={form.name} onChange={set("name")} required /></div>
          <div><label className="text-[10px] font-bold uppercase text-gray-500 mb-1.5 block">Description</label><textarea className={inputCls + " resize-none h-20"} value={form.description} onChange={set("description")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-bold uppercase text-gray-500 mb-1.5 block">Price (₹) *</label><input className={inputCls} type="number" value={form.price} onChange={set("price")} required /></div>
            <div><label className="text-[10px] font-bold uppercase text-gray-500 mb-1.5 block">Category</label><select className={inputCls} value={form.category_id} onChange={set("category_id")}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-orange-500 text-white shadow-lg flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {isEdit ? "Update Dish" : "Add to Menu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main page ── */
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
    } catch (err) {
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
    } catch (err) {
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

  // DELETE HANDLER
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

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={32} /></div>;

  return (
    <>
      <Head><title>Menu Management | Dashboard</title></Head>
      <RestaurantLayout restaurant={restaurant} onLogout={() => {localStorage.clear(); router.push("/restaurant/login")}}>
        <main className="max-w-4xl mx-auto px-7 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b">
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-3xl font-bold text-gray-900 leading-tight">Manage Menu</h1>
              <p className="text-sm text-gray-500">{items.length} dishes in your menu</p>
            </div>
            <button onClick={() => setModal({})} className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-bold rounded-2xl shadow-lg hover:bg-orange-600 transition-all active:scale-95"><Plus size={20} /> Add Manually</button>
          </div>

          <MenuScanner restaurantId={restaurantId} onScanComplete={() => fetchData(restaurantId)} />

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-300 outline-none" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a dish..." />
            </div>
            <select className="px-4 py-3 text-sm bg-white border border-gray-100 rounded-2xl text-gray-600 font-medium cursor-pointer" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-16 text-center">
              <ChefHat size={40} className="text-orange-400 mx-auto mb-4" />
              <h3 className="font-bold text-gray-800 text-xl">No dishes found</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filtered.map(item => (
                <MenuItemCard key={item.id} item={item} categories={categories}
                  onEdit={setModal} onToggle={handleToggle} onDelete={handleDeleteItem} />
              ))}
            </div>
          )}
        </main>
        {modal !== null && <ItemModal item={modal.id ? modal : null} categories={categories} onClose={() => setModal(null)} onSave={handleSaveItem} />}
      </RestaurantLayout>
    </>
  );
}