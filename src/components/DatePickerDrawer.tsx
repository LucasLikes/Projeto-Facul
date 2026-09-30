"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, X } from "lucide-react";
import type { Arena, Court } from "@/lib/domain";

export function DatePickerDrawer({ arena, court, date }: { arena: Arena; court: Court; date: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedDate, setSelectedDate] = useState(date);
  const href = `/${arena.slug}/${court.slug}?data=${encodeURIComponent(selectedDate)}`;

  return <>
    <button className="date-picker-trigger" type="button" onClick={() => dialogRef.current?.showModal()}><CalendarDays size={18} /><span>Escolher data</span></button>
    <dialog className="date-drawer" ref={dialogRef} onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current?.close(); }} aria-labelledby="date-drawer-title">
      <div className="date-drawer-content">
        <div className="date-drawer-grab" aria-hidden="true" />
        <header><div><span className="section-eyebrow">AGENDA DA QUADRA</span><h2 id="date-drawer-title">Escolha uma data</h2></div><button type="button" className="date-drawer-close" onClick={() => dialogRef.current?.close()} aria-label="Fechar seletor de data"><X size={19} /></button></header>
        <label htmlFor="public-date-picker">Data</label>
        <input id="public-date-picker" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        <Link className="date-drawer-submit" href={href} onClick={() => dialogRef.current?.close()}>Ver horários</Link>
      </div>
    </dialog>
  </>;
}