import { CheckCircle2, XCircle, Rocket } from "lucide-react";

export default function GoLiveChecklist({ checkData }) {
  if (!checkData) return null;

  const checks = [
    { key: "basic_info", label: "Basic restaurant info", done: checkData.basic_info },
    { key: "operations", label: "Operational settings", done: checkData.operations },
    { key: "menu", label: "Menu (items or upload)", done: checkData.menu },
    { key: "order_settings", label: "Order & payment settings", done: checkData.order_settings },
  ];

  return (
    <div className={`rounded-2xl border-2 p-5 transition-all
      ${checkData.ready_for_launch
        ? "border-green-300 bg-green-50"
        : "border-orange-200 bg-orange-50"}
    `}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center
          ${checkData.ready_for_launch ? "bg-green-500" : "bg-orange-400"}
        `}>
          <Rocket size={18} className="text-white" />
        </div>
        <div>
          <p className={`font-display font-bold text-lg
            ${checkData.ready_for_launch ? "text-green-800" : "text-orange-800"}
          `}>
            {checkData.ready_for_launch ? "Ready to Go Live! 🎉" : "Almost there..."}
          </p>
          <p className={`text-xs ${checkData.ready_for_launch ? "text-green-600" : "text-orange-600"}`}>
            {checkData.ready_for_launch
              ? "Your restaurant is set up and ready to accept orders"
              : "Complete the items below to launch"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {checks.map((c) => (
          <div key={c.key} className="flex items-center gap-3">
            {c.done
              ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              : <XCircle size={18} className="text-orange-400 shrink-0" />}
            <span className={`text-sm ${c.done ? "text-gray-700" : "text-orange-700 font-medium"}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
