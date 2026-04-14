import { useState } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import Head from "next/head";
import toast from "react-hot-toast";
import { createProfile } from "../../../services/api";
import OnboardingLayout from "../../../components/OnboardingLayout";
import { Loader2, Clock, Truck, ShoppingBag, Timer, MapPin, Phone } from "lucide-react";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

export default function OperationsStep() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const defaultHours = {};
  DAYS.forEach((day) => { defaultHours[`hours_${day}`] = "9:00 AM – 10:00 PM"; });

  const { register, handleSubmit } = useForm({
    defaultValues: {
      delivery_enabled: false,
      takeaway_enabled: false,
      avg_prep_time_minutes: 30,
      delivery_radius_km: 10,
      ...defaultHours,
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const id = localStorage.getItem("restaurant_id");
    const opening_hours = {};
    DAYS.forEach((d) => { if (data[`hours_${d}`]) opening_hours[d] = data[`hours_${d}`]; });
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
    <>
      <Head>
        <title>Operations Setup | Menuify</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #eef5f0; font-family: 'Inter', sans-serif; }
          @keyframes spin { to { transform: rotate(360deg); } }

          .ops-input {
            font-family: 'Inter', sans-serif; font-size: 13px; color: #111827;
            width: 100%; padding: 11px 14px;
            background: #f8fbf9; border: 1.5px solid #dceee3; border-radius: 12px;
            outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          }
          .ops-input:focus { border-color: #1a6b3a; box-shadow: 0 0 0 3px rgba(26,107,58,0.1); }
          .ops-input::placeholder { color: #b8d8c4; }

          .ops-textarea {
            font-family: 'Inter', sans-serif; font-size: 13px; color: #111827;
            width: 100%; padding: 11px 14px; resize: none;
            background: #f8fbf9; border: 1.5px solid #dceee3; border-radius: 12px;
            outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          }
          .ops-textarea:focus { border-color: #1a6b3a; box-shadow: 0 0 0 3px rgba(26,107,58,0.1); }
          .ops-textarea::placeholder { color: #b8d8c4; }

          .toggle-card {
            display: flex; align-items: center; gap: 14px;
            padding: 16px 18px; border-radius: 16px; cursor: pointer;
            border: 1.5px solid #dceee3; background: white;
            transition: border-color 0.15s, background 0.15s;
          }
          .toggle-card:hover { border-color: #1a6b3a; background: #f4faf6; }

          .toggle-card input[type="checkbox"] {
            width: 18px; height: 18px; accent-color: #1a6b3a; cursor: pointer; flex-shrink: 0;
          }

          .btn-back {
            font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700;
            color: #9dbeaa; background: none; border: none; cursor: pointer;
            padding: 10px 18px; transition: color 0.15s;
          }
          .btn-back:hover { color: #4a7a58; }

          .btn-submit {
            font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700;
            color: white; background: #1a6b3a; border: none; cursor: pointer;
            padding: 12px 32px; border-radius: 14px;
            display: flex; align-items: center; gap: 8px;
            box-shadow: 0 4px 16px rgba(26,107,58,0.2);
            transition: opacity 0.15s, transform 0.1s;
          }
          .btn-submit:hover { opacity: 0.9; }
          .btn-submit:active { transform: scale(0.97); }
          .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

          .section-label {
            font-size: 11px; font-weight: 800; color: #1a6b3a;
            text-transform: uppercase; letter-spacing: 0.12em;
            display: flex; align-items: center; gap: 7px;
            margin-bottom: 12px;
          }

          .day-row {
            display: flex; align-items: center; gap: 10px; padding: 6px 0;
          }
          .day-tag {
            width: 38px; font-size: 11px; font-weight: 800; color: #6aad7a;
            text-transform: uppercase; letter-spacing: 0.08em; flex-shrink: 0;
          }

          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #b8d8c4; border-radius: 4px; }
        `}</style>
      </Head>

      <OnboardingLayout
        currentStep="operations"
        title="How does your restaurant operate?"
        subtitle="Set your hours, delivery options, and contact details."
      >
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 120px", fontFamily: "'Inter', sans-serif" }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* ── Address ── */}
              <div style={{
                background: "white", borderRadius: 22, padding: "24px 26px",
                border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
              }}>
                <p className="section-label">
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "#e6f4ec", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <MapPin size={14} color="#1a6b3a" />
                  </span>
                  Business Address
                </p>
                <textarea
                  className="ops-textarea"
                  rows={2}
                  placeholder="123 MG Road, Bandra West, Mumbai 400050"
                  {...register("address")}
                />
              </div>

              {/* ── Opening Hours ── */}
              <div style={{
                background: "white", borderRadius: 22, padding: "24px 26px",
                border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
              }}>
                <p className="section-label">
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "#e6f4ec", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Clock size={14} color="#1a6b3a" />
                  </span>
                  Opening Hours
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#9dbeaa", textTransform: "none", letterSpacing: 0 }}>
                    — optional per day
                  </span>
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px" }}>
                  {DAYS.map((d) => (
                    <div key={d} className="day-row">
                      <span className="day-tag">{DAY_LABELS[d]}</span>
                      <input
                        className="ops-input"
                        placeholder="9:00 AM – 10:00 PM"
                        style={{ fontSize: 12, padding: "9px 12px" }}
                        {...register(`hours_${d}`)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Delivery & Takeaway Toggles ── */}
              <div style={{
                background: "white", borderRadius: 22, padding: "24px 26px",
                border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
              }}>
                <p className="section-label">
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "#e6f4ec", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Truck size={14} color="#1a6b3a" />
                  </span>
                  Service Options
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label className="toggle-card">
                    <input type="checkbox" {...register("delivery_enabled")} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 }}>Delivery Available</p>
                      <p style={{ fontSize: 11, color: "#9dbeaa" }}>You offer home delivery</p>
                    </div>
                  </label>
                  <label className="toggle-card">
                    <input type="checkbox" {...register("takeaway_enabled")} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 }}>Takeaway Available</p>
                      <p style={{ fontSize: 11, color: "#9dbeaa" }}>Customers can pick up orders</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* ── Prep Time & Radius ── */}
              <div style={{
                background: "white", borderRadius: 22, padding: "24px 26px",
                border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
              }}>
                <p className="section-label">
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "#e6f4ec", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Timer size={14} color="#1a6b3a" />
                  </span>
                  Timings & Radius
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6aad7a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Avg. Prep Time (min)
                    </p>
                    <input
                      type="number"
                      className="ops-input"
                      min={1}
                      placeholder="30"
                      {...register("avg_prep_time_minutes")}
                    />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6aad7a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Delivery Radius (km)
                    </p>
                    <input
                      type="number"
                      className="ops-input"
                      min={1}
                      step="0.5"
                      placeholder="10"
                      {...register("delivery_radius_km")}
                    />
                  </div>
                </div>
              </div>

              {/* ── WhatsApp ── */}
              <div style={{
                background: "white", borderRadius: 22, padding: "24px 26px",
                border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
              }}>
                <p className="section-label">
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "#e6f4ec", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Phone size={14} color="#1a6b3a" />
                  </span>
                  Support WhatsApp Number
                </p>
                <input
                  className="ops-input"
                  placeholder="+91 98765 43210"
                  {...register("whatsapp_number")}
                />
              </div>

            </div>

            {/* ── Footer Nav ── */}
            <div style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20,
              background: "white", borderTop: "1.5px solid #dceee3",
              padding: "14px 24px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.05)",
            }}>
              <button type="button" className="btn-back" onClick={() => router.back()}>
                ← Back
              </button>
              <button type="submit" disabled={loading} className="btn-submit">
                {loading && <Loader2 size={15} color="white" style={{ animation: "spin 1s linear infinite" }} />}
                Save & Continue →
              </button>
            </div>
          </form>
        </div>
      </OnboardingLayout>
    </>
  );
}