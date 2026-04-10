import { UtensilsCrossed } from "lucide-react";
import OnboardingStepper from "./OnboardingStepper";
import { useRouter } from "next/router"; // 1. Router import karo

export default function OnboardingLayout({ children, currentStep, title, subtitle }) {
  const router = useRouter();

  // 2. Check karo ki kya current page "edit" wala hai
  const isEditPage = router.pathname.includes("/edit/");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center bg-orange-500">
            <UtensilsCrossed className="text-white" size={18} />
          </div>
          <span className="font-display font-bold text-gray-900">
            {isEditPage ? "Restaurant Dashboard" : "Restaurant Setup"}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        
        {/* 3. Stepper ko condition mein wrap karo - Edit page par nahi dikhega */}
        {!isEditPage && (
          <div className="mb-8">
            <OnboardingStepper currentStep={currentStep} />
          </div>
        )}

        {/* Step header */}
        {title && (
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
          </div>
        )}
  
        {/* Content */}
        {children}
      </div>
    </div>
  );
}