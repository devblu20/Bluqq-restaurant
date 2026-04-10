import { useState } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { createOrderSettings } from "../../../services/api";
import OnboardingLayout from "../../../components/OnboardingLayout";
import { Loader2 } from "lucide-react";

export default function OrderSettingsStep() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      cash_on_delivery_enabled: true,
      upi_enabled: false,
      tax_included: false,
      minimum_order_amount: 0,
      delivery_fee: 0,
      currency: "INR",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const id = localStorage.getItem("restaurant_id");
    try {
      await createOrderSettings(id, {
        cash_on_delivery_enabled: !!data.cash_on_delivery_enabled,
        upi_enabled: !!data.upi_enabled,
        tax_included: !!data.tax_included,
        minimum_order_amount: parseFloat(data.minimum_order_amount) || 0,
        delivery_fee: parseFloat(data.delivery_fee) || 0,
        currency: data.currency || "INR",
      });
      toast.success("Order settings saved!");
      router.push("/restaurant/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep="order-settings"
      title="Configure order settings"
      subtitle="How do you want to accept and process orders?"
    >
      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Payment methods */}
          <div>
            <p className="label mb-2">Payment Methods</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-brand-300 transition">
                <input type="checkbox" className="accent-brand-500 w-4 h-4 mt-0.5" {...register("cash_on_delivery_enabled")} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Cash on Delivery</p>
                  <p className="text-xs text-gray-400">Accept cash when order is delivered</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-brand-300 transition">
                <input type="checkbox" className="accent-brand-500 w-4 h-4 mt-0.5" {...register("upi_enabled")} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">UPI / Manual Transfer</p>
                  <p className="text-xs text-gray-400">Share UPI ID or bank details</p>
                </div>
              </label>
            </div>
          </div>

          {/* Tax */}
          <div>
            <p className="label mb-2">Tax Settings</p>
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-brand-300 transition w-full">
              <input type="checkbox" className="accent-brand-500 w-4 h-4 mt-0.5" {...register("tax_included")} />
              <div>
                <p className="text-sm font-semibold text-gray-800">Prices are tax-inclusive</p>
                <p className="text-xs text-gray-400">Menu prices already include GST / applicable taxes</p>
              </div>
            </label>
          </div>

          {/* Min order & delivery fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Minimum Order Amount (₹)</label>
              <input
                type="number"
                className="input-field"
                min={0}
                placeholder="0"
                {...register("minimum_order_amount")}
              />
              <p className="text-xs text-gray-400 mt-1">Set 0 for no minimum</p>
            </div>
            <div>
              <label className="label">Delivery Fee (₹)</label>
              <input
                type="number"
                className="input-field"
                min={0}
                step="0.50"
                placeholder="0"
                {...register("delivery_fee")}
              />
              <p className="text-xs text-gray-400 mt-1">Set 0 for free delivery</p>
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="label">Currency</label>
            <select className="input-field" {...register("currency")}>
              <option value="INR">INR — Indian Rupee (₹)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="AED">AED — UAE Dirham</option>
              <option value="GBP">GBP — British Pound (£)</option>
            </select>
          </div>

          <div className="flex justify-between pt-2">
            <button type="button" className="btn-secondary" onClick={() => router.back()}>← Back</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Saving..." : "Finish Setup →"}
            </button>
          </div>
        </form>
      </div>
    </OnboardingLayout>
  );
}
