import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { getMe, getRestaurantProfile, updateRestaurantProfile } from "../../../services/api";
import {
  Loader2, MapPin, Clock, Truck, Phone, Save, Check, ChevronLeft,
  UtensilsCrossed,
} from "lucide-react";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

/* ── Section Card ── */
function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ background: "white", borderRadius: 22, padding: 26, border: "1.5px solid #dceee3", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1.5px solid #edf6f0" }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: "#f2f9f4", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color="#1a6b3a" />
        </div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ── CheckOption ── */
function CheckOption({ label, desc, name, register }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px", border: "1.5px solid #dceee3", borderRadius: 14, cursor: "pointer", background: "white", transition: "all 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#1a6b3a"; e.currentTarget.style.background = "#f4faf6"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#dceee3"; e.currentTarget.style.background = "white"; }}
    >
      <input type="checkbox" style={{ accentColor: "#1a6b3a", width: 16, height: 16, marginTop: 2, flexShrink: 0 }} {...register(name)} />
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{label}</p>
        <p style={{ fontSize: 12, color: "#9dbeaa", marginTop: 3 }}>{desc}</p>
      </div>
    </label>
  );
}

/* ── Main Page ── */
export default function EditOperationsPage() {
  const router = useRouter();
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm({
    defaultValues: {
      delivery_enabled: false, takeaway_enabled: false,
      avg_prep_time_minutes: 30, delivery_radius_km: 5,
    },
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const id = localStorage.getItem("restaurant_id");
    if (!token || !id) { router.replace("/restaurant/login"); return; }
    Promise.all([getMe(), getRestaurantProfile(id)])
      .then(([meRes, profRes]) => {
        const d = profRes.data;
        const hours = {};
        if (d.opening_hours) {
          DAYS.forEach(day => { if (d.opening_hours[day]) hours[`hours_${day}`] = d.opening_hours[day]; });
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
    DAYS.forEach(d => { if (data[`hours_${d}`]) opening_hours[d] = data[`hours_${d}`]; });
    try {
      await updateRestaurantProfile(id, {
        address: data.address, opening_hours,
        delivery_enabled: !!data.delivery_enabled,
        takeaway_enabled: !!data.takeaway_enabled,
        avg_prep_time_minutes: parseInt(data.avg_prep_time_minutes) || 30,
        delivery_radius_km: parseFloat(data.delivery_radius_km) || 5,
        whatsapp_number: data.whatsapp_number,
      });
      toast.success("Operations updated!");
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", fontSize: 14,
    background: "#f8fdfb", border: "1.5px solid #dceee3", borderRadius: 12,
    color: "#111827", outline: "none", fontFamily: "'Inter', sans-serif",
  };

  if (fetching) return (
    <div style={{ minHeight: "100vh", background: "#eef5f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <UtensilsCrossed size={22} color="white" />
        </div>
        <Loader2 size={24} color="#1a6b3a" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Operations | Menuify</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #eef5f0; font-family: 'Inter', sans-serif; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #b8d8c4; border-radius: 4px; }
        `}</style>
      </Head>

      <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "#eef5f0" }}>
        <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 32px 80px", display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Header */}
          <div>
            <button onClick={() => router.push("/restaurant/dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6aad7a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", marginBottom: 14, padding: 0, fontFamily: "'Inter', sans-serif" }}>
              <ChevronLeft size={15} /> Back to Dashboard
            </button>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Operations</h1>
            <p style={{ fontSize: 13, color: "#6aad7a", marginTop: 4, fontWeight: 500 }}>Manage hours, delivery options and contact info</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Address */}
            <Section title="Business Address" icon={MapPin}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 8, display: "block" }}>Full address</label>
                <textarea style={{ ...inputStyle, resize: "none", height: 80 }}
                  rows={2} placeholder="123 MG Road, Bandra West, Mumbai 400050"
                  {...register("address")} />
              </div>
            </Section>

            {/* Opening Hours */}
            <Section title="Opening Hours" icon={Clock}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {DAYS.map((d) => (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 36, fontSize: 11, fontWeight: 700, color: "#6aad7a", textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>
                      {DAY_LABELS[d]}
                    </span>
                    <input
                      style={{ ...inputStyle, fontSize: 12 }}
                      placeholder="9:00 AM – 10:00 PM"
                      {...register(`hours_${d}`)}
                    />
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#9dbeaa", marginTop: 12 }}>Leave blank for days you're closed</p>
            </Section>

            {/* Order Types */}
            <Section title="Order Types" icon={Truck}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <CheckOption label="Home Delivery" desc="Deliver to customer's address" name="delivery_enabled" register={register} />
                <CheckOption label="Takeaway / Pickup" desc="Customers collect from your outlet" name="takeaway_enabled" register={register} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 8, display: "block" }}>Avg. Prep Time</label>
                  <div style={{ position: "relative" }}>
                    <input style={{ ...inputStyle, paddingRight: 48 }} type="number" min={1} placeholder="30" {...register("avg_prep_time_minutes")} />
                    <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#9dbeaa", fontWeight: 600 }}>mins</span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 8, display: "block" }}>Delivery Radius</label>
                  <div style={{ position: "relative" }}>
                    <input style={{ ...inputStyle, paddingRight: 36 }} type="number" min={1} step="0.5" placeholder="5" {...register("delivery_radius_km")} />
                    <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#9dbeaa", fontWeight: 600 }}>km</span>
                  </div>
                </div>
              </div>
            </Section>

            {/* WhatsApp */}
            <Section title="Support Contact" icon={Phone}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 8, display: "block" }}>WhatsApp Number</label>
                <input style={inputStyle} placeholder="+91 98765 43210" {...register("whatsapp_number")} />
                <p style={{ fontSize: 11, color: "#9dbeaa", marginTop: 8 }}>Customers can reach you for order queries</p>
              </div>
            </Section>

            {/* Save Button */}
            <button
              type="submit" disabled={saving}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "16px", borderRadius: 16, background: "#1a6b3a", color: "white",
                fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer",
                boxShadow: "0 8px 24px rgba(26,107,58,0.3)", opacity: saving ? 0.7 : 1,
                transition: "transform 0.15s, opacity 0.15s",
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              {saving
                ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
                : <><Save size={18} /> Save Operations</>
              }
            </button>
          </form>
        </main>
      </div>

      {/* Floating Unsaved Bar */}
      {isDirty && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          width: "90%", maxWidth: 520, background: "#111827", color: "white",
          padding: "16px 20px", borderRadius: 18, boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          animation: "slideUp 0.3s ease", zIndex: 99,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            <p style={{ fontSize: 13, fontWeight: 600 }}>You have unsaved changes</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => reset()} style={{ padding: "8px 14px", borderRadius: 10, background: "transparent", color: "#9ca3af", border: "1px solid #374151", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              Discard
            </button>
            <button onClick={handleSubmit(onSubmit)} disabled={saving} style={{ padding: "8px 18px", borderRadius: 10, background: "#1a6b3a", color: "white", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif" }}>
              {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={12} />}
              Save
            </button>
          </div>
        </div>
      )}
    </>
  );
}