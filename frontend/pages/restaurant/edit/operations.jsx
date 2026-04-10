import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import RestaurantLayout from "../../../components/OnboardingLayout";
// import PageHeader from "../../components/PageHeader";
import { getMe, getRestaurantProfile, updateRestaurantProfile } from "../../../services/api";
import { Loader2, MapPin, Clock, Truck, Phone } from "lucide-react";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all";

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
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
    <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50">
      <input type="checkbox" className="accent-orange-500 w-4 h-4 mt-0.5" {...register(name)} />
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
    </label>
  );
}

export default function EditOperationsPage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      delivery_enabled: false,
      takeaway_enabled: false,
      avg_prep_time_minutes: 30,
      delivery_radius_km: 5,
    },
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const id = localStorage.getItem("restaurant_id");
    if (!token || !id) { router.replace("/restaurant/login"); return; }

    Promise.all([getMe(), getRestaurantProfile(id)])
      .then(([meRes, profRes]) => {
        setRestaurant(meRes.data);
        const d = profRes.data;
        // Flatten opening_hours object into form fields
        const hours = {};
        if (d.opening_hours) {
          DAYS.forEach(day => {
            if (d.opening_hours[day]) hours[`hours_${day}`] = d.opening_hours[day];
          });
        }
        reset({ ...d, ...hours });
      })
      .catch(() => router.replace("/restaurant/login"))
      .finally(() => setFetching(false));
  }, []);

  const onSubmit = async (data) => {
    setSaving(true);
    const id = localStorage.getItem("restaurant_id");
    const opening_hours = {};
    DAYS.forEach((d) => {
      if (data[`hours_${d}`]) opening_hours[d] = data[`hours_${d}`];
    });
    try {
      await updateRestaurantProfile(id, {
        address: data.address,
        opening_hours,
        delivery_enabled: !!data.delivery_enabled,
        takeaway_enabled: !!data.takeaway_enabled,
        avg_prep_time_minutes: parseInt(data.avg_prep_time_minutes) || 30,
        delivery_radius_km: parseFloat(data.delivery_radius_km) || 5,
        whatsapp_number: data.whatsapp_number,
      });
      toast.success("Operations updated!");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("restaurant_id");
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Syne:wght@600;700&display=swap" rel="stylesheet" />
      </Head>

      <RestaurantLayout restaurant={restaurant} onLogout={handleLogout}>
        <main className="max-w-3xl mx-auto px-7 py-8">
          {/* <PageHeader
            title="Operations"
            subtitle="Manage your hours, delivery options and contact"
            onSave={handleSubmit(onSubmit)}
            saving={saving}
            saved={saved}
          /> */}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Address */}
            <Section title="Business address" icon={MapPin}>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Full address</label>
                <textarea className={inputCls + " resize-none"} rows={2}
                  placeholder="123 MG Road, Bandra West, Mumbai 400050"
                  {...register("address")} />
              </div>
            </Section>

            {/* Opening hours */}
            <Section title="Opening hours" icon={Clock}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DAYS.map((d) => (
                  <div key={d} className="flex items-center gap-3">
                    <span className="w-9 text-xs font-semibold text-gray-500 flex-shrink-0">
                      {DAY_LABELS[d]}
                    </span>
                    <input className={inputCls + " text-xs"} placeholder="9:00 AM – 10:00 PM"
                      {...register(`hours_${d}`)} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">Leave blank for days you're closed</p>
            </Section>

            {/* Order types */}
            <Section title="Order types" icon={Truck}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CheckOption label="Home delivery" desc="Deliver orders to customer's address"
                  name="delivery_enabled" register={register} />
                <CheckOption label="Takeaway / Pickup" desc="Customers collect from your outlet"
                  name="takeaway_enabled" register={register} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Avg. prep time <span className="font-normal text-gray-400">(minutes)</span>
                  </label>
                  <div className="relative">
                    <input className={inputCls + " pr-14"} type="number" min={1}
                      placeholder="30" {...register("avg_prep_time_minutes")} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">mins</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Delivery radius <span className="font-normal text-gray-400">(km)</span>
                  </label>
                  <div className="relative">
                    <input className={inputCls + " pr-8"} type="number" min={1} step="0.5"
                      placeholder="5" {...register("delivery_radius_km")} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">km</span>
                  </div>
                </div>
              </div>
            </Section>

            {/* WhatsApp */}
            <Section title="Support contact" icon={Phone}>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">WhatsApp number</label>
                <input className={inputCls} placeholder="+91 98765 43210"
                  {...register("whatsapp_number")} />
                <p className="text-xs text-gray-400 mt-1">Customers can reach you for order queries</p>
              </div>
            </Section>

          </form>
        </main>
      </RestaurantLayout>
    </>
  );
}