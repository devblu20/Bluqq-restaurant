import "../styles/globals.css";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const PROTECTED_ROUTES = [
  "/restaurant/dashboard",
  "/restaurant/edit",
  "/restaurant/orders",
  "/restaurant/analytics",
  "/restaurant/profile",
  "/restaurant/whatsapp-chat",
  "/restaurant/menu-manager",
  "/restaurant/onboarding", // ← ADD KARO
];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const id = localStorage.getItem("restaurant_id");

    const isProtected = PROTECTED_ROUTES.some(route =>
      router.pathname.startsWith(route)
    );

    if (isProtected && (!token || !id)) {
      router.replace("/restaurant/login");
    } else {
      setReady(true);
    }
  }, [router.pathname]);

  if (!ready) return null;

  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "12px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
          },
        }}
      />
    </>
  );
}