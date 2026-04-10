import { useState } from "react";
import { createCategory, updateMenuItem } from "../services/api";
import toast from "react-hot-toast";
import { Plus, Loader2, ToggleLeft, ToggleRight, Tag } from "lucide-react";

export default function MenuCategoryList({ restaurantId, categories, items, onCategoryAdded, onItemToggled }) {
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [togglingItem, setTogglingItem] = useState(null);

  const handleAddCategory = async () => {
    if (!newCat.trim()) return;
    setAddingCat(true);
    try {
      await createCategory(restaurantId, { name: newCat.trim() });
      toast.success(`Category "${newCat}" added`);
      setNewCat("");
      if (onCategoryAdded) onCategoryAdded();
    } catch {
      toast.error("Failed to add category");
    } finally {
      setAddingCat(false);
    }
  };

  const handleToggle = async (item) => {
    setTogglingItem(item.id);
    try {
      await updateMenuItem(restaurantId, item.id, { is_available: !item.is_available });
      if (onItemToggled) onItemToggled();
    } catch {
      toast.error("Failed to update item");
    } finally {
      setTogglingItem(null);
    }
  };

  const uncategorized = items.filter((i) => !i.category_id);

  return (
    <div className="space-y-5">
      {/* Add category */}
      <div className="flex gap-2">
        <input
          className="input-field"
          placeholder="New category (e.g. Starters, Main Course)"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
        />
        <button
          type="button"
          disabled={addingCat || !newCat.trim()}
          onClick={handleAddCategory}
          className="btn-secondary flex items-center gap-1 whitespace-nowrap"
        >
          {addingCat ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </div>

      {/* Categories + items */}
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category_id === cat.id);
        return (
          <div key={cat.id} className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 flex items-center gap-2">
              <Tag size={14} className="text-brand-500" />
              <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
              <span className="ml-auto text-xs text-gray-400">{catItems.length} items</span>
            </div>
            {catItems.length === 0 && (
              <p className="text-xs text-gray-400 px-4 py-3">No items in this category yet.</p>
            )}
            {catItems.map((item) => (
              <ItemRow key={item.id} item={item} toggling={togglingItem === item.id} onToggle={handleToggle} />
            ))}
          </div>
        );
      })}

      {/* Uncategorized */}
      {uncategorized.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-500">Uncategorized</span>
            <span className="ml-auto text-xs text-gray-400">{uncategorized.length} items</span>
          </div>
          {uncategorized.map((item) => (
            <ItemRow key={item.id} item={item} toggling={togglingItem === item.id} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {categories.length === 0 && items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No categories or items yet. Add a category above or add items below.</p>
      )}
    </div>
  );
}

function ItemRow({ item, toggling, onToggle }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 hover:bg-gray-50 transition">
      <div>
        <p className={`text-sm font-medium ${item.is_available ? "text-gray-800" : "text-gray-400 line-through"}`}>
          {item.name}
        </p>
        {item.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{item.description}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-brand-600">₹{item.price}</span>
        <button
          type="button"
          onClick={() => onToggle(item)}
          className="text-gray-400 hover:text-brand-500 transition"
          title={item.is_available ? "Mark unavailable" : "Mark available"}
        >
          {toggling ? (
            <Loader2 size={18} className="animate-spin" />
          ) : item.is_available ? (
            <ToggleRight size={22} className="text-brand-500" />
          ) : (
            <ToggleLeft size={22} />
          )}
        </button>
      </div>
    </div>
  );
}
