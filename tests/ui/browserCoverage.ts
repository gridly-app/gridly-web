import { createCoverageMap } from "istanbul-lib-coverage";
import type { Page } from "@playwright/test";
import { resolve } from "node:path";
import v8toIstanbul from "v8-to-istanbul";

const projectRoot = import.meta.dir + "/../..";

export function browserCoverage() {
	const map = createCoverageMap({});

	async function collect(page: Page) {
		const scripts = await page.coverage.stopJSCoverage();

		for (const { url, source, functions } of scripts) {
			const path = new URL(url).pathname;
			if (!source || !path.startsWith("/src/") || !/\.[jt]sx?$/.test(path))
				continue;

			const converter = v8toIstanbul(resolve(projectRoot, `.${path}`), 0, {
				source,
			});

			try {
				await converter.load();
				converter.applyCoverage(functions);
				map.merge(converter.toIstanbul());
			} finally {
				converter.destroy();
			}
		}
	}

	async function report() {
		if (!map.files().length)
			throw new Error("Chromium coverage contains no Gridly source.");

		const output = "coverage/chromium.json";
		await Bun.write(output, JSON.stringify(map.toJSON()));

		const { lines, branches } = map.getCoverageSummary().toJSON();
		console.log(
			`Chromium coverage · lines ${lines.covered}/${lines.total} · branches ${branches.covered}/${branches.total} · ${output}`,
		);
	}

	return { collect, report };
}
