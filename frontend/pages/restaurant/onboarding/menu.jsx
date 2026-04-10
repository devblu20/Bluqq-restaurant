import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import OnboardingLayout from "@/components/OnboardingLayout";
import { 
  getCategories, 
  getMenuItems, 
  createMenuItem, 
  createCategory, 
  updateMenuItem, 
  uploadMenuImage 
} from "@/services/api";
import { 
  Loader2, Plus, Sparkles, UploadCloud, Search, 
  X, Tag, ToggleLeft, ToggleRight, CheckCircle2
} from "lucide-react";
import styles from "./menu.module.css";

export default function MenuPage() {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState(null);

  const [activeTab, setActiveTab] = useState("scan");
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // States
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", price: "", description: "", category_id: "" });
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("restaurant_id");
    if (!id) {
      router.replace("/restaurant/login");
      return;
    }
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

  useEffect(() => {
    if (restaurantId) loadMenuData();
  }, [restaurantId, loadMenuData]);

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
    } catch (err) {
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
        is_available: true
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
        prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i))
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  // Grouping Logic
  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = categories.reduce((acc, cat) => {
    acc[cat.name] = filteredItems.filter(i => i.category_id === cat.id);
    return acc;
  }, {});
  
  const uncategorized = filteredItems.filter(i => !i.category_id);

  if (loading && !items.length) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-orange-500" size={40} /></div>;

  return (
    <OnboardingLayout currentStep="menu" title="Setup Menu">
      <div className="max-w-4xl mx-auto px-4 pb-20">
        
        {/* Header Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Your Menu</h1>
              <p className="text-gray-500 text-sm">Add dishes to start taking orders</p>
            </div>
            <div className="flex bg-gray-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveTab("scan")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "scan" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500"}`}
              >
                <Sparkles size={16} /> AI Scan
              </button>
              <button 
                onClick={() => setActiveTab("manual")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "manual" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500"}`}
              >
                <Plus size={16} /> Manual ({items.length})
              </button>
            </div>
          </div>
        </div>

        {/* AI Scan Content */}
        {activeTab === "scan" && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white border-2 border-dashed border-orange-200 rounded-[2rem] p-12 text-center hover:bg-orange-50/50 transition-colors relative group">
              <input type="file" accept="image/*" onChange={handleFileUpload} disabled={scanning} id="file-upload" className="hidden" />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-500 mb-6 group-hover:scale-110 transition-transform">
                  {scanning ? <Loader2 className="animate-spin" size={40} /> : <UploadCloud size={40} />}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {scanning ? "AI is reading your menu..." : "Upload Menu Photo"}
                </h3>
                <p className="text-gray-500 max-w-xs mx-auto text-sm">
                  Snap a photo of your printed menu. We'll automatically extract names and prices.
                </p>
              </label>
            </div>
          </div>
        )}

        {/* Manual Content */}
        {activeTab === "manual" && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Search & New Cat */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                <input 
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="Search dishes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <input 
                  className="flex-1 px-4 py-3.5 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="New Category..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <button onClick={handleAddCategory} disabled={addingCat} className="bg-gray-900 text-white px-6 rounded-2xl font-bold hover:bg-black transition-colors">
                  {addingCat ? "..." : "Add"}
                </button>
              </div>
            </div>

            {/* Add Item Form */}
            {!showItemForm ? (
              <button 
                onClick={() => setShowItemForm(true)}
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-100 flex items-center justify-center gap-2 hover:bg-orange-600 transition-all active:scale-95"
              >
                <Plus size={20} /> Add New Dish
              </button>
            ) : (
              <div className="bg-white border-2 border-orange-100 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between mb-6">
                  <h3 className="font-bold text-lg">Dish Details</h3>
                  <button onClick={() => setShowItemForm(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:border-orange-500" placeholder="Dish Name *" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} />
                  <input className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:border-orange-500" type="number" placeholder="Price (₹) *" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} />
                </div>
                <select className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none mb-6" value={itemForm.category_id} onChange={e => setItemForm({...itemForm, category_id: e.target.value})}>
                  <option value="">No Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex gap-3">
                  <button onClick={handleAddItem} disabled={savingItem} className="flex-1 bg-orange-500 text-white py-3.5 rounded-xl font-bold">Save Dish</button>
                  <button onClick={() => setShowItemForm(false)} className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold">Cancel</button>
                </div>
              </div>
            )}

            {/* Menu List */}
            <div className="space-y-8">
              {Object.keys(grouped).map(catName => (
                grouped[catName].length > 0 && (
                  <div key={catName} className="animate-in fade-in duration-500">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-orange-500 w-1.5 h-6 rounded-full" />
                      <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">{catName}</h3>
                      <span className="text-gray-400 text-xs font-bold bg-gray-100 px-2 py-0.5 rounded-lg">{grouped[catName].length}</span>
                    </div>
                    <div className="grid gap-3">
                      {grouped[catName].map(item => (
                        <MenuItemRow key={item.id} item={item} onToggle={() => toggleAvailability(item)} />
                      ))}
                    </div>
                  </div>
                )
              ))}

              {/* Uncategorized Items */}
              {uncategorized.length > 0 && (
                <div className="mt-8">
                   <div className="flex items-center gap-2 mb-4">
                      <div className="bg-gray-400 w-1.5 h-6 rounded-full" />
                      <h3 className="font-bold text-gray-500 uppercase tracking-wider text-sm">Uncategorized</h3>
                    </div>
                    <div className="grid gap-3">
                      {uncategorized.map(item => (
                        <MenuItemRow key={item.id} item={item} onToggle={() => toggleAvailability(item)} />
                      ))}
                    </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center max-w-4xl mx-auto shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-[2rem] z-10">
          <button className="px-6 py-3 font-bold text-gray-500" onClick={() => router.push("/restaurant/onboarding/operations")}>Back</button>
          <button 
            className="bg-orange-500 text-white px-10 py-3 rounded-2xl font-bold hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-100"
            onClick={() => {
              if (!items.length) return toast.error("Add at least one item");
              router.push("/restaurant/onboarding/order-settings");
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}

// Sub-component for Menu Item Row
function MenuItemRow({ item, onToggle }) {
  return (
    <div className={`bg-white border rounded-2xl p-4 flex items-center justify-between transition-all ${!item.is_available ? 'opacity-60 bg-gray-50/50' : 'hover:border-orange-200 hover:shadow-sm'}`}>
      <div className="flex-1">
        <p className={`font-bold text-[15px] ${!item.is_available ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {item.name}
        </p>
        {item.description && <p className="text-xs text-gray-400 mt-0.5 italic">{item.description}</p>}
      </div>
      <div className="flex items-center gap-6">
        <span className="font-bold text-gray-900">₹{item.price}</span>
        <button onClick={onToggle} className="text-gray-300 hover:text-orange-500 transition-colors">
          {item.is_available ? <ToggleRight size={32} className="text-orange-500" /> : <ToggleLeft size={32} />}
        </button>
      </div>
    </div>
  );
}