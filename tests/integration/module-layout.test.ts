import { expect, test } from "bun:test";
import { access, readdir } from "node:fs/promises";

test.each(["audit", "guest-links", "orders", "system", "users", "warehouses"])(
	"the application declares %s alongside administration",
	async (name) => {
		const modules = new URL("../../src/app/modules/", import.meta.url);
		const entry = new URL(`${name}/index.ts`, modules);
		const nestedDirectory = new URL(`administration/${name}/`, modules);

		expect(await Bun.file(entry).exists()).toBe(true);
		await expect(access(nestedDirectory)).rejects.toMatchObject({
			code: "ENOENT",
		});
	},
);

test.each([
	["administration", "Administration"],
	["audit", "Audit"],
	["guest-links", "GuestLinks"],
	["orders", "Orders"],
	["system", "System"],
	["users", "Users"],
	["warehouses", "Warehouses"],
])("%s uses the administration module layout", async (name, component) => {
	const directory = new URL(`../../src/app/modules/${name}/`, import.meta.url);
	const entries = await readdir(directory, { withFileTypes: true });
	const directories = new Set(["api", "config", "model", "ui"]);
	const rootFiles = new Set([
		"index.ts",
		`${component}.tsx`,
		`${component}.module.css`,
		"shared.module.css",
		`${name}.compose.ts`,
		`${name}.compose.tsx`,
	]);
	const misplaced = entries
		.filter(
			(entry) =>
				!(entry.isDirectory()
					? directories.has(entry.name)
					: rootFiles.has(entry.name)),
		)
		.map(({ name }) => name);

	expect(misplaced).toEqual([]);
	expect(await Bun.file(new URL(`${component}.tsx`, directory)).exists()).toBe(
		true,
	);

	if (!entries.some((entry) => entry.isDirectory() && entry.name === "ui"))
		return;

	const ui = new URL("ui/", directory);
	const uiEntries = await readdir(ui, { withFileTypes: true });
	const misplacedUi = uiEntries
		.filter((entry) => !entry.isDirectory())
		.map(({ name }) => name);

	expect(misplacedUi).toEqual([]);

	for (const entry of uiEntries.filter((entry) => entry.isDirectory())) {
		const componentDirectory = new URL(`${entry.name}/`, ui);
		const component = Bun.file(
			new URL(`${entry.name}.tsx`, componentDirectory),
		);
		const componentStyles = `${entry.name}.module.css`;
		const files = await readdir(componentDirectory);
		const styles = files.filter((file) => file.endsWith(".module.css"));

		expect(await component.exists()).toBe(true);
		expect(styles.filter((file) => file !== componentStyles)).toEqual([]);

		if (styles.includes(componentStyles)) {
			expect(await component.text()).toContain(`"./${componentStyles}"`);
		}
	}
});
