import { accountScenario } from "./scenarios/account";
import { catalogScenario } from "./scenarios/catalog";
import { demoScenario } from "./scenarios/demo";
import { destructiveConfirmationScenario } from "./scenarios/destructiveConfirmation";
import { inventoryScenario } from "./scenarios/inventory";
import { mapEditorScenario } from "./scenarios/mapEditor";
import { ordersScenario } from "./scenarios/orders";
import { permissionsScenario } from "./scenarios/permissions";
import { responsiveLayoutScenario } from "./scenarios/responsiveLayout";
import { robotScenario } from "./scenarios/robot";
import { routeDragScenario } from "./scenarios/routeDrag";
import { warehouseDimensionsScenario } from "./scenarios/warehouseDimensions";
import { warehouseLiveScenario } from "./scenarios/warehouseLive";
import { warehouseNavigationScenario } from "./scenarios/warehouseNavigation";
import { warehouseReportScenario } from "./scenarios/warehouseReport";
import { warehouseSettingsScenario } from "./scenarios/warehouseSettings";
import { output, runScenarios } from "./uiBrowserFixture";

const scenarios = [
	["account", accountScenario],
	["warehouse-navigation", warehouseNavigationScenario],
	["catalog", catalogScenario],
	["inventory", inventoryScenario],
	["warehouse-live", warehouseLiveScenario],
	["robot", robotScenario],
	["destructive-confirmation", destructiveConfirmationScenario],
	["warehouse-settings", warehouseSettingsScenario],
	["warehouse-dimensions", warehouseDimensionsScenario],
	["orders", ordersScenario],
	["map-editor", mapEditorScenario],
	["route-drag", routeDragScenario],
	["warehouse-report", warehouseReportScenario],
	["responsive-layout", responsiveLayoutScenario],
	["permissions", permissionsScenario],
	["demo", demoScenario],
] as const;

const name = process.env.GRIDLY_UI_SCENARIO;
if (name === "warehouse-live" && process.env.GRIDLY_UI_URL)
	throw new Error("The warehouse-live scenario requires the local SSE fixture");
const selected = name
	? scenarios.filter(([scenario]) => scenario === name)
	: scenarios;
if (!selected.length) throw new Error(`Unknown UI scenario: ${name}`);

await runScenarios(selected);
console.log(`UI checks passed. Screenshots: ${output}`);
