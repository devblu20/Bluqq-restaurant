import { CheckCircle2, XCircle, Rocket, Zap } from "lucide-react";

export default function GoLiveChecklist({ checkData }) {
  if (!checkData) return null;

  const checks = [
    { key: "basic_info",      label: "Basic restaurant info" ,      done: checkData.basic_info },
    { key: "operations",      label: "Operational settings",        done: checkData.operations },
    { key: "menu",            label: "Menu (items or upload)",      done: checkData.menu },
    { key: "order_settings",  label: "Order & payment settings",    done: checkData.order_settings },
  ];

  const isLive = checkData.ready_for_launch;

  return (
    <div style={{
      background: isLive ? "#f4faf6" : "white",
      border: `1.5px solid ${isLive ? "#cde8d6" : "#dceee3"}`,
      borderRadius: 22,
      padding: "24px 26px",
      boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          background: isLive ? "#1a6b3a" : "#e6f4ec",
          border: `1.5px solid ${isLive ? "#1a6b3a" : "#cde8d6"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: isLive ? "0 4px 14px rgba(26,107,58,0.25)" : "none",
        }}>
          <Rocket size={18} color={isLive ? "white" : "#1a6b3a"} />
        </div>
        <div>
          <p style={{
            fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em",
            color: "#111827", marginBottom: 3,
          }}>
            {isLive ? "Ready to Go Live! 🎉" : "Almost there..."}
          </p>
          <p style={{ fontSize: 12, color: "#9dbeaa", fontWeight: 500 }}>
            {isLive
              ? "Your restaurant is set up and ready to accept orders"
              : "Complete the items below to launch"}
          </p>
        </div>
        {isLive && (
          <span style={{
            marginLeft: "auto", fontSize: 10, fontWeight: 700,
            color: "#1a6b3a", background: "#e6f4ec",
            padding: "4px 12px", borderRadius: 999,
            border: "1.5px solid #cde8d6", whiteSpace: "nowrap",
          }}>
            Ready ✓
          </span>
        )}
      </div>

      {/* Checklist items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {checks.map((c) => (
          <div key={c.key} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "11px 14px", borderRadius: 14,
            background: c.done ? "#f4faf6" : "#fafafa",
            border: `1.5px solid ${c.done ? "#cde8d6" : "#f0ece8"}`,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: c.done ? "#1a6b3a" : "transparent",
              border: c.done ? "none" : "2px solid #d4d0ca",
              boxShadow: c.done ? "0 2px 8px rgba(26,107,58,0.25)" : "none",
            }}>
              {c.done && <CheckCircle2 size={13} color="white" strokeWidth={2.5} />}
            </div>
            <span style={{
              flex: 1, fontSize: 13,
              fontWeight: c.done ? 600 : 500,
              color: c.done ? "#1a2e1f" : "#b0a898",
            }}>
              {c.label}
            </span>
            {c.done && <Zap size={12} color="#1a6b3a" fill="#1a6b3a" style={{ flexShrink: 0 }} />}
            {!c.done && (
              <XCircle size={14} color="#d4d0ca" style={{ flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}