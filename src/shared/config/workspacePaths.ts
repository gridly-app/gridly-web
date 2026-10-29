export function warehousePath(
	mode: "standard" | "demo",
	id: string,
	page = "map",
) {
	return `${mode === "demo" ? "/demo" : ""}/warehouses/${encodeURIComponent(id)}/${page}`;
}
