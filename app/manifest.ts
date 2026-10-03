import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Filia",
    short_name: "Filia",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#1c1917",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
