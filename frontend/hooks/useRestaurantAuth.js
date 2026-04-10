import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getMe } from "../services/api";

export function useRestaurantAuth() {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem("token");
      const restaurantId = localStorage.getItem("restaurant_id");

      if (!token || !restaurantId) {
        router.replace("/restaurant/login");
        return;
      }

      try {
        const res = await getMe();
        setRestaurant(res.data);
      } catch (err) {
        console.error("Auth check failed", err);
        localStorage.clear();
        router.replace("/restaurant/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  return { restaurant, loading, restaurantId: restaurant?.id };
}