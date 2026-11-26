import { afterAll } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createCoverageMap, type CoverageMapData } from "istanbul-lib-coverage";
import { createInstrumenter } from "istanbul-lib-instrument";

declare global {
	var __coverage__: CoverageMapData | undefined;
}

const sourceRoot = fileURLToPath(new URL("../../src/", import.meta.url));
const sourcePath = sourceRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sourceFiles = new RegExp(
	`^${sourcePath}(?!.*(?:\\.(?:test|spec|test-support|d)|/index)\\.[jt]sx?$).+\\.[jt]sx?$`,
);
const instrumenter = createInstrumenter({
	esModules: true,
	compact: false,
	coverageGlobalScope: "globalThis",
	coverageGlobalScopeFunc: false,
	parserPlugins: ["typescript", "jsx"],
});

Bun.plugin({
	name: "Gridly source branch coverage",
	setup(build) {
		build.onLoad({ filter: sourceFiles }, ({ path, loader }) => {
			const source = readFileSync(path, "utf8");

			return { contents: instrumenter.instrumentSync(source, path), loader };
		});
	},
});

afterAll(async () => {
	const map = createCoverageMap(globalThis.__coverage__ ?? {});
	if (!map.files().length)
		throw new Error("Bun instrumentation contains no Gridly source.");

	const output = "coverage/bun-branches.json";
	await Bun.write(output, JSON.stringify(map.toJSON()));

	const { branches } = map.getCoverageSummary().toJSON();
	console.log(
		`Bun coverage · branches ${branches.covered}/${branches.total} · ${output}`,
	);
});
