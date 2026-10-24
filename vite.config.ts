import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		server: {
			proxy: {
				"/api": {
					target: env.API_PROXY_TARGET || "http://127.0.0.1:8080",
					changeOrigin: true,
				},
			},
		},
		plugins: [
			react(),
			{
				name: "production-demo-isolation",
				apply: "build",
				generateBundle(_options, bundle) {
					for (const output of Object.values(bundle)) {
						if (output.type !== "chunk") {
							continue;
						}
						for (const moduleId of Object.keys(output.modules)) {
							const normalized = moduleId.replaceAll("\\", "/");

							if (
								/\/src\/app\/mocks\/|\/node_modules\/(msw|@mswjs)\//.test(
									normalized,
								)
							) {
								this.error(
									`Development mocks must not enter the production bundle: ${moduleId}`,
								);
							}
						}
					}
				},
			},
		],
		resolve: {
			alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
		},
	};
});
