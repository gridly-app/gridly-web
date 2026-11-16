import { expect, test } from "bun:test";
import { warehousePath } from "./workspacePaths";

test("all workspace links use the explicit mode and encode the warehouse identity", () => {
	expect(warehousePath("sandbox", "a/b", "catalog")).toBe(
		"/sandbox/warehouses/a%2Fb/catalog",
	);
	expect(warehousePath("standard", "personal")).toBe(
		"/warehouses/personal/map",
	);
});
