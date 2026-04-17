import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { getOnboardingStatus } from "../../../services/api";
import { UtensilsCrossed, Loader2 } from "lucide-react";

const STEP_ROUTES = {
  basic_info: "/restaurant/onboarding/basic-info",
  operations: "/restaurant/onboarding/operations",
  menu_setup: "/restaurant/onboarding/menu",
  ordering_settings: "/restaurant/onboarding/order-settings",
};

export default function OnboardingIndex() {
  const router = useRouter();

  useEffect(() => {
    const restaurantId = localStorage.getItem("restaurant_id");
    if (!restaurantId) {
      router.replace("/restaurant/login");
      return;
    }
    getOnboardingStatus(restaurantId)
      .then((res) => {
        const { steps, ready_for_launch } = res.data;
        if (ready_for_launch) {
          router.replace("/restaurant/dashboard");
          return;
        }
        const incomplete = steps.find((s) => !s.completed);
        if (incomplete && STEP_ROUTES[incomplete.key]) {
          router.replace(STEP_ROUTES[incomplete.key]);
        } else {
          router.replace("/restaurant/onboarding/basic-info");
        }
      })
      .catch(() => router.replace("/restaurant/onboarding/basic-info"));
  }, []);

  return (
    <>
      <Head>
        <title>Loading | Menuify</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; background: #eef5f0; }
          @keyframes spin  { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
        `}</style>
      </Head>

      <div style={{
        minHeight: "100vh",
        background: "#eef5f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>

          {/* Logo mark */}
          <div style={{
            width: 58, height: 58, borderRadius: 16,
            background: "#1a6b3a",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(26,107,58,0.22)",
          }}>
            <UtensilsCrossed size={24} color="white" />
          </div>

          {/* Brand */}
          <div style={{ textAlign: "center", lineHeight: 1 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", marginBottom: 5 }}>
              Menuify
            </p>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#6aad7a", textTransform: "uppercase", letterSpacing: "0.16em" }}>
              Restaurant OS
            </p>
          </div>

          {/* Spinner */}
          <Loader2 size={20} color="#1a6b3a" style={{ animation: "spin 1s linear infinite", marginTop: 4 }} />

          {/* Label */}
          <p style={{ fontSize: 13, color: "#9dbeaa", fontWeight: 500 }}>
            Loading your setup...
          </p>

          {/* Pulsing dots */}
          <div style={{ display: "flex", gap: 5 }}>
            {[0, 0.25, 0.5].map((delay, i) => (
              <span key={i} style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "#1a6b3a", opacity: 0.3,
                animation: `pulse 1.4s ease-in-out ${delay}s infinite`,
              }} />
            ))}
          </div>

        </div>
      </div>
    </>
  );
}