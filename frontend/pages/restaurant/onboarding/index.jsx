import { useEffect } from "react";
import { useRouter } from "next/router";
import { getOnboardingStatus } from "../../../services/api";

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
    <div className="min-h-screen flex items-center justify-center bg-orange-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading your setup...</p>
      </div>
    </div>
  );
}
