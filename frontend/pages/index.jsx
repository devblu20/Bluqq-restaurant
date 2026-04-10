import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace("/restaurant/dashboard");
    } else {
      router.replace("/restaurant/login");
    }
  }, []);
  return null;
}
