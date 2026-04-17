import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { signup } from "../../services/api";
import { UtensilsCrossed, Loader2, ArrowRight, Flame } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await signup(data);
      // Save email so verify page can pre-fill it
      localStorage.setItem("pending_email", data.email);
      toast.success("Account created! Check your email for the code.");
      router.push("/restaurant/verify-email");
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        toast.error(errorDetail[0]?.msg || "Invalid input details");
      } else if (typeof errorDetail === "string") {
        toast.error(errorDetail);
      } else {
        toast.error("Signup failed. Please try again.");
      }
      console.error("Signup Error:", errorDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }

        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .signup-wrap {
          min-height: 100vh;
          background: #eef5f0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 16px;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .signup-wrap::before {
          content: '';
          position: fixed;
          top: -120px; left: -120px;
          width: 420px; height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(26,107,58,0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .signup-wrap::after {
          content: '';
          position: fixed;
          bottom: -80px; right: -80px;
          width: 340px; height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(26,107,58,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .signup-card {
          width: 100%;
          max-width: 540px;
          animation: fadeUp 0.5s ease both;
          position: relative;
          z-index: 1;
        }

        .signup-hero {
          background: linear-gradient(135deg, #0f3d20 0%, #1a6b3a 55%, #22a855 100%);
          border-radius: 24px 24px 0 0;
          padding: 34px 36px 30px;
          position: relative;
          overflow: hidden;
        }
        .signup-hero::before {
          content: '';
          position: absolute;
          top: -30px; right: -30px;
          width: 180px; height: 180px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
          pointer-events: none;
        }
        .signup-hero::after {
          content: '';
          position: absolute;
          bottom: -20px; right: 70px;
          width: 100px; height: 100px;
          border-radius: 50%;
          background: rgba(0,0,0,0.07);
          pointer-events: none;
        }

        .hero-logo {
          width: 50px; height: 50px;
          border-radius: 14px;
          background: rgba(255,255,255,0.15);
          border: 1.5px solid rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 9px; font-weight: 800;
          color: rgba(255,255,255,0.55);
          text-transform: uppercase; letter-spacing: 0.2em;
          margin-bottom: 10px;
        }
        .hero-title {
          font-size: 26px; font-weight: 800;
          color: white; letter-spacing: -0.025em;
          line-height: 1.1; margin-bottom: 6px;
        }
        .hero-sub {
          font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 500;
        }

        .hero-pills {
          display: flex; gap: 8px; flex-wrap: wrap;
          margin-top: 18px;
        }
        .hero-pill {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600;
          color: rgba(255,255,255,0.75);
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          padding: 5px 12px; border-radius: 999px;
        }

        .signup-body {
          background: white;
          border-radius: 0 0 24px 24px;
          padding: 30px 36px 34px;
          border: 1.5px solid #dceee3;
          border-top: none;
          box-shadow: 0 16px 48px rgba(26,107,58,0.12);
        }

        .section-label {
          font-size: 9px; font-weight: 800;
          color: #9dbeaa; text-transform: uppercase;
          letter-spacing: 0.16em;
          margin-bottom: 14px; margin-top: 4px;
          display: flex; align-items: center; gap: 8px;
        }
        .section-label::after {
          content: ''; flex: 1;
          height: 1px; background: #edf6f0;
        }

        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 480px) {
          .field-row { grid-template-columns: 1fr; }
          .signup-hero, .signup-body { padding-left: 22px; padding-right: 22px; }
        }

        .field-label {
          display: block;
          font-size: 9px; font-weight: 800;
          color: #9dbeaa; text-transform: uppercase;
          letter-spacing: 0.16em; margin-bottom: 7px; margin-left: 2px;
        }

        .field-input {
          width: 100%;
          padding: 11px 16px;
          background: #f4faf6;
          border: 1.5px solid #dceee3;
          border-radius: 12px;
          font-size: 14px; color: #111827;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-input::placeholder { color: #b8d8c4; }
        .field-input:focus {
          border-color: #1a6b3a;
          box-shadow: 0 0 0 3px rgba(26,107,58,0.10);
        }

        .field-error {
          font-size: 10px; font-weight: 700; color: #e11d48;
          margin-top: 5px; margin-left: 2px; font-style: italic;
        }

        .submit-btn {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px 20px;
          background: linear-gradient(135deg, #1a6b3a, #22a855);
          border: none; border-radius: 14px;
          font-size: 14px; font-weight: 700; color: white;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(26,107,58,0.28);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          margin-top: 6px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(26,107,58,0.35);
        }
        .submit-btn:active:not(:disabled) { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .divider { border: none; border-top: 1.5px solid #edf6f0; margin: 22px 0 18px; }

        .login-prompt {
          text-align: center;
          font-size: 13px; color: #9dbeaa; font-weight: 500;
        }
        .login-prompt a {
          color: #1a6b3a; font-weight: 700; text-decoration: none;
        }
        .login-prompt a:hover { text-decoration: underline; }
      `}</style>

      <div className="signup-wrap">
        <div className="signup-card">

          <div className="signup-hero">
            <div className="hero-badge">
              <Flame size={10} color="#fde047" />
              Restaurant OS
            </div>
            <div className="hero-logo">
              <UtensilsCrossed size={22} color="white" />
            </div>
            <h1 className="hero-title">Create your restaurant 🍽️</h1>
            <p className="hero-sub">Get set up for WhatsApp ordering in minutes</p>
            <div className="hero-pills">
              <span className="hero-pill">⚡ Quick setup</span>
              <span className="hero-pill">📱 WhatsApp orders</span>
              <span className="hero-pill">📊 Live analytics</span>
            </div>
          </div>

          <div className="signup-body">
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              <p className="section-label">Restaurant details</p>

              <div className="field-row">
                <div>
                  <label className="field-label">Restaurant Name</label>
                  <input
                    className="field-input"
                    placeholder="e.g. Spice Garden"
                    {...register("name", { required: "Restaurant name is required" })}
                  />
                  {errors.name && <p className="field-error">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="field-label">Owner Name</label>
                  <input
                    className="field-input"
                    placeholder="Your Name"
                    {...register("owner_name", { required: "Owner name is required" })}
                  />
                  {errors.owner_name && <p className="field-error">{errors.owner_name.message}</p>}
                </div>
              </div>

              <div className="field-row">
                <div>
                  <label className="field-label">Phone Number</label>
                  <input
                    className="field-input"
                    placeholder="+91 98765 43210"
                    {...register("phone", { required: "Phone number is required" })}
                  />
                  {errors.phone && <p className="field-error">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="field-label">City</label>
                  <input
                    className="field-input"
                    placeholder="Mumbai"
                    {...register("city", { required: "City is required" })}
                  />
                  {errors.city && <p className="field-error">{errors.city.message}</p>}
                </div>
              </div>

              <p className="section-label" style={{ marginTop: 4 }}>Account credentials</p>

              <div>
                <label className="field-label">Email Address</label>
                <input
                  className="field-input"
                  type="email"
                  placeholder="owner@restaurant.com"
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" }
                  })}
                />
                {errors.email && <p className="field-error">{errors.email.message}</p>}
              </div>

              <div>
                <label className="field-label">Password</label>
                <input
                  className="field-input"
                  type="password"
                  placeholder="Min. 8 characters"
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 8, message: "At least 8 characters" }
                  })}
                />
                {errors.password && <p className="field-error">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={loading} className="submit-btn" style={{ marginTop: 8 }}>
                {loading
                  ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Setting up...</>
                  : <><span>Create Account & Continue</span><ArrowRight size={15} /></>
                }
              </button>
            </form>

            <hr className="divider" />

            <p className="login-prompt">
              Already have an account?{" "}
              <Link href="/restaurant/login">Sign in here</Link>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}