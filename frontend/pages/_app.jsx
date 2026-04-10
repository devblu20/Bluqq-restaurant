import "../styles/globals.css";
import { Toaster } from "react-hot-toast";
import { supabase } from '../services/supabase'

// Example: fetch restaurants table
const { data, error } = await supabase
  .from('restaurants')
  .select('*')

export default function App({ Component, pageProps }) {
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
