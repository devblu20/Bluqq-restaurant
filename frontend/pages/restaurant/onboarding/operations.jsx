import { useState } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { createProfile } from "../../../services/api";
import OnboardingLayout from "../../../components/OnboardingLayout";
import { Loader2 } from "lucide-react";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

export default function OperationsStep() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Default values taiyar kar rahe hain jisme saare din shamil hain
  const defaultHours = {};
  DAYS.forEach(day => {
    defaultHours[`hours_${day}`] = "9:00 AM – 10:00 PM";
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      delivery_enabled: false,
      takeaway_enabled: false,
      avg_prep_time_minutes: 30,
      delivery_radius_km: 10,
      ...defaultHours, // Saare dino ka default time yahan add ho gaya
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const id = localStorage.getItem("restaurant_id");
    
    // Opening hours build kar rahe hain
    const opening_hours = {};
    DAYS.forEach((d) => {
      if (data[`hours_${d}`]) opening_hours[d] = data[`hours_${d}`];
    });

    try {
      await createProfile(id, {
        address: data.address,
        opening_hours,
        delivery_enabled: !!data.delivery_enabled,
        takeaway_enabled: !!data.takeaway_enabled,
        avg_prep_time_minutes: parseInt(data.avg_prep_time_minutes) || 30,
        delivery_radius_km: parseFloat(data.delivery_radius_km) || 10,
        whatsapp_number: data.whatsapp_number,
      });
      toast.success("Operations info saved!");
      router.push("/restaurant/onboarding/menu");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep="operations"
      title="How does your restaurant operate?"
      subtitle="Set your hours, delivery options, and contact details."
    >
      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Address */}
          <div>
            <label className="label">Business Address</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="123 MG Road, Bandra West, Mumbai 400050"
              {...register("address")}
            />
          </div>

          {/* Hours */}
          <div>
            <label className="label">Opening Hours <span className="text-gray-400 font-normal">(optional per day)</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {DAYS.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-semibold text-gray-500">{DAY_LABELS[d]}</span>
                  <input
                    className="input-field text-xs py-2"
                    placeholder="9:00 AM – 10:00 PM"
                    {...register(`hours_${d}`)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-brand-300 transition">
              <input type="checkbox" className="accent-brand-500 w-4 h-4" {...register("delivery_enabled")} />
              <div>
                <p className="text-sm font-semibold text-gray-800">Delivery Available</p>
                <p className="text-xs text-gray-400">You offer home delivery</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-brand-300 transition">
              <input type="checkbox" className="accent-brand-500 w-4 h-4" {...register("takeaway_enabled")} />
              <div>
                <p className="text-sm font-semibold text-gray-800">Takeaway Available</p>
                <p className="text-xs text-gray-400">Customers can pick up orders</p>
              </div>
            </label>
          </div>

          {/* Prep time & radius */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Avg. Prep Time (minutes)</label>
              <input type="number" className="input-field" min={1} placeholder="30" {...register("avg_prep_time_minutes")} />
            </div>
            <div>
              <label className="label">Delivery Radius (km)</label>
              <input type="number" className="input-field" min={1} step="0.5" placeholder="10" {...register("delivery_radius_km")} />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="label">Support WhatsApp Number</label>
            <input className="input-field" placeholder="+91 98765 43210" {...register("whatsapp_number")} />
          </div>

          <div className="flex justify-between pt-2">
            <button type="button" className="btn-secondary" onClick={() => router.back()}>← Back</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              Save & Continue →
            </button>
          </div>
        </form>
      </div>
    </OnboardingLayout>
  );
}