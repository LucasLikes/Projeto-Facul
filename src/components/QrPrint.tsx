"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, FileText, LoaderCircle } from "lucide-react";

export function QrPrint({ arenaName, courtName, url, brand }: { arenaName: string; courtName: string; url: string; brand: string }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void import("qrcode").then((QRCode) => QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#101310", light: "#ffffff" },
    })).then((data) => { if (active) setImage(data); }).catch(() => { if (active) setError("Não foi possível gerar o QR code."); });
    return () => { active = false; };
  }, [url]);

  async function downloadPdf() {
    if (!image) return;
    setBusy(true);
    setError("");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5" });
      pdf.setFillColor(16, 19, 16);
      pdf.rect(0, 0, 210, 148, "F");
      pdf.setTextColor(197, 243, 107);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(arenaName.toUpperCase(), 15, 20);
      pdf.setTextColor(243, 244, 237);
      pdf.setFontSize(29);
      pdf.text(courtName, 15, 39);
      pdf.setTextColor(163, 170, 158);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("Escaneie e encontre seus melhores lances", 15, 51);
      pdf.addImage(image, "PNG", 130, 22, 65, 65);
      pdf.setDrawColor(52, 59, 50);
      pdf.line(15, 120, 195, 120);
      pdf.setFontSize(9);
      pdf.text(url, 15, 128, { maxWidth: 178 });
      pdf.save(`fez-bonito-${courtName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-a5.pdf`);
    } catch {
      setError("Não foi possível criar o PDF neste dispositivo.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="qr-card" style={{ "--brand": brand } as React.CSSProperties}>
    <div className="qr-preview">{image ? <Image src={image} alt={`QR code para ${courtName}`} width={210} height={210} unoptimized /> : error ? <p>{error}</p> : <LoaderCircle className="spin" size={22} />}</div>
    <div className="qr-info"><span className="section-eyebrow">QR CODE DA QUADRA</span><h3>{courtName}</h3><p>{url}</p><div className="qr-actions">
      {image ? <a href={image} download={`fez-bonito-${courtName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}><Download size={15} />PNG</a> : null}
      <button type="button" onClick={() => void downloadPdf()} disabled={!image || busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <FileText size={15} />}PDF A5</button>
    </div>{error ? <p className="qr-error" role="alert">{error}</p> : null}</div>
  </div>;
}