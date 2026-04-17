import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import RestaurantLayout from "../../../components/OnboardingLayout";
import { getMe, getRestaurant, updateRestaurant } from "../../../services/api";
import { Loader2, Store, MapPin, Phone, Mail, Save, UtensilsCrossed, ChevronLeft } from "lucide-react";

const BUSINESS_TYPES = [
  { value: "dine_in",  label: "Dine-In",  emoji: "🍽️" },
  { value: "takeaway", label: "Takeaway",  emoji: "🥡" },
  { value: "delivery", label: "Delivery",  emoji: "🛵" },
];

export default function EditBasicInfoPage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [fetching,   setFetching]   = useState(true);
  const [saving,     setSaving]     = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const id    = localStorage.getItem("restaurant_id");
    if (!token || !id) { router.replace("/restaurant/login"); return; }

    Promise.all([getMe(), getRestaurant(id)])
      .then(([meRes, restRes]) => {
        setRestaurant(meRes.data);
        const formData = { ...restRes.data };
        if (formData.business_type && typeof formData.business_type === "string") {
          formData.business_type = formData.business_type.split(",").filter(Boolean);
        } else if (!formData.business_type) {
          formData.business_type = [];
        }
        reset(formData);
      })
      .catch(() => {
        toast.error("Session expired. Please login again.");
        router.replace("/restaurant/login");
      })
      .finally(() => setFetching(false));
  }, [reset, router]);

  const onSubmit = async (data) => {
    setSaving(true);
    const id = localStorage.getItem("restaurant_id");
    try {
      const payload = {
        ...data,
        business_type: Array.isArray(data.business_type)
          ? data.business_type.join(",")
          : data.business_type,
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

  /* ── Loader ── */
  if (fetching) return (
    <div style={{ minHeight: "100vh", background: "#eef5f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <UtensilsCrossed size={22} color="white" />
        </div>
        <Loader2 size={24} color="#1a6b3a" style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "#6aad7a", fontWeight: 600 }}>Loading profile…</p>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Restaurant Profile | Edit</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #eef5f0; font-family: 'Inter', sans-serif; }
          @keyframes spin { to { transform: rotate(360deg); } }

          /* ── Input base ── */
          .field-input {
            width: 100%;
            padding: 11px 14px;
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            font-weight: 500;
            color: #1a2e1f;
            background: #f4faf6;
            border: 1.5px solid #cde8d6;
            border-radius: 12px;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          }
          .field-input::placeholder { color: #9dbeaa; font-weight: 400; }
          .field-input:focus {
            border-color: #1a6b3a;
            background: #fff;
            box-shadow: 0 0 0 3px rgba(26,107,58,0.1);
          }
          .field-input.has-icon { padding-left: 42px; }
          .field-input.error { border-color: #ef4444; background: #fff8f8; }
          .field-input.error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }

          /* ── Business type checkboxes ── */
          .biz-label {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
            border-radius: 14px;
            border: 1.5px solid #cde8d6;
            background: #f4faf6;
            cursor: pointer;
            transition: all 0.15s;
            user-select: none;
          }
          .biz-label:hover { border-color: #1a6b3a; background: #e6f4ec; }
          .biz-label.checked {
            border-color: #1a6b3a;
            background: #e6f4ec;
            box-shadow:  0 3px rgba(26,107,58,0.08);
          }
          .biz-checkbox {
            width: 18px; height: 18px;
            accent-color: #1a6b3a;
            border-radius: 5px;
            flex-shrink: 0;
          }

          /* ── Save button ── */
          .save-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 15px;
            border-radius: 16px;
            background: linear-gradient(135deg, #1a6b3a 0%, #22a855 100%);
            color: white;
            font-size: 15px;
            font-weight: 700;
            font-family: 'Inter', sans-serif;
            border: none;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(26,107,58,0.25);
            transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          }
          .save-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 12px 32px rgba(26,107,58,0.32);
          }
          .save-btn:active:not(:disabled) { transform: translateY(0); }
          .save-btn:disabled { opacity: 0.65; cursor: not-allowed; }

          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #b8d8c4; border-radius: 4px; }
        `}</style>
      </Head>

      <RestaurantLayout restaurant={restaurant} onLogout={handleLogout}>
        <main style={{ maxWidth: 760, margin: "0 auto", padding: "36px 32px 60px" }}>

          {/* ── Page Header ── */}
          <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: "1.5px solid #dceee3" }}>
            <button
              onClick={() => router.push("/restaurant/dashboard")}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6aad7a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", marginBottom: 14, padding: 0, fontFamily: "'Inter', sans-serif" }}
            >
              <ChevronLeft size={15} /> Back to Dashboard
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Store size={18} color="white" />
              </div>
              
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                Restaurant Identity
              </h1>
            </div>
            <p style={{ fontSize: 14, color: "#6aad7a", fontWeight: 500, marginLeft: 48 }}>
              Manage your basic details, contact info, and store location.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── Section 1: Basic Details ── */}
            <Card title="Basic Details" icon={Store}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                <FieldWrap label="Restaurant Name" required error={errors.name?.message}>
                  <input
                    className={`field-input${errors.name ? " error" : ""}`}
                    placeholder="e.g. Spice Garden"
                    {...register("name", { required: "Restaurant name is required" })}
                  />
                </FieldWrap>

                <FieldWrap label="Owner Name" required error={errors.owner_name?.message}>
                  <input
                    className={`field-input${errors.owner_name ? " error" : ""}`}
                    placeholder="e.g. Rahul Sharma"
                    {...register("owner_name", { required: "Owner name is required" })}
                  />
                </FieldWrap>

                <div style={{ gridColumn: "1 / -1" }}>
                  <FieldWrap label="Description" hint="Shown on your digital menu">
                    <input
                      className="field-input"
                      placeholder="Short tagline or about your restaurant"
                      {...register("description")}
                    />
                  </FieldWrap>
                </div>

                {/* Business Type */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <FieldWrap label="Business Type" hint="Multiple selections allowed" error={errors.business_type?.message}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 4 }}>
                      {BUSINESS_TYPES.map((t) => {
                        const field = register("business_type", { required: "Select at least one" });
                        return (
                          <label key={t.value} className="biz-label">
                            <input
                              type="checkbox"
                              value={t.value}
                              className="biz-checkbox"
                              {...field}
                            />
                            <span style={{ fontSize: 18 }}>{t.emoji}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2e1f" }}>{t.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </FieldWrap>
                </div>

              </div>
            </Card>

            {/* ── Section 2: Contact ── */}
            <Card title="Contact Information" icon={Phone}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                <FieldWrap label="Email Address" required error={errors.email?.message}>
                  <div style={{ position: "relative" }}>
                    <Mail size={16} color="#9dbeaa" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      className={`field-input has-icon${errors.email ? " error" : ""}`}
                      type="email"
                      placeholder="restaurant@email.com"
                      {...register("email", {
                        required: "Email is required",
                        pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" },
                      })}
                    />
                  </div>
                </FieldWrap>

                <FieldWrap label="Phone Number" required error={errors.phone?.message}>
                  <div style={{ position: "relative" }}>
                    <Phone size={16} color="#9dbeaa" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      className={`field-input has-icon${errors.phone ? " error" : ""}`}
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      {...register("phone", { required: "Phone number is required" })}
                    />
                  </div>
                </FieldWrap>

              </div>
            </Card>

            {/* ── Section 3: Location ── */}
            <Card title="Store Location" icon={MapPin}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                <FieldWrap label="City" required error={errors.city?.message}>
                  <input
                    className={`field-input${errors.city ? " error" : ""}`}
                    placeholder="e.g. Mandsaur"
                    {...register("city", { required: "City is required" })}
                  />
                </FieldWrap>

                <FieldWrap label="Full Address">
                  <input
                    className="field-input"
                    placeholder="Street, locality, landmark…"
                    {...register("address")}
                  />
                </FieldWrap>

              </div>
            </Card>

            {/* ── Submit ── */}
            <div style={{ paddingTop: 8 }}>
              <button type="submit" disabled={saving} className="save-btn">
                {saving ? (
                  <>
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                    Saving Changes…
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Update Information
                  </>
                )}
              </button>
              <p style={{ textAlign: "center", fontSize: 12, color: "#9dbeaa", marginTop: 12 }}>
                Changes reflect on your digital menu immediately.
              </p>
            </div>

          </form>
        </main>
      </RestaurantLayout>
    </>
  );
}

/* ── Sub-components ── */

function Card({ title, icon: Icon, children }) {
  return (
    <div style={{
      background: "white",
      borderRadius: 20,
      padding: "24px 24px",
      border: "1.5px solid #dceee3",
      boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
    }}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: "1.5px solid #edf6f0" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "#f2f9f4", border: "1.5px solid #dceee3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color="#1a6b3a" />
        </div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FieldWrap({ label, required, hint, error, children }) {
  return (
    <div style={{ width: "100%" }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4a7a58", marginBottom: 7, letterSpacing: "0.01em" }}>
        {label}
        {required && <span style={{ color: "#1a6b3a", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <p style={{ fontSize: 11, color: "#9dbeaa", marginTop: 5 }}>{hint}</p>
      )}
      {error && (
        <p style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, marginTop: 5 }}>{error}</p>
      )}
    </div>
  );
}