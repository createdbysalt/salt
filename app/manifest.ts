import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Salt",
    short_name: "Salt",
    description: "The strategic intelligence system for designers and developers",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#00949f",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
