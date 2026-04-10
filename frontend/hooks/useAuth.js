import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchRestaurantId(currentUser.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchRestaurantId(currentUser.id);
      } else {
        setRestaurantId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRestaurantId = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", userId)
        .single();

      if (!error && data) {
        setRestaurantId(data.id);
      }
    } catch (err) {
      console.error("Restaurant ID fetch error:", err);
    }
  };

  return { user, restaurantId, loading };
}