import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// --- Interceptors ---

// Inject token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize FastAPI validation errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail)) {
      error.message = detail.map((e) => e.msg).join(", ");
    } else if (typeof detail === "string") {
      error.message = detail;
    } else {
      error.message = "Something went wrong. Please try again.";
    }
    return Promise.reject(error);
  }
);

// --- Auth Endpoints ---
export const signup = (data) => api.post("/restaurant/auth/signup", data);
export const login = (data) => api.post("/restaurant/auth/login", data);
export const getMe = () => api.get("/restaurant/auth/me");

// --- Restaurant & Profile Endpoints ---
export const getRestaurant = (id) => api.get(`/restaurants/${id}`);
export const updateRestaurant = (id, data) => api.patch(`/restaurants/${id}`, data);

export const createProfile = (id, data) => api.post(`/restaurants/${id}/profile`, data);
export const updateProfile = (id, data) => api.patch(`/restaurants/${id}/profile`, data);

export const getOrderSettings = (id) => api.get(`/restaurants/${id}/order-settings`);
export const createOrderSettings = (id, data) => api.post(`/restaurants/${id}/order-settings`, data);
export const updateOrderSettings = (id, data) => api.patch(`/restaurants/${id}/order-settings`, data);

export const getOnboardingStatus = (id) => api.get(`/restaurants/${id}/onboarding-status`);
export const goLiveCheck = (id) => api.get(`/restaurants/${id}/go-live-check`);

// --- Menu Category Endpoints ---
export const getCategories = (id) => api.get(`/restaurants/${id}/menu/categories`);
export const createCategory = (id, data) => api.post(`/restaurants/${id}/menu/categories`, data);

// --- Menu Item Endpoints ---
export const getMenuItems = (id) => api.get(`/restaurants/${id}/menu/items`);
export const createMenuItem = (id, data) => api.post(`/restaurants/${id}/menu/items`, data);
export const updateMenuItem = (id, itemId, data) => api.patch(`/restaurants/${id}/menu/items/${itemId}`, data);
export const deleteMenuItem = (id, itemId) => api.delete(`/restaurants/${id}/menu/items/${itemId}`);

// --- AI Menu Scanning (Multipart) ---

/**
 * Uploads menu image and triggers AI extraction (Claude API)
 */
export const uploadMenuImage = (id, formData) =>
  api.post(`/restaurants/${id}/upload-menu`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Aliases for compatibility with different page versions
export const uploadMenu = uploadMenuImage;
export const scanMenuImages = uploadMenuImage;

/**
 * NEW: Import scanned menu data after manual review (if needed)
 */
export const importScan = (id, scanData) =>
  api.post(`/restaurants/${id}/menu/import-scan`, scanData);

export default api;