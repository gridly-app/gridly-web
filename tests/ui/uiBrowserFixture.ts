import { mkdir } from "node:fs/promises";
import { type Browser, chromium, expect, type Page } from "@playwright/test";
import { installUiApi } from "./uiApiFixture";
import { startUiTestServer } from "./uiTestServer";

export const output = new URL("../../.artifacts/ui/", import.meta.url).pathname;

const readySelectors: Record<string, string> = {
	map: "canvas",
	history: "[data-history-log]",
	settings: "form",
	information: "[data-information-dashboard]",
};

async function ready(page: Page, base: string, path: string) {
	await page.goto(`${base}/warehouses/warehouse-demo/${path}`);
	const selector = readySelectors[path] ?? "[data-slot=table]";

	await expect(page.locator(selector).first()).toBeVisible();
}

export async function setPageHidden(page: Page, hidden: boolean) {
	await page.evaluate((hidden) => {
		Object.defineProperty(document, "hidden", {
			configurable: true,
			value: hidden,
		});
		document.dispatchEvent(new Event("visibilitychange"));
	}, hidden);
}

async function screenshot(page: Page, name: string) {
	await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
}

async function signIn(page: Page, base: string) {
	await page.goto(`${base}/auth`);
	await page.getByLabel("Логин", { exact: true }).fill("admin@gridly.local");
	await page.getByLabel("Пароль", { exact: true }).fill("gridly-demo");
	await page.getByRole("button", { name: "Войти", exact: true }).click();
	await page.waitForURL("**/warehouses/warehouse-demo/**");
	await expect(page.locator("canvas").first()).toBeVisible();
}

type UiTestServer = Awaited<ReturnType<typeof startUiTestServer>>;

async function newScenario(browser: Browser, testServer: UiTestServer) {
	const { base, hasLocalStream } = testServer;
	const context = await browser.newContext({
		viewport: { width: 1440, height: 1000 },
		reducedMotion: "reduce",
		locale: "ru-RU",
	});
	try {
		const page = await context.newPage();
		const errors: string[] = [];
		page.on("pageerror", (error) => {
			errors.push(error.message);
			console.error(error);
		});
		page.on("console", (message) => {
			if (message.type() === "error" && message.text().includes("Error:"))
				errors.push(message.text());
		});
		const api = await installUiApi(page, hasLocalStream);
		return {
			base,
			context,
			page,
			api,
			testServer,
			errors,
			ready: (path: string) => ready(page, base, path),
			screenshot: (name: string) => screenshot(page, name),
			signIn: () => signIn(page, base),
		};
	} catch (error) {
		await context.close();
		throw error;
	}
}

export type UiScenario = Awaited<ReturnType<typeof newScenario>>;

export async function runScenarios(
	scenarios: ReadonlyArray<
		readonly [string, (scenario: UiScenario) => Promise<void>]
	>,
) {
	await mkdir(output, { recursive: true });
	const testServer = await startUiTestServer();
	try {
		await expect
			.poll(
				async () => {
					try {
						return (await fetch(testServer.base)).ok;
					} catch {
						return false;
					}
				},
				{ timeout: 10_000 },
			)
			.toBe(true);
		const browser = await chromium.launch({
			headless: true,
			...(process.env.GRIDLY_CHROMIUM
				? { executablePath: process.env.GRIDLY_CHROMIUM }
				: {}),
		});
		try {
			for (const [name, run] of scenarios) {
				const scenario = await newScenario(browser, testServer);
				try {
					await run(scenario);
					expect(scenario.errors).toEqual([]);
					console.log(`PASS ${name}`);
				} catch (error) {
					console.error(`FAIL ${name}`);
					console.error(
						await scenario.page
							.locator("body")
							.innerText({ timeout: 2000 })
							.catch(() => ""),
					);
					await scenario.screenshot("failure").catch(() => undefined);
					throw error;
				} finally {
					await scenario.context.close();
				}
			}
		} finally {
			await browser.close();
		}
	} finally {
		await testServer.close();
	}
}
