import { useState, useEffect } from "react";
import QRCode from "qrcode";

const qrCache = new Map<string, string>();

/** Renders `value` as a crisp black-on-white QR code sized in millimetres. */
export function QrCode({ value, size = 14 }: { value: string; size?: number }) {
  const [src, setSrc] = useState(() => qrCache.get(value) || "");

  useEffect(() => {
    if (!value) {
      setSrc("");
      return;
    }
    const cached = qrCache.get(value);
    if (cached) {
      setSrc(cached);
      return;
    }

    let active = true;
    QRCode.toDataURL(value, {
      margin: 0,
      width: 512,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => {
        if (active) {
          qrCache.set(value, url);
          setSrc(url);
        }
      })
      .catch(() => active && setSrc(""));
    return () => {
      active = false;
    };
  }, [value]);

  if (!src) return <div style={{ width: `${size}mm`, height: `${size}mm` }} />;
  return (
    <img
      src={src}
      alt="Scan to save contact details"
      style={{ width: `${size}mm`, height: `${size}mm` }}
      className="rounded-[0.8mm] bg-white p-[0.6mm]"
    />
  );
}
