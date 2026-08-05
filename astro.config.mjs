import { defineConfig } from "astro/config"

// Static site output, ready for Cloudflare Pages.
export default defineConfig({
  site: "https://health-calculators.pages.dev",
  output: "static",
  compressHTML: true,
  server: {
    host: true,
    port: 3000,
  },
  vite: {
    server: {
      allowedHosts: true,
    },
  },
})
