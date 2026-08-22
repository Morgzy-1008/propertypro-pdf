import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface PaymentQrCodeProps {
  accountName: string;
  bsb: string;
  accountNumber: string;
  amount: number;
  reference: string;
  size?: number;
  className?: string;
}

export function PaymentQrCode({
  accountName,
  bsb,
  accountNumber,
  amount,
  reference,
  size = 120,
  className = "",
}: PaymentQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    // Formatted Australian Banking EFT & Prompt String
    const formattedBsb = bsb.replace(/\D/g, "");
    const cleanAcc = accountNumber.replace(/\D/g, "");

    // Australian Banking / AusPayNet QR standard & Smart Prompt payload
    const payload = [
      `HUDSON HOMES EFT PAYMENT`,
      `Account: ${accountName}`,
      `BSB: ${bsb}`,
      `Account Number: ${accountNumber}`,
      `Amount: $${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Reference: ${reference}`,
    ].join("\n");

    QRCode.toDataURL(payload, {
      width: size * 2,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("Error generating payment QR code:", err));
  }, [accountName, bsb, accountNumber, amount, reference, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-slate-100 animate-pulse rounded-lg border border-slate-300 ${className}`}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt="Scan to Pay via Banking App"
      style={{ width: size, height: size }}
      className={`rounded-lg border border-slate-300 object-contain shadow-xs ${className}`}
    />
  );
}
