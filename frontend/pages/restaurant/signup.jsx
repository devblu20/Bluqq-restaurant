import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { signup } from "../../services/api";
import { UtensilsCrossed, Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await signup(data);
      
      // Token aur ID save karein
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("restaurant_id", res.data.restaurant_id);
      
      toast.success("Account created! Let's set up your restaurant.");
      router.push("/restaurant/onboarding/basic-info"); // Redirect to next step
    } catch (err) {
      // --- Error Handling Fix ---
      const errorDetail = err.response?.data?.detail;

      if (Array.isArray(errorDetail)) {
        // Agar FastAPI validation error object bhejta hai
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <UtensilsCrossed className="text-white" size={28} />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900 leading-tight">Create your restaurant</h1>
          <p className="text-gray-500 text-sm mt-1">Get set up for WhatsApp ordering in minutes</p>
        </div>

        {/* Signup Form Card */}
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-orange-100/50">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Restaurant Name</label>
                <input
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                  placeholder="e.g. Spice Garden"
                  {...register("name", { required: "Restaurant name is required" })}
                />
                {errors.name && <p className="text-red-500 text-[10px] mt-1 ml-1 font-bold italic">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Owner Name</label>
                <input
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                  placeholder="Your Name"
                  {...register("owner_name", { required: "Owner name is required" })}
                />
                {errors.owner_name && <p className="text-red-500 text-[10px] mt-1 ml-1 font-bold italic">{errors.owner_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Email Address</label>
              <input
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                type="email"
                placeholder="owner@restaurant.com"
                {...register("email", { 
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" }
                })}
              />
              {errors.email && <p className="text-red-500 text-[10px] mt-1 ml-1 font-bold italic">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Phone Number</label>
                <input
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                  placeholder="+91 98765 43210"
                  {...register("phone", { required: "Phone number is required" })}
                />
                {errors.phone && <p className="text-red-500 text-[10px] mt-1 ml-1 font-bold italic">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">City</label>
                <input
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                  placeholder="Mumbai"
                  {...register("city", { required: "City is required" })}
                />
                {errors.city && <p className="text-red-500 text-[10px] mt-1 ml-1 font-bold italic">{errors.city.message}</p>}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Password</label>
              <input
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                type="password"
                placeholder="Min. 8 characters"
                {...register("password", { 
                  required: "Password is required", 
                  minLength: { value: 8, message: "At least 8 characters" } 
                })}
              />
              {errors.password && <p className="text-red-500 text-[10px] mt-1 ml-1 font-bold italic">{errors.password.message}</p>}
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 mt-4 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Setting up...</span>
                </>
              ) : (
                "Create Account & Continue"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6 font-medium">
            Already have an account?{" "}
            <Link href="/restaurant/login" className="text-brand-600 font-bold hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}