import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import RestaurantLayout from "../../../components/OnboardingLayout";
import { 
  Loader2, CreditCard, IndianRupee, ReceiptText, 
  Save, Check, ArrowLeft 
} from "lucide-react";
import { getMe, getOrderSettings, updateOrderSettings } from "../../../services/api";

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all";

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

function CheckOption({ label, desc, name, register }) {
  return (
    <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50/50 has-[:checked]:ring-1 has-[:checked]:ring-orange-500">
      <input type="checkbox" className="accent-orange-600 w-4 h-4 mt-0.5 rounded" {...register(name)} />
      <div>
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
    </label>
  );
}

export default function EditOrderSettingsPage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm({
    defaultValues: {
      cash_on_delivery_enabled: true,
      upi_enabled: false,
      tax_included: false,
      minimum_order_amount: 0,
      delivery_fee: 0,
      currency: "INR",
    },
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const id = localStorage.getItem("restaurant_id");

    if (!token || !id) {
      router.replace("/restaurant/login");
      return;
    }

    Promise.all([getMe(), getOrderSettings(id)])
      .then(([meRes, settRes]) => {
        setRestaurant(meRes.data);
        if (settRes?.data) reset(settRes.data);
      })
      .catch((err) => {
        console.error("API Error:", err.response?.data || err.message);
        toast.error("Failed to load settings");
      })
      .finally(() => setFetching(false));
  }, [reset, router]);

  const onSubmit = async (data) => {
    setSaving(true);
    const id = localStorage.getItem("restaurant_id");
    try {
      await updateOrderSettings(id, {
        cash_on_delivery_enabled: !!data.cash_on_delivery_enabled,
        upi_enabled: !!data.upi_enabled,
        tax_included: !!data.tax_included,
        minimum_order_amount: parseFloat(data.minimum_order_amount) || 0,
        delivery_fee: parseFloat(data.delivery_fee) || 0,
        currency: data.currency || "INR",
      });
      
      toast.success("Settings updated!");
      
      // Update ke baad dashboard par wapas bhejne ke liye
      router.push("/restaurant/dashboard"); 
      
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
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
      <Loader2 className="animate-spin text-orange-500" size={32} />
    </div>
  );

  return (
    <>
      <Head>
        <title>Order Settings | Dashboard</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@700&display=swap" rel="stylesheet" />
      </Head>

      <RestaurantLayout restaurant={restaurant} onLogout={handleLogout}>
        <main className="max-w-3xl mx-auto px-7 py-8 mb-24">
          
          {/* Back Button and Header */}
          <div className="mb-8">
            <button 
              onClick={() => router.push("/restaurant/dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors mb-4 text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
            <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-bold text-gray-900">Order Settings</h1>
            <p className="text-sm text-gray-500">Configure how you accept payments and handle taxes</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            <Section title="Payment methods" icon={CreditCard}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CheckOption label="Cash on delivery" desc="Accept cash at your doorstep"
                  name="cash_on_delivery_enabled" register={register} />
                <CheckOption label="UPI / Manual transfer" desc="Accept GPay, PhonePe, Paytm"
                  name="upi_enabled" register={register} />
              </div>
            </Section>

            <Section title="Tax settings" icon={ReceiptText}>
              <CheckOption label="Prices are tax-inclusive" desc="GST is already included in menu prices"
                name="tax_included" register={register} />
            </Section>

            <Section title="Fees & Minimums" icon={IndianRupee}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Min. Order Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <input className={inputCls} type="number" min={0}
                      placeholder="0" {...register("minimum_order_amount")} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Delivery Fee</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <input className={inputCls} type="number" min={0} step="0.50"
                      placeholder="0" {...register("delivery_fee")} />
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Currency" icon={IndianRupee}>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5 block">Display Currency</label>
                <select className={inputCls} {...register("currency")}>
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                </select>
              </div>
            </Section>

            <div className="pt-4">
               <button 
                type="submit" 
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 disabled:opacity-70"
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {saving ? "Saving Changes..." : "Update & Return"}
              </button>
            </div>

          </form>
        </main>

        {/* Floating Bar for Quick Save */}
        {isDirty && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <p className="text-sm font-medium">Unsaved changes detected</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => reset()} className="px-4 py-2 text-xs font-bold hover:text-gray-300">Discard</button>
              <button 
                onClick={handleSubmit(onSubmit)}
                disabled={saving}
                className="px-6 py-2 bg-orange-500 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-orange-600"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Save & Go
              </button>
            </div>
          </div>
        )}
      </RestaurantLayout>
    </>
  );
}