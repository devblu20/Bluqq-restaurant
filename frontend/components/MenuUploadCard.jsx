import { useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { menuAPI } from "@/services/api";
import styles from "./MenuUploadCard.module.css";

const scannerAxios = axios.create({ baseURL: "http://localhost:8001" });

// ── Tag badge ────────────────────────────────────────────────────────
function TagBadge({ tag }) {
  const colors = {
    vegetarian: { bg: "#dcfce7", color: "#15803d" },
    "non-vegetarian": { bg: "#fee2e2", color: "#b91c1c" },
    vegan: { bg: "#d1fae5", color: "#065f46" },
    spicy: { bg: "#fff7ed", color: "#c2410c" },
    "chef-special": { bg: "#fef9c3", color: "#92400e" },
    halal: { bg: "#e0f2fe", color: "#0369a1" },
    bestseller: { bg: "#fce7f3", color: "#9d174d" },
  };
  const style = colors[tag] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: "2px 8px", borderRadius: 12,
      fontSize: 11, fontWeight: 500, marginRight: 4,
    }}>
      {tag}
    </span>
  );
}

// ── Single scanned item card ──────────────────────────────────────────
function ScannedItemCard({ item, index, onChange, onRemove }) {
  return (
    <div className={styles.itemCard}>
      <button className={styles.removeBtn} onClick={() => onRemove(index)} title="Remove">✕</button>

      <div className={styles.itemRow}>
        <div style={{ flex: 2 }}>
          <input
            className={styles.inlineInput}
            value={item.name || ""}
            onChange={(e) => onChange(index, "name", e.target.value)}
            placeholder="Item name"
            style={{ fontWeight: 600, fontSize: 14 }}
          />
          <input
            className={styles.inlineInput}
            value={item.description || ""}
            onChange={(e) => onChange(index, "description", e.target.value)}
            placeholder="Description (optional)"
            style={{ fontSize: 13, color: "#6b7280" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <input
            className={styles.inlineInput}
            value={item.category || ""}
            onChange={(e) => onChange(index, "category", e.target.value)}
            placeholder="Category"
            style={{ fontSize: 13 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16, color: "#6b7280" }}>
              {item.currency_symbol || "₹"}
            </span>
            <input
              className={styles.inlineInput}
              type="number"
              value={item.price_value || ""}
              onChange={(e) => onChange(index, "price_value", parseFloat(e.target.value) || 0)}
              placeholder="Price"
              style={{ fontWeight: 600, fontSize: 15, width: 80 }}
            />
          </div>
        </div>
      </div>

      {item.tags && item.tags.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {item.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function MenuScanUpload({ restaurantId, onImportDone }) {
  const [step, setStep] = useState("upload");   // upload | scanning | review | importing | done
  const [files, setFiles] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [items, setItems] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  // ── File selection ─────────────────────────────────────────────────
  const handleFiles = (selectedFiles) => {
    const valid = Array.from(selectedFiles).filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    if (valid.length === 0) {
      toast.error("Sirf JPG, PNG, ya WebP images allowed hain");
      return;
    }
    if (valid.length > 10) {
      toast.error("Maximum 10 images ek baar mein");
      return;
    }
    setFiles(valid);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Scan karo ─────────────────────────────────────────────────────
  const handleScan = async () => {
    if (files.length === 0) {
      toast.error("Pehle ek image select karo");
      return;
    }

    setStep("scanning");

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const { data } = await scannerAxios.post("/scan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setScanResult(data);
      setItems(data.items || []);
      setStep("review");

      toast.success(`${data.total} items scan hue! Review karo phir import karo.`);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.detail ||
        "Scan fail hua. MenuScanner service chal rahi hai? (port 8001)"
      );
      setStep("upload");
    }
  };

  // ── Item edit/remove ──────────────────────────────────────────────
  const handleChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemove = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    toast.success("Item remove ho gaya");
  };

  // ── Backend mein import karo ──────────────────────────────────────
  const handleImport = async () => {
    if (items.length === 0) {
      toast.error("Koi item nahi hai import karne ke liye");
      return;
    }

    setStep("importing");

    const payload = {
      items: items,
      detected_cuisine: scanResult?.detected_cuisine,
      restaurant_name: scanResult?.restaurant_name,
      menu_currency_symbol: scanResult?.menu_currency_symbol || "₹",
      menu_currency_code: scanResult?.menu_currency_code || "INR",
    };

    try {
      const token = localStorage.getItem("token");
      const { data } = await menuAPI.importScan(restaurantId, payload);

      setStep("done");
      toast.success(`${data.imported_items} items import ho gaye!`);

      if (onImportDone) onImportDone(data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Import fail hua");
      setStep("review");
    }
  };

  const reset = () => {
    setStep("upload");
    setFiles([]);
    setScanResult(null);
    setItems([]);
  };

  // ── Group items by category ───────────────────────────────────────
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  // Step: Upload
  if (step === "upload") {
    return (
      <div className={styles.wrap}>
        <h3 className={styles.heading}>Menu scan karo — image se automatic items</h3>
        <p className={styles.sub}>
          Menu ki photo upload karo. AI usse scan karke saare items, prices aur categories
          automatically detect kar lega.
        </p>

        <div
          className={`${styles.dropzone} ${dragOver ? styles.dragOver : ""}`}
          onClick={() => fileRef.current.click()}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          <div className={styles.dropIcon}>📷</div>
          <p className={styles.dropText}>
            {files.length > 0
              ? `${files.length} image${files.length > 1 ? "s" : ""} selected`
              : "Click karo ya drag & drop karo"}
          </p>
          <p className={styles.dropSub}>JPG, PNG, WebP — max 10 pages</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className={styles.fileList}>
            {files.map((f, i) => (
              <div key={i} className={styles.fileChip}>
                <span>🖼️</span>
                <span>{f.name}</span>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>
                  ({(f.size / 1024).toFixed(0)} KB)
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          className={`btn btn-primary btn-block ${styles.scanBtn}`}
          onClick={handleScan}
          disabled={files.length === 0}
        >
          Scan karo →
        </button>
      </div>
    );
  }

  // Step: Scanning
  if (step === "scanning") {
    return (
      <div className={styles.wrap}>
        <div className={styles.scanningWrap}>
          <div className={styles.spinner} />
          <h3 className={styles.scanningText}>Menu scan ho raha hai…</h3>
          <p className={styles.scanningSubtext}>
            {files.length} image{files.length > 1 ? "s" : ""} process ho rahi hai.
            Ek minute lag sakta hai.
          </p>
          <p className={styles.scanningNote}>
            AI image padh raha hai aur items extract kar raha hai
          </p>
        </div>
      </div>
    );
  }

  // Step: Review
  if (step === "review") {
    return (
      <div className={styles.wrap}>
        <div className={styles.reviewHeader}>
          <div>
            <h3 className={styles.heading}>Scan results — review karo</h3>
            <p className={styles.sub}>
              {items.length} items mili hain{scanResult?.detected_cuisine ? ` · ${scanResult.detected_cuisine}` : ""}.
              Koi bhi edit ya remove kar sakte ho.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={reset}>
            Naya scan
          </button>
        </div>

        {/* Meta info */}
        {scanResult && (
          <div className={styles.metaRow}>
            {scanResult.detected_cuisine && (
              <span className={styles.metaBadge}>Cuisine: {scanResult.detected_cuisine}</span>
            )}
            {scanResult.restaurant_name && (
              <span className={styles.metaBadge}>Restaurant: {scanResult.restaurant_name}</span>
            )}
            {scanResult.menu_currency_symbol && (
              <span className={styles.metaBadge}>Currency: {scanResult.menu_currency_symbol} ({scanResult.menu_currency_code})</span>
            )}
            <span className={styles.metaBadge}>{scanResult.total_pages} page{scanResult.total_pages > 1 ? "s" : ""} scan hua</span>
          </div>
        )}

        {/* Items grouped by category */}
        {Object.keys(grouped).map((cat) => (
          <div key={cat} className={styles.categorySection}>
            <div className={styles.categoryHeader}>
              <span>{cat}</span>
              <span className={styles.categoryCount}>{grouped[cat].length} items</span>
            </div>
            {grouped[cat].map((item) => {
              const originalIndex = items.indexOf(item);
              return (
                <ScannedItemCard
                  key={originalIndex}
                  item={item}
                  index={originalIndex}
                  onChange={handleChange}
                  onRemove={handleRemove}
                />
              );
            })}
          </div>
        ))}

        <div className={styles.importFooter}>
          <span style={{ fontSize: 14, color: "#6b7280" }}>
            {items.length} items import honge
          </span>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleImport}
            disabled={items.length === 0}
          >
            Menu import karo →
          </button>
        </div>
      </div>
    );
  }

  // Step: Importing
  if (step === "importing") {
    return (
      <div className={styles.wrap}>
        <div className={styles.scanningWrap}>
          <div className={styles.spinner} />
          <h3 className={styles.scanningText}>Menu save ho raha hai…</h3>
          <p className={styles.scanningSubtext}>{items.length} items database mein ja rahe hain</p>
        </div>
      </div>
    );
  }

  // Step: Done
  if (step === "done") {
    return (
      <div className={styles.wrap}>
        <div className={styles.doneWrap}>
          <div className={styles.doneIcon}>✓</div>
          <h3 className={styles.heading}>Menu import ho gaya!</h3>
          <p className={styles.sub}>
            Saare items ab aapke menu mein add ho gaye hain. Aap unhe
            edit kar sakte ho ya aur items manually add kar sakte ho.
          </p>
          <button className="btn btn-secondary" onClick={reset}>
            Aur scan karo
          </button>
        </div>
      </div>
    );
  }

  return null;
}