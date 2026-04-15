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
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .cat-input {
          font-family: 'Inter', sans-serif; font-size: 13px; color: #111827;
          flex: 1; padding: 11px 14px;
          background: #f8fbf9; border: 1.5px solid #dceee3; border-radius: 12px;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cat-input:focus { border-color: #1a6b3a; box-shadow: 0 0 0 3px rgba(26,107,58,0.1); }
        .cat-input::placeholder { color: #b8d8c4; }

        .cat-add-btn {
          font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 700;
          color: white; background: #1a6b3a; border: none; cursor: pointer;
          padding: 11px 20px; border-radius: 12px; white-space: nowrap;
          display: flex; align-items: center; gap: 6px;
          transition: opacity 0.15s, transform 0.1s;
        }
        .cat-add-btn:hover { opacity: 0.9; }
        .cat-add-btn:active { transform: scale(0.97); }
        .cat-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .item-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; border-top: 1.5px solid #edf6f0;
          transition: background 0.15s;
        }
        .item-row:hover { background: #f8fbf9; }

        .toggle-btn {
          background: none; border: none; cursor: pointer; padding: 0;
          display: flex; align-items: center;
          transition: opacity 0.15s;
        }
        .toggle-btn:hover { opacity: 0.75; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "'Inter', sans-serif" }}>

        {/* ── Add Category ── */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="cat-input"
            placeholder="New category (e.g. Starters, Main Course)"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
          />
          <button
            type="button"
            disabled={addingCat || !newCat.trim()}
            onClick={handleAddCategory}
            className="cat-add-btn"
          >
            {addingCat
              ? <Loader2 size={14} color="white" style={{ animation: "spin 1s linear infinite" }} />
              : <Plus size={14} color="white" />}
            Add
          </button>
        </div>

        {/* ── Category Blocks ── */}
        {categories.map((cat) => {
          const catItems = items.filter((i) => i.category_id === cat.id);
          return (
            <div key={cat.id} style={{
              background: "white", borderRadius: 18,
              border: "1.5px solid #dceee3",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              overflow: "hidden",
            }}>
              {/* Category header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "12px 16px",
                background: "#f4faf6", borderBottom: "1.5px solid #dceee3",
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: "#e6f4ec", border: "1.5px solid #cde8d6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Tag size={13} color="#1a6b3a" />
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2e1f", flex: 1 }}>
                  {cat.name}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#6aad7a",
                  background: "#e6f4ec", padding: "3px 10px",
                  borderRadius: 999, border: "1.5px solid #cde8d6",
                }}>
                  {catItems.length} {catItems.length === 1 ? "item" : "items"}
                </span>
              </div>

              {catItems.length === 0 && (
                <p style={{ fontSize: 12, color: "#b8d8c4", padding: "14px 16px", fontStyle: "italic" }}>
                  No items in this category yet.
                </p>
              )}

              {catItems.map((item) => (
                <ItemRow key={item.id} item={item} toggling={togglingItem === item.id} onToggle={handleToggle} />
              ))}
            </div>
          );
        })}

        {/* ── Uncategorized ── */}
        {uncategorized.length > 0 && (
          <div style={{
            background: "white", borderRadius: 18,
            border: "1.5px solid #dceee3",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "12px 16px",
              background: "#fafaf9", borderBottom: "1.5px solid #edf6f0",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#9dbeaa", flex: 1 }}>
                Uncategorized
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#9dbeaa",
                background: "#f2f9f4", padding: "3px 10px",
                borderRadius: 999, border: "1.5px solid #dceee3",
              }}>
                {uncategorized.length} {uncategorized.length === 1 ? "item" : "items"}
              </span>
            </div>
            {uncategorized.map((item) => (
              <ItemRow key={item.id} item={item} toggling={togglingItem === item.id} onToggle={handleToggle} />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {categories.length === 0 && items.length === 0 && (
          <div style={{
            textAlign: "center", padding: "32px 20px",
            background: "white", borderRadius: 18,
            border: "1.5px dashed #cde8d6",
          }}>
            <p style={{ fontSize: 13, color: "#9dbeaa", fontWeight: 500 }}>
              No categories or items yet. Add a category above or add items below.
            </p>
          </div>
        )}

      </div>
    </>
  );
}

function ItemRow({ item, toggling, onToggle }) {
  return (
    <div className="item-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 700,
          color: item.is_available ? "#111827" : "#9dbeaa",
          textDecoration: item.is_available ? "none" : "line-through",
          marginBottom: item.description ? 3 : 0,
        }}>
          {item.name}
        </p>
        {item.description && (
          <p style={{
            fontSize: 11, color: "#9dbeaa", fontStyle: "italic",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300,
          }}>
            {item.description}
          </p>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#1a2e1f" }}>
          ₹{item.price}
        </span>
        <button
          type="button"
          className="toggle-btn"
          onClick={() => onToggle(item)}
          title={item.is_available ? "Mark unavailable" : "Mark available"}
        >
          {toggling ? (
            <Loader2 size={18} color="#9dbeaa" style={{ animation: "spin 1s linear infinite" }} />
          ) : item.is_available ? (
            <ToggleRight size={26} color="#1a6b3a" />
          ) : (
            <ToggleLeft size={26} color="#b8d8c4" />
          )}
        </button>
      </div>
    </div>
  );
}