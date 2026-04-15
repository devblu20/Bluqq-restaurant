import { useState } from "react";
import { useForm } from "react-hook-form";
import { createMenuItem } from "../services/api";
import toast from "react-hot-toast";
import { Plus, Loader2 } from "lucide-react";

const inputStyle = {
  width: "100%", padding: "10px 14px", fontSize: 14,
  background: "#f8fdfb", border: "1.5px solid #dceee3", borderRadius: 12,
  color: "#111827", outline: "none", fontFamily: "'Inter', sans-serif",
  transition: "border-color 0.15s", boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 8, display: "block",
};

const errorStyle = {
  fontSize: 11, color: "#ef4444", marginTop: 4,
};

export default function MenuItemForm({ restaurantId, categories, onAdded }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await createMenuItem(restaurantId, {
        ...data,
        price: parseFloat(data.price),
        is_available: true,
      });
      toast.success(`"${data.name}" added!`);
      reset();
      if (onAdded) onAdded();
    } catch (err) {
      toast.error("Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle}>Item Name *</label>
          <input
            style={inputStyle}
            placeholder="e.g. Butter Chicken"
            {...register("name", { required: "Required" })}
            onFocus={e => e.target.style.borderColor = "#1a6b3a"}
            onBlur={e => e.target.style.borderColor = "#dceee3"}
          />
          {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
        </div>
        <div>
          <label style={labelStyle}>Price (₹) *</label>
          <input
            type="number"
            style={inputStyle}
            placeholder="249"
            min={0}
            step="0.50"
            {...register("price", { required: "Required" })}
            onFocus={e => e.target.style.borderColor = "#1a6b3a"}
            onBlur={e => e.target.style.borderColor = "#dceee3"}
          />
          {errors.price && <p style={errorStyle}>{errors.price.message}</p>}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Category</label>
        <select
          style={inputStyle}
          {...register("category_id")}
          onFocus={e => e.target.style.borderColor = "#1a6b3a"}
          onBlur={e => e.target.style.borderColor = "#dceee3"}
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          style={{ ...inputStyle, resize: "none", height: 80 }}
          rows={2}
          placeholder="Brief description (optional)"
          {...register("description")}
          onFocus={e => e.target.style.borderColor = "#1a6b3a"}
          onBlur={e => e.target.style.borderColor = "#dceee3"}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 22px", borderRadius: 12,
            background: "#1a6b3a", color: "white",
            fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
            boxShadow: "0 4px 14px rgba(26,107,58,0.3)",
            opacity: loading ? 0.7 : 1,
            transition: "transform 0.15s, opacity 0.15s",
            fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          {loading
            ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
            : <Plus size={15} />
          }
          Add Item
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}