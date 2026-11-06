"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function joinUrl() {
  if (typeof window === "undefined") return "";
  return process.env.NEXT_PUBLIC_JOIN_URL || `${window.location.origin}/join`;
}

export function JoinQR({ className, showUrl = true }: { className?: string; showUrl?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const u = joinUrl();
    setUrl(u);
    QRCode.toDataURL(u, { margin: 1, width: 600, color: { dark: "#1a1033", light: "#ffffff" } }).then(setSrc);
  }, []);

  return (
    <div className={`flex flex-col items-center gap-2 ${className ?? ""}`}>
      <div className="rounded-2xl bg-white p-3 shadow-2xl w-full aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src && <img src={src} alt={`QR สำหรับเข้าร่วม: ${url}`} className="w-full h-full" />}
      </div>
      {showUrl && <p className="text-white/70 text-sm break-all text-center">{url.replace(/^https?:\/\//, "")}</p>}
    </div>
  );
}
