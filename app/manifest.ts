import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HaloBlisko",
    short_name: "HaloBlisko",
    start_url: "/d/home-anna",
    display: "standalone",
    background_color: "#F4F7FB",
    theme_color: "#F4F7FB",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
