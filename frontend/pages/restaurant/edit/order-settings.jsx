import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import RestaurantLayout from "../../../components/OnboardingLayout";
import {
  Loader2, CreditCard, IndianRupee, ReceiptText,
  Save, Check, ArrowLeft, UtensilsCrossed,
} from "lucide-react";
import { getMe, getOrderSettings, updateOrderSettings } from "../../../services/api";

/* ─── Design tokens ─────────────────────────────────────────────── */
const T = {
  primary:      "#1a6b3a",
  primaryLight: "#e6f4ec",
  primaryBorder:"#dceee3",
  primaryHint:  "#9dbeaa",
  primaryMuted: "#6aad7a",
  pageBg:       "#eef5f0",
  cardBg:       "white",
  cardBorder:   "#dceee3",
  divider:      "#edf6f0",
  textMain:     "#111827",
  textSub:      "#4a7a58",
  textHint:     "#9dbeaa",
  inputBg:      "#f9fafb",
  inputBorder:  "#e5e7eb",
};

/* ─── Shared styles ─────────────────────────────────────────────── */
const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  fontSize: 13,
  background: T.inputBg,
  border: `1.5px solid ${T.inputBorder}`,
  borderRadius: 12,
  color: T.textMain,
  outline: "none",
  fontFamily: "'Inter', sans-serif",
  transition: "border-color 0.15s",
};

const inputPrefixedStyle = { ...inputStyle, paddingLeft: 30 };

const labelStyle = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: T.textHint,
  display: "block",
  marginBottom: 6,
};

/* ─── Section card ──────────────────────────────────────────────── */
function Section({ title, icon: Icon, children }) {
  return (
    <div style={{
      background: T.cardBg,
      borderRadius: 22,
      padding: 26,
      border: `1.5px solid ${T.cardBorder}`,
      boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 20, paddingBottom: 16,
        borderBottom: `1.5px solid ${T.divider}`,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: T.primaryLight, border: `1.5px solid ${T.primaryBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={17} color={T.primary} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: T.textMain }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ─── CheckOption ───────────────────────────────────────────────── */
function CheckOption({ label, desc, name, register }) {
  return (
    <label style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "13px 15px", borderRadius: 14, cursor: "pointer",
      background: T.primaryLight, border: `1.5px solid ${T.primaryBorder}`,
      transition: "box-shadow 0.15s",
    }}>
      <input
        type="checkbox"
        style={{ accentColor: T.primary, width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
        {...register(name)}
      />
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: T.textMain }}>{label}</p>
        <p style={{ fontSize: 11, color: T.textHint, marginTop: 2 }}>{desc}</p>
      </div>
    </label>
  );
}

/* ─── Main page ─────────────────────────────────────────────────── */
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
    const id    = localStorage.getItem("restaurant_id");
    if (!token || !id) { router.replace("/restaurant/login"); return; }

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
        upi_enabled:              !!data.upi_enabled,
        tax_included:             !!data.tax_included,
        minimum_order_amount:     parseFloat(data.minimum_order_amount) || 0,
        delivery_fee:             parseFloat(data.delivery_fee)         || 0,
        currency:                 data.currency || "INR",
      });
      toast.success("Settings updated!");
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

  /* Loading state */
  if (fetching) return (
    <div style={{
      minHeight: "100vh", background: T.pageBg,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: T.primary,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <UtensilsCrossed size={22} color="white" />
        </div>
        <Loader2 size={24} color={T.primary} style={{ animation: "spin 1s linear infinite" }} />
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
          body { background: ${T.pageBg}; font-family: 'Inter', sans-serif; }
          @keyframes spin  { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
          @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

          .check-option:hover { box-shadow: 0 0 0 3px ${T.primaryBorder}; }
          .save-btn:hover:not(:disabled) { background: #155c30 !important; }
          .back-btn:hover { color: ${T.primary} !important; }
          .input-field:focus { border-color: ${T.primary} !important; box-shadow: 0 0 0 3px ${T.primaryLight}; }
          .select-field:focus { border-color: ${T.primary} !important; box-shadow: 0 0 0 3px ${T.primaryLight}; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #b8d8c4; border-radius: 4px; }
        `}</style>
      </Head>

      <RestaurantLayout restaurant={restaurant} onLogout={handleLogout}>
        <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: "'Inter', sans-serif" }}>
          <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 32px 100px" }}>

            {/* ── Page header ── */}
            <div style={{ marginBottom: 32 }}>
              <button
                onClick={() => router.push("/restaurant/dashboard")}
                className="back-btn"
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  fontSize: 13, fontWeight: 600, color: T.textHint,
                  background: "none", border: "none", cursor: "pointer",
                  marginBottom: 16, fontFamily: "'Inter', sans-serif",
                  transition: "color 0.15s",
                }}
              >
                <ArrowLeft size={15} />
                Back to Dashboard
              </button>

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, color: T.textMain, letterSpacing: "-0.02em", marginBottom: 4 }}>
                    Order Settings
                  </h1>
                  <p style={{ fontSize: 13, color: T.primaryMuted, fontWeight: 500 }}>
                    Configure how you accept payments and handle taxes
                  </p>
                </div>
                <div style={{
                  padding: "6px 14px", borderRadius: 999, background: "white",
                  border: `1.5px solid ${T.primaryBorder}`,
                  fontSize: 11, fontWeight: 700, color: T.primary,
                }}>
                  ⚙ Settings
                </div>
              </div>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Payment methods */}
              <Section title="Payment methods" icon={CreditCard}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <CheckOption
                    label="Cash on delivery"
                    desc="Accept cash at your doorstep"
                    name="cash_on_delivery_enabled"
                    register={register}
                  />
                  <CheckOption
                    label="UPI / Manual transfer"
                    desc="Accept GPay, PhonePe, Paytm"
                    name="upi_enabled"
                    register={register}
                  />
                </div>
              </Section>

              {/* Tax settings */}
              <Section title="Tax settings" icon={ReceiptText}>
                <CheckOption
                  label="Prices are tax-inclusive"
                  desc="GST is already included in menu prices"
                  name="tax_included"
                  register={register}
                />
              </Section>

              {/* Fees & Minimums */}
              <Section title="Fees & Minimums" icon={IndianRupee}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Min. Order Amount</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.textHint }}>₹</span>
                      <input
                        className="input-field"
                        style={inputPrefixedStyle}
                        type="number"
                        min={0}
                        placeholder="0"
                        {...register("minimum_order_amount")}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Delivery Fee</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.textHint }}>₹</span>
                      <input
                        className="input-field"
                        style={inputPrefixedStyle}
                        type="number"
                        min={0}
                        step="0.50"
                        placeholder="0"
                        {...register("delivery_fee")}
                      />
                    </div>
                  </div>
                </div>
              </Section>

              {/* Currency */}
              <Section title="Currency" icon={IndianRupee}>
                <label style={labelStyle}>Display Currency</label>
                <select
                  className="select-field"
                  style={{ ...inputStyle, cursor: "pointer" }}
                  {...register("currency")}
                >
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                </select>
              </Section>

              {/* Submit button */}
              <div style={{ paddingTop: 6 }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="save-btn"
                  style={{
                    width: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                    padding: "15px 28px",
                    background: T.primary, color: "white",
                    fontSize: 14, fontWeight: 700,
                    borderRadius: 16, border: "none", cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "'Inter', sans-serif",
                    boxShadow: "0 8px 24px rgba(26,107,58,0.25)",
                    opacity: saving ? 0.7 : 1,
                    transition: "background 0.15s, opacity 0.15s",
                  }}
                >
                  {saving
                    ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                    : <Save size={18} />}
                  {saving ? "Saving Changes…" : "Update & Return"}
                </button>
              </div>

            </form>
          </main>
        </div>

        {/* ── Floating unsaved-changes bar ── */}
        {isDirty && (
          <div style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            width: "90%", maxWidth: 560,
            background: "#111827", color: "white",
            padding: "14px 18px", borderRadius: 18,
            boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            animation: "slideUp 0.25s ease",
            zIndex: 100,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
                display: "inline-block", animation: "pulse 2s infinite",
              }} />
              <p style={{ fontSize: 13, fontWeight: 500 }}>Unsaved changes detected</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => reset()}
                style={{
                  padding: "7px 14px", fontSize: 12, fontWeight: 700,
                  color: "#9ca3af", background: "none", border: "none",
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                Discard
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={saving}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 18px", fontSize: 12, fontWeight: 700,
                  background: T.primary, color: "white",
                  borderRadius: 10, border: "none", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {saving
                  ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                  : <Check size={11} />}
                Save & Go
              </button>
            </div>
          </div>
        )}
      </RestaurantLayout>
    </>
  );
}