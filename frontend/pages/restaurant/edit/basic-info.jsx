import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
// Path check: pages/restaurant/edit/basic-info.jsx se components tak 3 levels up
import RestaurantLayout from "../../../components/OnboardingLayout"; 
import { getMe, getRestaurant, updateRestaurant } from "../../../services/api";
import { Loader2, Store, MapPin, Phone, Mail, Save, CheckCircle2 } from "lucide-react";

const BUSINESS_TYPES = [
  { value: "dine_in",   label: "🍽️  Dine-In" },
  { value: "takeaway",  label: "🥡  Takeaway" },
  { value: "delivery",  label: "🛵  Delivery" },
];

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all";

// Helper Component for Form Sections
function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-50">
        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-orange-500" />
        </div>
        <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="text-sm font-semibold text-gray-900">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// Helper Component for Input Fields
function Field({ label, required, hint, error, children }) {
  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label} {required && <span className="text-orange-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
}

export default function EditBasicInfoPage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const id = localStorage.getItem("restaurant_id");
    
    if (!token || !id) {
      router.replace("/restaurant/login");
      return;
    }

    Promise.all([getMe(), getRestaurant(id)])
      .then(([meRes, restRes]) => {
        setRestaurant(meRes.data);
        
        // Backend handling: Agar business_type string hai ("dine_in,delivery"), to array banao
        const formData = { ...restRes.data };
        if (formData.business_type && typeof formData.business_type === "string") {
          formData.business_type = formData.business_type.split(",").filter(Boolean);
        } else if (!formData.business_type) {
          formData.business_type = [];
        }
        
        reset(formData);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        toast.error("Session expired. Please login again.");
        router.replace("/restaurant/login");
      })
      .finally(() => setFetching(false));
  }, [reset, router]);

  const onSubmit = async (data) => {
    setSaving(true);
    const id = localStorage.getItem("restaurant_id");
    try {
      // Checkbox array ko comma-separated string mein convert karo backend ke liye
      const payload = {
        ...data,
        business_type: Array.isArray(data.business_type) 
          ? data.business_type.join(",") 
          : data.business_type
      };
      
      await updateRestaurant(id, payload);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save information");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/restaurant/login");
  };

  if (fetching) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-orange-500" size={40} />
        <p className="text-sm text-gray-500 font-medium">Loading profile...</p>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Restaurant Profile | Edit</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Syne:wght@600;700&display=swap" rel="stylesheet" />
      </Head>

      <RestaurantLayout restaurant={restaurant} onLogout={handleLogout}>
        <main className="max-w-3xl mx-auto px-6 py-10">
          
          {/* Header Section (Stepper Removed) */}
          <div className="mb-10 border-b border-gray-100 pb-6">
            <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-3xl font-bold text-gray-900">
              Restaurant Identity
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              Manage your basic details, contact information and store location.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

            {/* 1. Identity Section */}
            <Section title="Basic Details" icon={Store}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Restaurant Name" required error={errors.name?.message}>
                  <input className={inputCls} placeholder="e.g. Spice Garden"
                    {...register("name", { required: "Restaurant name is required" })} />
                </Field>

                <Field label="Owner Name" required error={errors.owner_name?.message}>
                  <input className={inputCls} placeholder="e.g. Rahul Sharma"
                    {...register("owner_name", { required: "Owner name is required" })} />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Description" hint="This will be displayed on your digital menu">
                    <input className={inputCls} placeholder="Short tagline or about your restaurant"
                      {...register("description")} />
                  </Field>
                </div>
                
                {/* Multi-select Business Types */}
                <div className="sm:col-span-2">
                  <Field label="Business Type (Multiple selection allowed)" error={errors.business_type?.message}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                      {BUSINESS_TYPES.map((t) => (
                        <label key={t.value} 
                          className="flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50/50 has-[:checked]:ring-1 has-[:checked]:ring-orange-500">
                          <input 
                            type="checkbox" 
                            value={t.value}
                            {...register("business_type", { required: "Please select at least one" })}
                            className="w-4 h-4 accent-orange-600 rounded" 
                          />
                          <span className="text-xs font-bold text-gray-700">{t.label}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            </Section>

            {/* 2. Contact Section */}
            <Section title="Contact Information" icon={Phone}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Email Address" required error={errors.email?.message}>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className={inputCls + " pl-10"} type="email" placeholder="restaurant@email.com"
                      {...register("email", { 
                        required: "Email is required",
                        pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" }
                      })} />
                  </div>
                </Field>

                <Field label="Phone Number" required error={errors.phone?.message}>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className={inputCls + " pl-10"} type="tel" placeholder="+91 XXXXX XXXXX"
                      {...register("phone", { required: "Phone number is required" })} />
                  </div>
                </Field>
              </div>
            </Section>

            {/* 3. Location Section */}
            <Section title="Store Location" icon={MapPin}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="City" required error={errors.city?.message}>
                  <input className={inputCls} placeholder="e.g. Mandsaur"
                    {...register("city", { required: "City is required" })} />
                </Field>
                
                <Field label="Full Address">
                  <input className={inputCls} placeholder="Street, locality, landmark..."
                    {...register("address")} />
                </Field>
              </div>
            </Section>

            {/* Final Action Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-3 py-4 bg-orange-500 text-white font-bold text-base rounded-2xl hover:bg-orange-600 active:scale-[0.98] transition-all shadow-xl shadow-orange-100 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>Update Information</span>
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-400 mt-4">
                Changes will reflect on your digital menu immediately.
              </p>
            </div>

          </form>
        </main>
      </RestaurantLayout>
    </>
  );
}