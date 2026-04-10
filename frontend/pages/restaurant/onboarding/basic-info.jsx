import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { getRestaurant, updateRestaurant } from "../../../services/api";
import OnboardingLayout from "../../../components/OnboardingLayout";
import { Loader2 } from "lucide-react";

const BUSINESS_TYPES = [
  { value: "dine_in", label: "🍽️  Dine-In" },
  { value: "takeaway", label: "🥡  Takeaway" },
  { value: "delivery", label: "🛵  Delivery" },
];

export default function BasicInfoStep() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      owner_name: "",
      phone: "",
      city: "",
      business_type: [] 
    }
  });

  const loadData = useCallback(async () => {
    const id = localStorage.getItem("restaurant_id");
    if (!id) { router.replace("/restaurant/login"); return; }
    
    try {
      const res = await getRestaurant(id);
      const data = res.data;
      
      // Fix: Agar backend se data string mein aaye "dine_in,delivery" toh array banao
      if (data.business_type && typeof data.business_type === 'string') {
        data.business_type = data.business_type.split(',').map(s => s.trim());
      } else if (!data.business_type) {
        data.business_type = [];
      }
      
      reset(data);
    } catch (err) {
      console.error("Failed to load restaurant:", err);
    } finally {
      setFetching(false);
    }
  }, [reset, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSubmit = async (data) => {
    // Validation
    if (!data.business_type || data.business_type.length === 0) {
      toast.error("Please select at least one Business Type");
      return;
    }

    setLoading(true);
    const id = localStorage.getItem("restaurant_id");
    
    try {
      await updateRestaurant(id, {
        name: data.name,
        owner_name: data.owner_name,
        phone: data.phone,
        city: data.city,
        // Yahan fix hai: Agar backend string mangta hai toh .join(",") use karein
        // Agar aapka backend List[str] accept karta hai toh seedha data.business_type bhejein
        business_type: Array.isArray(data.business_type) 
          ? data.business_type.join(",") 
          : data.business_type, 
      });
      
      toast.success("Basic info saved!");
      router.push("/restaurant/onboarding/operations");
    } catch (err) {
      // FIX: Yahan se "Objects are not valid as React child" error solve hoga
      const errorMsg = err.response?.data?.detail;
      if (Array.isArray(errorMsg)) {
        toast.error(errorMsg[0]?.msg || "Validation error");
      } else {
        toast.error(typeof errorMsg === "string" ? errorMsg : "Failed to save data");
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <OnboardingLayout currentStep="basic-info">
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    </OnboardingLayout>
  );

  return (
    <OnboardingLayout
      currentStep="basic-info"
      title="Tell us about your restaurant"
      subtitle="This is the basic info customers will see."
    >
      <div className="card bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Restaurant Name</label>
              <input className="input-field" placeholder="e.g. Spice Garden" {...register("name", { required: "Name is required" })} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Owner Name</label>
              <input className="input-field" placeholder="e.g. Rahul Sharma" {...register("owner_name", { required: "Owner name is required" })} />
              {errors.owner_name && <p className="text-red-500 text-xs mt-1">{errors.owner_name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Phone Number</label>
              <input className="input-field" placeholder="+91 98765 43210" {...register("phone", { required: "Phone is required" })} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">City</label>
              <input className="input-field" placeholder="e.g. Mumbai" {...register("city", { required: "City is required" })} />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-2 block">Business Type (Multiple)</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BUSINESS_TYPES.map((t) => (
                <label key={t.value} className="flex items-center gap-3 p-4 border border-gray-200 rounded-2xl cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                  <input 
                    type="checkbox" 
                    value={t.value} 
                    {...register("business_type", { required: "Select at least one" })} 
                    className="w-5 h-5 accent-orange-500 rounded-lg" 
                  />
                  <span className="text-sm font-semibold text-gray-700">{t.label}</span>
                </label>
              ))}
            </div>
            {errors.business_type && <p className="text-red-500 text-xs mt-1">{errors.business_type.message}</p>}
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={loading} className="w-full sm:w-auto px-10 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-200">
              {loading && <Loader2 size={18} className="animate-spin" />}
              Save & Continue →
            </button>
          </div>
        </form>
      </div>
    </OnboardingLayout>
  );
}