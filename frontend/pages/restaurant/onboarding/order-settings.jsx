import { useState } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import Head from "next/head";
import toast from "react-hot-toast";
import { createOrderSettings } from "../../../services/api";
import OnboardingLayout from "../../../components/OnboardingLayout";
import { Loader2, CreditCard, Receipt, BadgeDollarSign, Coins } from "lucide-react";

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

          .ops-input {
            font-family: 'Inter', sans-serif; font-size: 13px; color: #111827;
            width: 100%; padding: 11px 14px;
            background: #f8fbf9; border: 1.5px solid #dceee3; border-radius: 12px;
            outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          }
          .ops-input:focus { border-color: #1a6b3a; box-shadow: 0 0 0 3px rgba(26,107,58,0.1); }
          .ops-input::placeholder { color: #b8d8c4; }

          .toggle-card {
            display: flex; align-items: flex-start; gap: 14px;
            padding: 16px 18px; border-radius: 16px; cursor: pointer;
            border: 1.5px solid #dceee3; background: white;
            transition: border-color 0.15s, background 0.15s;
          }
          .toggle-card:hover { border-color: #1a6b3a; background: #f4faf6; }
          .toggle-card input[type="checkbox"] {
            width: 17px; height: 17px; accent-color: #1a6b3a;
            cursor: pointer; flex-shrink: 0; margin-top: 1px;
          }

          .section-label {
            font-size: 11px; font-weight: 800; color: #1a6b3a;
            text-transform: uppercase; letter-spacing: 0.12em;
            display: flex; align-items: center; gap: 7px;
            margin-bottom: 12px;
          }

          .sub-label {
            font-size: 11px; font-weight: 700; color: #6aad7a;
            text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;
          }

          .hint-text { font-size: 11px; color: #9dbeaa; margin-top: 6px; }

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

          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #b8d8c4; border-radius: 4px; }
        `}</style>
      </Head>

      <OnboardingLayout
        currentStep="order-settings"
        title="Configure order settings"
        subtitle="How do you want to accept and process orders?"
      >
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 120px", fontFamily: "'Inter', sans-serif" }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* ── Payment Methods ── */}
              <div style={{
                background: "white", borderRadius: 22, padding: "24px 26px",
                border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
              }}>
                <p className="section-label">
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "#e6f4ec", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CreditCard size={14} color="#1a6b3a" />
                  </span>
                  Payment Methods
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label className="toggle-card">
                    <input type="checkbox" {...register("cash_on_delivery_enabled")} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 3 }}>Cash on Delivery</p>
                      <p style={{ fontSize: 11, color: "#9dbeaa" }}>Accept cash when order is delivered</p>
                    </div>
                  </label>
                  <label className="toggle-card">
                    <input type="checkbox" {...register("upi_enabled")} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 3 }}>UPI / Manual Transfer</p>
                      <p style={{ fontSize: 11, color: "#9dbeaa" }}>Share UPI ID or bank details</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* ── Tax Settings ── */}
              <div style={{
                background: "white", borderRadius: 22, padding: "24px 26px",
                border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
              }}>
                <p className="section-label">
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "#e6f4ec", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Receipt size={14} color="#1a6b3a" />
                  </span>
                  Tax Settings
                </p>
                <label className="toggle-card" style={{ width: "100%" }}>
                  <input type="checkbox" {...register("tax_included")} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 3 }}>Prices are tax-inclusive</p>
                    <p style={{ fontSize: 11, color: "#9dbeaa" }}>Menu prices already include GST / applicable taxes</p>
                  </div>
                </label>
              </div>

              {/* ── Min Order & Delivery Fee ── */}
              <div style={{
                background: "white", borderRadius: 22, padding: "24px 26px",
                border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
              }}>
                <p className="section-label">
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "#e6f4ec", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <BadgeDollarSign size={14} color="#1a6b3a" />
                  </span>
                  Amounts & Fees
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <p className="sub-label">Minimum Order Amount (₹)</p>
                    <input
                      type="number"
                      className="ops-input"
                      min={0}
                      placeholder="0"
                      {...register("minimum_order_amount")}
                    />
                    <p className="hint-text">Set 0 for no minimum</p>
                  </div>
                  <div>
                    <p className="sub-label">Delivery Fee (₹)</p>
                    <input
                      type="number"
                      className="ops-input"
                      min={0}
                      step="0.50"
                      placeholder="0"
                      {...register("delivery_fee")}
                    />
                    <p className="hint-text">Set 0 for free delivery</p>
                  </div>
                </div>
              </div>

              {/* ── Currency ── */}
              <div style={{
                background: "white", borderRadius: 22, padding: "24px 26px",
                border: "1.5px solid #dceee3", boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
              }}>
                <p className="section-label">
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "#e6f4ec", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Coins size={14} color="#1a6b3a" />
                  </span>
                  Currency
                </p>
                <select className="ops-input" {...register("currency")}>
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                </select>
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
                {loading ? "Saving..." : "Finish Setup →"}
              </button>
            </div>
          </form>
        </div>
      </OnboardingLayout>
    </>
  );
}