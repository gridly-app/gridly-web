import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectArchitecture } from "../../scripts/check-architecture";

const modules = [
	"src/app/index.ts",
	"src/app/warehouse/index.ts",
	"src/app/warehouse/map/index.ts",
	"src/app/settings/index.ts",
];

async function inspect(files: Record<string, string>) {
	const directory = await mkdtemp(join(tmpdir(), "gridly-architecture-"));

	try {
		await Bun.write(
			join(directory, "tsconfig.app.json"),
			JSON.stringify({
				compilerOptions: {
					paths: { "@/*": ["./src/*"], "#fixtures/*": ["./tests/support/*"] },
				},
			}),
		);
		await Promise.all(
			modules.map((path) => Bun.write(join(directory, path), "")),
		);
		await Promise.all(
			Object.entries(files).map(([path, source]) =>
				Bun.write(join(directory, path), source),
			),
		);

		return inspectArchitecture(directory).map(({ source, target, rule }) => ({
			source,
			target,
			rule,
		}));
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

test("assembly can import its direct child's public entry through alias or lazy loading", async () => {
	expect(
		await inspect({
			"src/app/warehouse/routes.compose.ts":
				'import type { MapProps } from "@/app/warehouse/map";',
			"src/app/warehouse/Warehouse.tsx":
				'export const load = () => import("./map/index.js");',
		}),
	).toEqual([]);
});

test("assembly rejects parent, sibling and child's private file, and other files cannot import children", async () => {
	const assembly = "src/app/warehouse/routes.compose.ts";
	const internal = "src/app/warehouse/internal.ts";
	const childEntry = "src/app/warehouse/map/index.ts";

	expect(
		await inspect({
			[assembly]: [
				'import "../index";',
				'export * from "../settings";',
				'type Detail = import("./map/detail").Detail;',
			].join("\n"),
			[internal]: 'import "./map";',
			"src/app/warehouse/map/detail.ts": "",
		}),
	).toEqual([
		{ source: internal, target: childEntry, rule: "assembly-only" },
		{ source: assembly, target: "src/app/index.ts", rule: "direct-child-only" },
		{
			source: assembly,
			target: "src/app/settings/index.ts",
			rule: "direct-child-only",
		},
		{
			source: assembly,
			target: "src/app/warehouse/map/detail.ts",
			rule: "public-entry-required",
		},
	]);
});

test("a public entry cannot re-export its child's entry to the grandparent", async () => {
	const source = "src/app/warehouse/index.ts";

	expect(
		await inspect({
			[source]: 'export { Map } from "./map";',
		}),
	).toEqual([
		{
			source,
			target: "src/app/warehouse/map/index.ts",
			rule: "child-entry-cannot-be-reexported",
		},
	]);
});

test("product cannot import test fixtures through a glob, a mock or a stylesheet", async () => {
	const component = "src/app/warehouse/Warehouse.tsx";
	const styles = "src/app/warehouse/Warehouse.module.css";

	expect(
		await inspect({
			[component]: [
				'import.meta.glob(["/tests/support/*.ts", "!/tests/support/ignored.ts"]);',
				'mock.module("#fixtures/ignored", () => ({}));',
				"import(pathFromUrl);",
			].join("\n"),
			[styles]: '@import "../../../tests/support/fixture.css";',
			"tests/support/fixture.ts": "",
			"tests/support/fixture.css": "",
			"tests/support/ignored.ts": "",
		}),
	).toEqual([
		{
			source: styles,
			target: "tests/support/fixture.css",
			rule: "product-cannot-import-tests",
		},
		{
			source: component,
			target: "tests/support/fixture.ts",
			rule: "product-cannot-import-tests",
		},
		{
			source: component,
			target: "tests/support/ignored.ts",
			rule: "product-cannot-import-tests",
		},
		{ source: component, target: "<dynamic>", rule: "static-target-required" },
	]);
});

test("the former pages and entities layers cannot be reintroduced", async () => {
	expect(
		await inspect({
			"src/pages/map/index.ts": "",
			"src/entities/warehouse/index.ts": "",
		}),
	).toEqual([
		{
			source: "src/entities/warehouse/index.ts",
			target: "entities",
			rule: "unknown-source-layer",
		},
		{
			source: "src/pages/map/index.ts",
			target: "pages",
			rule: "unknown-source-layer",
		},
	]);
});
