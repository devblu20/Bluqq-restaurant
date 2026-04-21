import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import {
  getMe,
  getOrderSettings,
  createOrderSettings,
  updateOrderSettings,
} from "../../../services/api";
import {
  Loader2, CreditCard, IndianRupee, ReceiptText, Save, Check,
  UtensilsCrossed, ChevronLeft,
} from "lucide-react";

/* ── Section Card ── */
function Section({ title, icon: Icon, iconBg, children }) {
  return (
    <div style={{ background: "white", borderRadius: 22, padding: 26, border: "1.5px solid #dceee3", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1.5px solid #edf6f0" }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: iconBg || "#f2f9f4", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color="#1a6b3a" />
        </div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ── Check Option ── */
function CheckOption({ label, desc, name, register }) {
  return (
    <label
      style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px", border: "1.5px solid #dceee3", borderRadius: 14, cursor: "pointer", background: "white", transition: "all 0.15s" }}
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
export default function EditOrderSettingsPage() {
  const router = useRouter();
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  // Track whether a settings record already exists in the backend.
  // - null  = not yet determined (still loading)
  // - false = no record (need POST to create)
  // - true  = record exists (use PATCH to update)
  const [settingsExist, setSettingsExist] = useState(null);

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

    Promise.all([
      getMe(),
      // Gracefully handle 404 — it just means no settings row exists yet
      getOrderSettings(id).catch((err) => {
        if (err.response?.status === 404) return { data: null };
        throw err; // re-throw anything else (500, network, etc.)
      }),
    ])
      .then(([_meRes, settRes]) => {
        if (settRes?.data) {
          reset(settRes.data);
          setSettingsExist(true);
        } else {
          setSettingsExist(false); // no record — will POST on first save
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setFetching(false));
  }, [reset]);

  const onSubmit = async (data) => {
    setSaving(true);
    const id = localStorage.getItem("restaurant_id");

    const payload = {
      cash_on_delivery_enabled: !!data.cash_on_delivery_enabled,
      upi_enabled: !!data.upi_enabled,
      tax_included: !!data.tax_included,
      minimum_order_amount: parseFloat(data.minimum_order_amount) || 0,
      delivery_fee: parseFloat(data.delivery_fee) || 0,
      currency: data.currency || "INR",
    };

    try {
      if (settingsExist) {
        // Record already exists → PATCH
        await updateOrderSettings(id, payload);
      } else {
        // First time → POST to create the record
        await createOrderSettings(id, payload);
        setSettingsExist(true); // subsequent saves should PATCH
      }
      toast.success("Settings updated!");
      router.push("/restaurant/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
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
        <title>Order Settings | Menuify</title>
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
            <button
              onClick={() => router.push("/restaurant/dashboard")}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6aad7a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", marginBottom: 14, padding: 0, fontFamily: "'Inter', sans-serif" }}
            >
              <ChevronLeft size={15} /> Back to Dashboard
            </button>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Order Settings</h1>
            <p style={{ fontSize: 13, color: "#6aad7a", marginTop: 4, fontWeight: 500 }}>Configure payments, taxes and delivery fees</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Payment Methods */}
            <Section title="Payment Methods" icon={CreditCard}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <CheckOption label="Cash on Delivery" desc="Accept cash at doorstep" name="cash_on_delivery_enabled" register={register} />
                <CheckOption label="UPI / Transfer" desc="GPay, PhonePe, Paytm" name="upi_enabled" register={register} />
              </div>
            </Section>

            {/* Tax */}
            <Section title="Tax Settings" icon={ReceiptText}>
              <CheckOption label="Prices are tax-inclusive" desc="GST is already included in menu prices" name="tax_included" register={register} />
            </Section>

            {/* Fees */}
            <Section title="Fees & Minimums" icon={IndianRupee}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 8, display: "block" }}>Min. Order Amount</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9dbeaa", fontWeight: 700 }}>₹</span>
                    <input style={{ ...inputStyle, paddingLeft: 30 }} type="number" min={0} placeholder="0" {...register("minimum_order_amount")} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 8, display: "block" }}>Delivery Fee</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9dbeaa", fontWeight: 700 }}>₹</span>
                    <input style={{ ...inputStyle, paddingLeft: 30 }} type="number" min={0} step="0.50" placeholder="0" {...register("delivery_fee")} />
                  </div>
                </div>
              </div>
            </Section>

            {/* Currency */}
            <Section title="Display Currency" icon={IndianRupee}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6aad7a", marginBottom: 8, display: "block" }}>Currency</label>
                <select style={inputStyle} {...register("currency")}>
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                </select>
              </div>
            </Section>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "16px", borderRadius: 16, background: "#1a6b3a", color: "white",
                fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer",
                boxShadow: "0 8px 24px rgba(26,107,58,0.3)", transition: "transform 0.15s, opacity 0.15s",
                opacity: saving ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              {saving
                ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Saving Changes...</>
                : <><Save size={18} /> {settingsExist ? "Update & Return to Dashboard" : "Save & Return to Dashboard"}</>
              }
            </button>
          </form>
        </main>
      </div>

      {/* Floating Unsaved Changes Bar */}
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
            <button
              onClick={() => reset()}
              style={{ padding: "8px 14px", borderRadius: 10, background: "transparent", color: "#9ca3af", border: "1px solid #374151", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
            >
              Discard
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={saving}
              style={{ padding: "8px 18px", borderRadius: 10, background: "#1a6b3a", color: "white", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif" }}
            >
              {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={12} />}
              Save
            </button>
          </div>
        </div>
      )}
    </>
  );
}