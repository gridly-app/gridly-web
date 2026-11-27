import { expect } from "@playwright/test";

import type { UiScenario } from "../uiBrowserFixture";
import { workingShipmentSchema } from "../../../src/app/modules/warehouse/shipment-management/api/shipment.dto";
import { checkShipmentAudit } from "./shipmentAuditFlow";
import { checkShipmentEditor } from "./shipmentEditorFlow";
import { shipmentExample } from "./shipmentExamples";
import { checkGuestShipment } from "./shipmentGuestFlow";
import { checkShipmentTracking } from "./shipmentTrackingFlow";

export async function shipmentsScenario(scenario: UiScenario) {
	const { page, signIn } = scenario;
	const working = workingShipmentSchema.parse(
		shipmentExample("Рабочий снимок отгрузки"),
	);

	await checkGuestShipment(scenario);

	await page.setViewportSize({ width: 1440, height: 1000 });
	await signIn();
	const orderPath = "/warehouses/warehouse-demo/orders/order-out-2087/shipment";
	let saveStatus = 200;
	await page.route(`**/api/v1${orderPath}`, async (route) => {
		expect(route.request().headers().authorization).toMatch(/^Bearer /);
		if (route.request().method() === "PUT") {
			const body = route.request().postDataJSON();

			if (saveStatus === 412) {
				working.revision++;

				return route.fulfill({ status: 412, json: { code: "STALE_REVISION" } });
			}

			expect(body.revision).toBe(working.revision);
			expect(body.priority).toBe("normal");
			working.revision++;
			working.warehouse.priority = body.priority;
		}
		await route.fulfill({ json: working });
	});
	await checkShipmentTracking(scenario, working, orderPath);
	await checkShipmentEditor(scenario, working, orderPath, (status) => {
		saveStatus = status;
	});
	await checkShipmentAudit(scenario);
}
