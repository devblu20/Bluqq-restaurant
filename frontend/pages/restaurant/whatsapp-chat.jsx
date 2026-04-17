import { useEffect, useState } from "react";
import Link from "next/link";
import { useRestaurantAuth } from "../../hooks/useRestaurantAuth";
import {
  getWhatsAppConfig,
  updateWhatsAppConfig,
  simulateWhatsAppMessage,
} from "../../services/api";
import toast from "react-hot-toast";
import {
  Loader2,
  Save,
  MessageCircle,
  Send,
  ArrowLeft,
  Bot,
  User,
} from "lucide-react";

export default function WhatsAppChatPage() {
  const { restaurant, loading: authLoading, restaurantId } = useRestaurantAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const [config, setConfig] = useState({
    phone_number_id: "",
    access_token: "",
    verify_token: "",
    business_phone: "",
    is_active: false,
  });

  const [customerPhone, setCustomerPhone] = useState("+919999999999");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sendToWhatsApp, setSendToWhatsApp] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    getWhatsAppConfig(restaurantId)
      .then((res) => setConfig((prev) => ({ ...prev, ...res.data })))
      .catch(() => toast.error("Failed to load WhatsApp config"))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const handleSave = async () => {
    if (!restaurantId) return;
    setSaving(true);
    try {
      const res = await updateWhatsAppConfig(restaurantId, config);
      setConfig((prev) => ({ ...prev, ...res.data }));
      toast.success("WhatsApp config saved");
    } catch (err) {
      toast.error(err.message || "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!restaurantId) return;
    if (!customerPhone.trim() || !message.trim()) {
      toast.error("Phone and message are required");
      return;
    }
    setSending(true);
    try {
      const res = await simulateWhatsAppMessage(restaurantId, {
        customer_phone: customerPhone.trim(),
        message: message.trim(),
        send_to_whatsapp: sendToWhatsApp,
      });
      setMessages(res.data.recent_messages || []);
      setMessage("");
      if (sendToWhatsApp) {
        if (res.data.sent_to_whatsapp) {
          toast.success("Reply sent to customer WhatsApp");
        } else {
          const detail = res.data.meta_error
            ? String(res.data.meta_error).slice(0, 220)
            : "Check phone_number_id/access_token.";
          toast.error(`Could not send to WhatsApp. ${detail}`);
        }
      }
    } catch (err) {
      toast.error(err.message || "Chat failed");
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={styles.loadingScreen}>
        <Loader2 style={{ color: "#2d6a4f", animation: "spin 1s linear infinite" }} size={34} />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <Link href="/restaurant/dashboard" style={styles.backLink}>
              <ArrowLeft size={14} />
              Back
            </Link>
            <h1 style={styles.pageTitle}>
              <span style={styles.titleIcon}><MessageCircle size={22} /></span>
              WhatsApp AI Waiter
            </h1>
            <p style={styles.subtitle}>
              Configure your WhatsApp line and test AI waiter replies for{" "}
              <strong>{restaurant?.name}</strong>
            </p>
          </div>
          <button onClick={handleSave} disabled={saving} style={styles.primaryBtn}>
            {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
            Save Config
          </button>
        </div>

        {/* Two-column grid */}
        <div style={styles.grid}>

          {/* LEFT — Configuration */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={{ ...styles.cardDot, background: "#2d6a4f" }} />
              <h2 style={styles.cardTitle}>WhatsApp Configuration</h2>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Business Phone</label>
              <input
                style={styles.input}
                value={config.business_phone || ""}
                onChange={(e) => setConfig({ ...config, business_phone: e.target.value })}
                placeholder="+91..."
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Phone Number ID (Meta)</label>
              <input
                style={styles.input}
                value={config.phone_number_id || ""}
                onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
                placeholder="Meta phone_number_id"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Access Token</label>
              <input
                style={styles.input}
                value={config.access_token || ""}
                onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
                placeholder="Permanent token"
                type="password"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Verify Token</label>
              <input
                style={styles.input}
                value={config.verify_token || ""}
                onChange={(e) => setConfig({ ...config, verify_token: e.target.value })}
                placeholder="Webhook verify token"
              />
            </div>

            <label style={styles.checkboxRow}>
              <div style={{ ...styles.toggle, background: config.is_active ? "#2d6a4f" : "#d1d5db" }}>
                <input
                  type="checkbox"
                  checked={!!config.is_active}
                  onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                  style={{ display: "none" }}
                />
                <div style={{
                  ...styles.toggleKnob,
                  transform: config.is_active ? "translateX(20px)" : "translateX(2px)",
                }} />
              </div>
              <span style={styles.checkLabel}>Webhook replies active</span>
            </label>
          </div>

          {/* RIGHT — Chat Test */}
          <div style={{ ...styles.card, display: "flex", flexDirection: "column" }}>
            <div style={styles.cardHeader}>
              <span style={{ ...styles.cardDot, background: "#40916c" }} />
              <h2 style={styles.cardTitle}>Test AI Waiter Chat</h2>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Customer Phone</label>
              <input
                style={styles.input}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91..."
              />
            </div>

            {/* Message list */}
            <div style={styles.chatBox}>
              {messages.length === 0 ? (
                <div style={styles.emptyChat}>
                  <MessageCircle size={28} style={{ color: "#b7e4c7", marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: 13, color: "#95c1a8" }}>
                    No messages yet. Send a test message below.
                  </p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={`${m.created_at || idx}-${idx}`}
                    style={{
                      display: "flex",
                      justifyContent: m.direction === "incoming" ? "flex-end" : "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "80%",
                        padding: "8px 12px",
                        borderRadius: 14,
                        fontSize: 13,
                        lineHeight: 1.5,
                        background: m.direction === "incoming" ? "#2d6a4f" : "#ffffff",
                        color: m.direction === "incoming" ? "#ffffff" : "#1b4332",
                        border: m.direction === "incoming" ? "none" : "1px solid #d8f3dc",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, fontSize: 10, opacity: 0.7 }}>
                        {m.direction === "incoming" ? <User size={10} /> : <Bot size={10} />}
                        {m.direction}
                      </div>
                      {m.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input row */}
            <div style={styles.inputRow}>
              <input
                style={{ ...styles.input, flex: 1, marginBottom: 0 }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type customer message…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleSend(); }
                }}
              />
              <button onClick={handleSend} disabled={sending} style={styles.sendBtn}>
                {sending ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={15} />}
                Send
              </button>
            </div>

            <label style={{ ...styles.checkboxRow, marginTop: 10 }}>
              <div style={{ ...styles.toggle, background: sendToWhatsApp ? "#2d6a4f" : "#d1d5db" }}>
                <input
                  type="checkbox"
                  checked={sendToWhatsApp}
                  onChange={(e) => setSendToWhatsApp(e.target.checked)}
                  style={{ display: "none" }}
                />
                <div style={{
                  ...styles.toggleKnob,
                  transform: sendToWhatsApp ? "translateX(20px)" : "translateX(2px)",
                }} />
              </div>
              <span style={styles.checkLabel}>Also send AI reply to real customer WhatsApp</span>
            </label>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { outline: 2px solid #40916c; outline-offset: -1px; }
        button:hover:not(:disabled) { filter: brightness(1.08); }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f0f7f4",
    padding: "32px 16px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  loadingScreen: {
    minHeight: "100vh",
    background: "#f0f7f4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: "#40916c",
    textDecoration: "none",
    marginBottom: 6,
    fontWeight: 500,
  },
  pageTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#1b4332",
  },
  titleIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    background: "#d8f3dc",
    borderRadius: 10,
    color: "#2d6a4f",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#52796f",
  },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 20px",
    background: "#2d6a4f",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    transition: "filter 0.15s",
  },
  sendBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 18px",
    background: "#2d6a4f",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "filter 0.15s",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  card: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 24,
    border: "1px solid #d8f3dc",
    boxShadow: "0 2px 8px rgba(45,106,79,0.06)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  cardDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  cardTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: "#1b4332",
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#52796f",
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #d8f3dc",
    borderRadius: 9,
    fontSize: 13,
    color: "#1b4332",
    background: "#f8fdf9",
    transition: "outline 0.15s",
    fontFamily: "inherit",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    marginTop: 6,
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    position: "relative",
    transition: "background 0.2s",
    flexShrink: 0,
    cursor: "pointer",
  },
  toggleKnob: {
    position: "absolute",
    top: 2,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    transition: "transform 0.2s",
  },
  checkLabel: {
    fontSize: 13,
    color: "#374151",
    userSelect: "none",
  },
  chatBox: {
    flex: 1,
    minHeight: 300,
    maxHeight: 400,
    overflowY: "auto",
    background: "#f8fdf9",
    border: "1px solid #d8f3dc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
  },
  emptyChat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 20,
  },
  inputRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
};