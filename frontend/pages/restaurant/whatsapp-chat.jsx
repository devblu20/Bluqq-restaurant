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
    tone: "friendly",
    language: "english",
    custom_prompt: "",
  });

  const [customerPhone, setCustomerPhone] = useState("+919999999999");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sendToWhatsApp, setSendToWhatsApp] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;

    getWhatsAppConfig(restaurantId)
      .then((res) => {
        setConfig((prev) => ({ ...prev, ...res.data }));
      })
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
          const detail = res.data.meta_error ? String(res.data.meta_error).slice(0, 220) : "Check phone_number_id/access_token.";
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={34} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/restaurant/dashboard" className="hover:text-orange-500 inline-flex items-center gap-1">
                <ArrowLeft size={14} />
                Back
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="text-orange-500" size={24} />
              WhatsApp AI Waiter
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure your WhatsApp line and test AI waiter replies for {restaurant?.name}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Config
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900">WhatsApp Configuration</h2>

            <label className="label">Business Phone</label>
            <input
              className="input-field"
              value={config.business_phone || ""}
              onChange={(e) => setConfig({ ...config, business_phone: e.target.value })}
              placeholder="+91..."
            />

            <label className="label">Phone Number ID (Meta)</label>
            <input
              className="input-field"
              value={config.phone_number_id || ""}
              onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
              placeholder="Meta phone_number_id"
            />

            <label className="label">Access Token</label>
            <input
              className="input-field"
              value={config.access_token || ""}
              onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
              placeholder="Permanent token"
            />

            <label className="label">Verify Token</label>
            <input
              className="input-field"
              value={config.verify_token || ""}
              onChange={(e) => setConfig({ ...config, verify_token: e.target.value })}
              placeholder="Webhook verify token"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tone</label>
                <select
                  className="input-field"
                  value={config.tone || "friendly"}
                  onChange={(e) => setConfig({ ...config, tone: e.target.value })}
                >
                  <option value="friendly">friendly</option>
                  <option value="premium">premium</option>
                  <option value="casual">casual</option>
                </select>
              </div>

              <div>
                <label className="label">Language</label>
                <input
                  className="input-field"
                  value="english"
                  disabled
                  readOnly
                />
              </div>
            </div>

            <label className="label">Custom Prompt</label>
            <textarea
              className="input-field resize-none"
              rows={4}
              value={config.custom_prompt || ""}
              onChange={(e) => setConfig({ ...config, custom_prompt: e.target.value })}
              placeholder="Extra waiter personality rules..."
            />

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={!!config.is_active}
                onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm text-gray-700">Webhook replies active</span>
            </label>
          </div>

          <div className="card flex flex-col">
            <h2 className="font-bold text-gray-900 mb-3">Test AI Waiter Chat</h2>

            <label className="label">Customer Phone</label>
            <input
              className="input-field mb-3"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+91..."
            />

            <div className="flex-1 min-h-[320px] max-h-[420px] overflow-auto border border-gray-100 rounded-xl p-3 bg-gray-50 space-y-2">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-400">No messages yet. Send a test message below.</p>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={`${m.created_at || idx}-${idx}`}
                    className={`flex ${m.direction === "incoming" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] px-3 py-2 rounded-xl text-sm shadow-sm ${
                        m.direction === "incoming"
                          ? "bg-orange-500 text-white"
                          : "bg-white text-gray-800 border border-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1 text-[10px] opacity-80">
                        {m.direction === "incoming" ? <User size={10} /> : <Bot size={10} />}
                        {m.direction}
                      </div>
                      {m.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                className="input-field"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type customer message"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending}
                className="btn-primary flex items-center gap-2"
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Send
              </button>
            </div>

            <label className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={sendToWhatsApp}
                onChange={(e) => setSendToWhatsApp(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm text-gray-700">Also send AI reply to real customer WhatsApp</span>
            </label>
          </div>
        </div>

        <div className="card text-sm text-gray-600">
          <p className="font-semibold text-gray-800 mb-2">Webhook URL (Meta Setup)</p>
          <p>
            Set callback URL to <span className="font-mono text-xs">{`https://your-api-domain/whatsapp/webhook`}</span>
          </p>
          <p className="mt-1">
            Verification token uses env <span className="font-mono text-xs">WHATSAPP_WEBHOOK_VERIFY_TOKEN</span> or default <span className="font-mono text-xs">restaurant_webhook_verify</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
