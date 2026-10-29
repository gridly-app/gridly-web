import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		build: {
			manifest: true,
			rollupOptions: {
				output: {
					onlyExplicitManualChunks: true,
					manualChunks(id) {
						if (!id.includes("node_modules/")) return;
						if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id))
							return "react-runtime";
						if (/\/node_modules\/(react-router|react-router-dom)\//.test(id))
							return "router";

						if (/\/node_modules\/zod\//.test(id)) return "validation";
						if (/\/node_modules\/@tanstack\//.test(id)) return "query";
					},
				},
			},
		},
		server: {
			proxy: {
				"/api": {
					target: env.API_PROXY_TARGET || "http://127.0.0.1:8080",
					changeOrigin: true,
				},
			},
		},
		plugins: [react()],
		resolve: {
			alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
		},
	};
});
