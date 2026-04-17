import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { getRestaurant, updateRestaurant } from "../../../services/api";
import OnboardingLayout from "../../../components/OnboardingLayout";
import { Loader2, ArrowRight } from "lucide-react";

const BUSINESS_TYPES = [
  { value: "dine_in",  label: "Dine-In",  emoji: "🍽️" },
  { value: "takeaway", label: "Takeaway", emoji: "🥡" },
  { value: "delivery", label: "Delivery", emoji: "🛵" },
];

export default function BasicInfoStep() {
  const router = useRouter();
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [selected, setSelected] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { name: "", owner_name: "", phone: "", city: "", business_type: [] }
  });

  const loadData = useCallback(async () => {
    // ✅ SSR guard — localStorage server pe exist nahi karta
    if (typeof window === "undefined") return;

    const id    = localStorage.getItem("restaurant_id");
    const token = localStorage.getItem("token");

    console.log("🔍 restaurant_id:", id);
    console.log("🔍 token:", token ? "EXISTS" : "MISSING");

    if (!id || !token) {
      console.warn("❌ Missing id or token — redirecting to login");
      router.replace("/restaurant/login");
      return;
    }

    try {
      const res  = await getRestaurant(id);
      const data = res.data;

      if (data.business_type && typeof data.business_type === "string") {
        data.business_type = data.business_type.split(",").map(s => s.trim());
      } else if (!data.business_type) {
        data.business_type = [];
      }

      setSelected(data.business_type || []);
      reset(data);
    } catch (err) {
      console.error("❌ getRestaurant failed:", err.response?.status, err.response?.data);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        router.replace("/restaurant/login");
      } else {
        toast.error("Failed to load restaurant data.");
      }
    } finally {
      setFetching(false);
    }
  }, [reset, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleType = (value) => {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const onSubmit = async (data) => {
    if (selected.length === 0) {
      toast.error("Please select at least one Business Type");
      return;
    }
    setLoading(true);
    const id = localStorage.getItem("restaurant_id");
    try {
      await updateRestaurant(id, {
        name:          data.name,
        owner_name:    data.owner_name,
        phone:         data.phone,
        city:          data.city,
        business_type: selected.join(","),
      });
      toast.success("Basic info saved!");
      await router.push("/restaurant/onboarding/operations");
    } catch (err) {
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

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }

    .bi-wrap { font-family: 'Inter', sans-serif; animation: fadeUp 0.4s ease both; }

    .bi-card {
      background: white; border-radius: 22px;
      border: 1.5px solid #dceee3;
      box-shadow: 0 4px 24px rgba(26,107,58,0.07);
      padding: 32px;
    }

    .bi-section-label {
      font-size: 9px; font-weight: 800; color: #9dbeaa;
      text-transform: uppercase; letter-spacing: 0.16em;
      margin-bottom: 14px;
      display: flex; align-items: center; gap: 8px;
    }
    .bi-section-label::after {
      content: ''; flex: 1; height: 1px; background: #edf6f0;
    }

    .bi-field-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;
    }
    @media (max-width: 560px) { .bi-field-row { grid-template-columns: 1fr; } }

    .bi-label {
      display: block; font-size: 9px; font-weight: 800;
      color: #9dbeaa; text-transform: uppercase;
      letter-spacing: 0.16em; margin-bottom: 7px; margin-left: 2px;
    }

    .bi-input {
      width: 100%; padding: 11px 16px;
      background: #f4faf6; border: 1.5px solid #dceee3;
      border-radius: 12px; font-size: 14px; color: #111827;
      font-family: 'Inter', sans-serif; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .bi-input::placeholder { color: #b8d8c4; }
    .bi-input:focus { border-color: #1a6b3a; box-shadow: 0 0 0 3px rgba(26,107,58,0.10); }

    .bi-error {
      font-size: 10px; font-weight: 700; color: #e11d48;
      margin-top: 5px; margin-left: 2px; font-style: italic;
    }

    .bi-type-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
      margin-bottom: 4px;
    }
    @media (max-width: 480px) { .bi-type-grid { grid-template-columns: 1fr; } }

    .bi-type-btn {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 8px;
      padding: 18px 12px; border-radius: 16px;
      border: 1.5px solid #dceee3;
      background: #f4faf6; cursor: pointer;
      transition: border-color 0.15s, background 0.15s, transform 0.12s, box-shadow 0.15s;
      user-select: none;
    }
    .bi-type-btn:hover { border-color: #1a6b3a; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(26,107,58,0.10); }
    .bi-type-btn.selected {
      border-color: #1a6b3a; background: #e6f4ec;
      box-shadow: 0 4px 14px rgba(26,107,58,0.14);
    }

    .bi-type-emoji { font-size: 24px; line-height: 1; }
    .bi-type-label { font-size: 12px; font-weight: 700; color: #4a7a58; }
    .bi-type-btn.selected .bi-type-label { color: #1a6b3a; }

    .bi-type-check {
      width: 18px; height: 18px; border-radius: 50%;
      border: 2px solid #dceee3;
      display: flex; align-items: center; justify-content: center;
      background: white; flex-shrink: 0;
      font-size: 10px; transition: background 0.15s, border-color 0.15s;
    }
    .bi-type-btn.selected .bi-type-check {
      background: #1a6b3a; border-color: #1a6b3a; color: white;
    }

    .bi-submit-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 13px 28px; border-radius: 14px;
      background: linear-gradient(135deg, #1a6b3a, #22a855);
      border: none; font-size: 14px; font-weight: 700; color: white;
      font-family: 'Inter', sans-serif; cursor: pointer;
      box-shadow: 0 6px 20px rgba(26,107,58,0.28);
      transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
    }
    .bi-submit-btn:hover:not(:disabled) {
      transform: translateY(-1px); box-shadow: 0 10px 28px rgba(26,107,58,0.35);
    }
    .bi-submit-btn:active:not(:disabled) { transform: scale(0.98); }
    .bi-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
  `;

  if (fetching) return (
    <OnboardingLayout currentStep="basic-info">
      <style>{styles}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
        <Loader2 size={28} color="#1a6b3a" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    </OnboardingLayout>
  );

  return (
    <OnboardingLayout
      currentStep="basic-info"
      title="Tell us about your restaurant"
      subtitle="This is the basic info customers will see."
    >
      <style>{styles}</style>
      <div className="bi-wrap">
        <div className="bi-card">
          <form onSubmit={handleSubmit(onSubmit)}>

            <p className="bi-section-label">Restaurant details</p>
            <div className="bi-field-row">
              <div>
                <label className="bi-label">Restaurant Name</label>
                <input className="bi-input" placeholder="e.g. Spice Garden"
                  {...register("name", { required: "Name is required" })} />
                {errors.name && <p className="bi-error">{errors.name.message}</p>}
              </div>
              <div>
                <label className="bi-label">Owner Name</label>
                <input className="bi-input" placeholder="e.g. Rahul Sharma"
                  {...register("owner_name", { required: "Owner name is required" })} />
                {errors.owner_name && <p className="bi-error">{errors.owner_name.message}</p>}
              </div>
            </div>

            <div className="bi-field-row" style={{ marginBottom: 24 }}>
              <div>
                <label className="bi-label">Phone Number</label>
                <input className="bi-input" placeholder="+91 98765 43210"
                  {...register("phone", { required: "Phone is required" })} />
                {errors.phone && <p className="bi-error">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="bi-label">City</label>
                <input className="bi-input" placeholder="e.g. Mumbai"
                  {...register("city", { required: "City is required" })} />
                {errors.city && <p className="bi-error">{errors.city.message}</p>}
              </div>
            </div>

            <p className="bi-section-label">Business type</p>
            <div className="bi-type-grid" style={{ marginBottom: 24 }}>
              {BUSINESS_TYPES.map((t) => {
                const isSelected = selected.includes(t.value);
                return (
                  <div
                    key={t.value}
                    className={`bi-type-btn${isSelected ? " selected" : ""}`}
                    onClick={() => toggleType(t.value)}
                  >
                    <span className="bi-type-emoji">{t.emoji}</span>
                    <span className="bi-type-label">{t.label}</span>
                    <div className="bi-type-check">
                      {isSelected && <span>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {selected.length === 0 && (
              <p className="bi-error" style={{ marginBottom: 14, marginTop: -16 }}>
                Select at least one business type
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1.5px solid #edf6f0", paddingTop: 20 }}>
              <button type="submit" disabled={loading} className="bi-submit-btn">
                {loading
                  ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
                  : <><span>Save & Continue</span><ArrowRight size={15} /></>
                }
              </button>
            </div>

          </form>
        </div>
      </div>
    </OnboardingLayout>
  );
}