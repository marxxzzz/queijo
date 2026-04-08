// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
	site: "https://loja-oficial-online.shop",
	trailingSlash: "always",
	output: "server",
	adapter: node({ mode: "standalone" }),
});
