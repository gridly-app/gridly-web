export function shipmentPath(warehouseId: string, orderId: string) {
	return `/warehouses/${encodeURIComponent(warehouseId)}/orders/${encodeURIComponent(orderId)}/shipment`;
}
