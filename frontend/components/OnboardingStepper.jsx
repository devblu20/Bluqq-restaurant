import { Check } from "lucide-react";

const STEPS = [
  { key: "basic-info", label: "Basic Info" },
  { key: "operations", label: "Operations" },
  { key: "menu", label: "Menu" },
  { key: "order-settings", label: "Settings" },
];

export default function OnboardingStepper({ currentStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="w-full">
      {/* Mobile: just show step X of Y */}
      <div className="sm:hidden flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-700">
          Step {currentIndex + 1} of {STEPS.length}
        </span>
        <span className="text-sm text-gray-500">{STEPS[currentIndex]?.label}</span>
      </div>

      {/* Desktop stepper */}
      <div className="hidden sm:flex items-center w-full">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${done ? "bg-brand-500 text-white" : ""}
                    ${active ? "bg-brand-500 text-white ring-4 ring-brand-100" : ""}
                    ${!done && !active ? "bg-gray-100 text-gray-400" : ""}
                  `}
                >
                  {done ? <Check size={16} /> : i + 1}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium whitespace-nowrap
                    ${active ? "text-brand-600" : done ? "text-gray-600" : "text-gray-400"}
                  `}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-5 rounded transition-all
                    ${i < currentIndex ? "bg-brand-400" : "bg-gray-200"}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar (mobile) */}
      <div className="sm:hidden w-full bg-gray-200 rounded-full h-1.5 mt-1">
        <div
          className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
