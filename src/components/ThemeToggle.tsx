"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  useEffect(() => {
    const saved = window.localStorage.getItem("fez-bonito-theme");
    document.documentElement.dataset.theme = saved === "light" ? "light" : "dark";
  }, []);

  function toggle() {
    const next = document.documentElement.dataset.theme !== "light";
    document.documentElement.dataset.theme = next ? "light" : "dark";
    window.localStorage.setItem("fez-bonito-theme", next ? "light" : "dark");
  }

  return <button className="theme-toggle" type="button" onClick={toggle} title="Alternar tema" aria-label="Alternar tema"><Sun className="theme-icon-light" size={19} /><Moon className="theme-icon-dark" size={19} /></button>;
}