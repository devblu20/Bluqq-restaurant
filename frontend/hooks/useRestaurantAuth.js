import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getMe } from "../services/api";

export function useRestaurantAuth() {
  const [restaurant, setRestaurant] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null); // ← alag state
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem("token");
      const id = localStorage.getItem("restaurant_id");

      if (!token || !id) {
        // _app.js handle kar raha hai — bas loading false karo
        setLoading(false);
        return;
      }

      setRestaurantId(id); // ← pehle set karo

      try {
        const res = await getMe();
        setRestaurant(res.data);
      } catch (err) {
        localStorage.clear();
        router.replace("/restaurant/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []); // ← router dependency nahi

  return { 
    restaurant, 
    loading, 
    restaurantId // ← restaurant.id se nahi, localStorage se
  };
}