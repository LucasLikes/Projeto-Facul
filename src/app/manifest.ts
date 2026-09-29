import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fez Bonito",
    short_name: "Fez Bonito",
    description: "Replays e agenda da sua quadra.",
    start_url: "/",
    display: "standalone",
    background_color: "#101310",
    theme_color: "#101310",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}