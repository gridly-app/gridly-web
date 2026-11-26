import { accountScenario } from "./scenarios/account";
import {
	registrationScenario,
	signInHistoryScenario,
} from "./scenarios/signInHistory";
import { guestTokenSwitchScenario } from "./scenarios/shipmentGuestFlow";
import { shipmentAccessScenario } from "./scenarios/shipmentAccess";
import { administrationScenario } from "./scenarios/administration";
import { administrationRecoveryScenario } from "./scenarios/administrationRecovery";
import { catalogScenario } from "./scenarios/catalog";
import { inventoryScenario } from "./scenarios/inventory";
import { loadingScenario } from "./scenarios/loading";
import { mapBackScenario, mapEditorScenario } from "./scenarios/mapEditor";
import { mapSessionScenario } from "./scenarios/mapSession";
import { modeSwitchScenario } from "./scenarios/modeSwitch";
import { ordersScenario } from "./scenarios/orders";
import { permissionsScenario } from "./scenarios/permissions";
import { mobileNavigationScenario } from "./scenarios/mobileNavigation";
import {
	routeChunkRecoveryScenario,
	routeRecoveryScenario,
} from "./scenarios/routeRecovery";
import { robotScenario } from "./scenarios/robot";
import { routeDragScenario } from "./scenarios/routeDrag";
import { sandboxScenario } from "./scenarios/sandbox";
import { shipmentsScenario } from "./scenarios/shipments";
import { systemErrorsScenario } from "./scenarios/systemErrors";
import { warehouseDeletionScenario } from "./scenarios/warehouseDeletion";
import { warehouseDimensionsScenario } from "./scenarios/warehouseDimensions";
import { warehouseLiveScenario } from "./scenarios/warehouseLive";
import { warehouseNavigationScenario } from "./scenarios/warehouseNavigation";
import { warehouseReportScenario } from "./scenarios/warehouseReport";
import { warehouseSettingsScenario } from "./scenarios/warehouseSettings";
import { output, runScenarios } from "./uiBrowserFixture";

const scenarios = [
	["loading", loadingScenario],
	["account", accountScenario],
	["sign-in-history", signInHistoryScenario],
	["registration", registrationScenario],
	["shipment-access", shipmentAccessScenario],
	["guest-token-switch", guestTokenSwitchScenario],
	["warehouse-navigation", warehouseNavigationScenario],
	["warehouse-deletion", warehouseDeletionScenario],
	["catalog", catalogScenario],
	["inventory", inventoryScenario],
	["warehouse-live", warehouseLiveScenario],
	["robot", robotScenario],
	["warehouse-settings", warehouseSettingsScenario],
	["warehouse-dimensions", warehouseDimensionsScenario],
	["orders", ordersScenario],
	["shipments", shipmentsScenario],
	["administration", administrationScenario],
	["administration-recovery", administrationRecoveryScenario],
	["system-errors", systemErrorsScenario],
	["map-editor", mapEditorScenario],
	["map-back", mapBackScenario],
	["map-session", mapSessionScenario],
	["mode-switch", modeSwitchScenario],
	["route-drag", routeDragScenario],
	["warehouse-report", warehouseReportScenario],
	["mobile-navigation", mobileNavigationScenario],
	["route-recovery", routeRecoveryScenario],
	["route-chunk-recovery", routeChunkRecoveryScenario],
	["permissions", permissionsScenario],
	["sandbox", sandboxScenario],
] as const;

const name = process.env.GRIDLY_UI_SCENARIO;
const localOnly = [
	"loading",
	"warehouse-live",
	"map-session",
	"route-chunk-recovery",
];
if (name && localOnly.includes(name) && process.env.GRIDLY_UI_URL)
	throw new Error(`The ${name} scenario requires the local Vite fixture`);
const selected = name
	? scenarios.filter(([scenario]) => scenario === name)
	: scenarios.filter(
			([scenario]) =>
				!process.env.GRIDLY_UI_URL || !localOnly.includes(scenario),
		);
if (!selected.length) throw new Error(`Unknown UI scenario: ${name}`);

await runScenarios(selected);
console.log(`UI checks passed. Screenshots: ${output}`);
