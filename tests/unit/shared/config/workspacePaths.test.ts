import { expect, test } from "bun:test";
import { warehousePath } from "@/shared/config/workspacePaths";

test("all workspace links use the explicit mode and encode the warehouse identity", () => {
	expect(warehousePath("demo", "a/b", "catalog")).toBe(
		"/demo/warehouses/a%2Fb/catalog",
	);
	expect(warehousePath("standard", "personal")).toBe(
		"/warehouses/personal/map",
	);
});
