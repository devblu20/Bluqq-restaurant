javascriptreact
import { Check } from "lucide-react";

const STEPS = [
  { key: "basic-info", label: "Basic Info" },
  { key: "operations", label: "Operations" },
  { key: "order-settings", label: "Settings" },
  { key: "menu", label: "Menu" },
];

export default function OnboardingStepper({ currentStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const progressPct = ((currentIndex + 1) / STEPS.length) * 100;

  return (
    <div style={{ width: "100%" }}>

      {/* ── Mobile: step X of Y label ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}
        className="stepper-mobile-label">
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
          Step {currentIndex + 1} of {STEPS.length}
        </span>
        <span style={{ fontSize: 13, color: "#6aad7a", fontWeight: 500 }}>
          {STEPS[currentIndex]?.label}
        </span>
      </div>

      {/* ── Desktop: full stepper ── */}
      <div style={{ display: "flex", alignItems: "center", width: "100%" }}
        className="stepper-desktop">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;

          const circleBg = done || active ? "#1a6b3a" : "#f2f9f4";
          const circleColor = done || active ? "white" : "#9dbeaa";
          const circleBorder = active ? "4px solid #b8dfc7" : done || active ? "none" : "1.5px solid #dceee3";

          const labelColor = active ? "#1a6b3a" : done ? "#4a7a58" : "#9dbeaa";

          return (
            <div key={step.key} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: circleBg, color: circleColor,
                  border: circleBorder,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800,
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}>
                  {done ? <Check size={16} /> : i + 1}
                </div>
                <span style={{
                  marginTop: 6, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                  color: labelColor, transition: "color 0.2s",
                }}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: "0 8px", marginBottom: 20, borderRadius: 4,
                  background: i < currentIndex ? "#1a6b3a" : "#dceee3",
                  transition: "background 0.3s",
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Mobile: progress bar ── */}
      <div style={{ width: "100%", background: "#dceee3", borderRadius: 999, height: 6, marginTop: 4 }}
        className="stepper-mobile-bar">
        <div style={{
          width: `${progressPct}%`, height: 6, borderRadius: 999,
          background: "#1a6b3a", transition: "width 0.5s ease",
        }} />
      </div>

      {/* Responsive visibility handled via a small style block */}
      <style>{`
        @media (min-width: 640px) {
          .stepper-mobile-label { display: none !important; }
          .stepper-mobile-bar   { display: none !important; }
          .stepper-desktop      { display: flex !important; }
        }
        @media (max-width: 639px) {
          .stepper-desktop { display: none !important; }
        }
      `}</style>
    </div>
  );
}

