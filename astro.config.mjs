import { defineConfig } from "astro/config"
import sitemap from "@astrojs/sitemap"

export default defineConfig({
  site: "https://health-calculators.zikakitomota.workers.dev",
  output: "static",
  integrations: [sitemap()],
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
