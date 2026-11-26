import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	testMatch: "**/*.e2e.ts",
	fullyParallel: false,
	workers: 1,
	timeout: 45_000,
	use: {
		browserName: "chromium",
		baseURL: process.env.GRIDLY_E2E_URL,
		trace: "off",
	},
});
