import { useState } from "react";
import { useForm } from "react-hook-form";
import { createMenuItem } from "../services/api";
import toast from "react-hot-toast";
import { Plus, Loader2 } from "lucide-react";

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Item Name *</label>
          <input
            className="input-field"
            placeholder="e.g. Butter Chicken"
            {...register("name", { required: "Required" })}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Price (₹) *</label>
          <input
            type="number"
            className="input-field"
            placeholder="249"
            min={0}
            step="0.50"
            {...register("price", { required: "Required" })}
          />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
        </div>
      </div>

      <div>
        <label className="label">Category</label>
        <select className="input-field" {...register("category_id")}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Brief description (optional)"
          {...register("description")}
        />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Add Item
        </button>
      </div>
    </form>
  );
}
