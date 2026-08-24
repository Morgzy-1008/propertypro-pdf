import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface PaymentQrCodeProps {
  accountName: string;
  bsb: string;
  accountNumber: string;
  amount: number;
  reference: string;
  quoteId?: string;
  size?: number;
  className?: string;
}

export function PaymentQrCode({
  accountName,
  bsb,
  accountNumber,
  amount,
  reference,
  quoteId,
  size = 120,
  className = "",
}: PaymentQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    const cleanBsb = bsb.replace(/\D/g, "");
    const cleanAcc = accountNumber.replace(/\D/g, "");

    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://propertypro-pdf.vercel.app";

    // Direct client payment portal URL with pre-populated transfer parameters
    const params = new URLSearchParams({
      name: accountName,
      bsb: cleanBsb,
      acc: cleanAcc,
      ref: reference,
      amt: amount.toString(),
      bank: "National Australia Bank (NAB)",
    });

    if (quoteId) {
      params.set("quoteId", quoteId);
    }

    const payPortalUrl = `${origin}/pay?${params.toString()}`;

    QRCode.toDataURL(payPortalUrl, {
      width: size * 2,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("Error generating payment portal QR code:", err));
  }, [accountName, bsb, accountNumber, amount, reference, quoteId, size]);

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
      alt="Scan to open fast 1-click EFT copy payment portal"
      style={{ width: size, height: size }}
      className={`rounded-lg border border-slate-300 object-contain shadow-xs ${className}`}
    />
  );
}
