import { UtensilsCrossed } from "lucide-react";
import OnboardingStepper from "./OnboardingStepper";
import { useRouter } from "next/router";

export default function OnboardingLayout({ children, currentStep, title, subtitle }) {
  const router = useRouter();

  // Check if the current page is an "edit" page
  const isEditPage = router.pathname.includes("/edit/");

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #eef5f0 0%, #f2f9f4 100%)", fontFamily: "'Inter', sans-serif" }}>

      {/* Top bar */}
      <header style={{ background: "#ffffff", borderBottom: "1.5px solid #dceee3" }}>
        <div style={{ maxWidth: 672, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "#1a6b3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UtensilsCrossed size={18} color="white" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
            {isEditPage ? "Restaurant Dashboard" : "Restaurant Setup"}
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 672, margin: "0 auto", padding: "32px 24px" }}>

        {/* Stepper — hidden on edit pages */}
        {!isEditPage && (
          <div style={{ marginBottom: 32 }}>
            <OnboardingStepper currentStep={currentStep} />
          </div>
        )}

        {/* Step header */}
        {title && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 13, color: "#6aad7a", marginTop: 4, fontWeight: 500 }}>{subtitle}</p>}
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );
}