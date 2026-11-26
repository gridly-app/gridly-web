import { encodeCsv } from "@/shared/lib";

export function shipmentCsv(
	headers: string[],
	rows: (string | number | null)[][],
) {
	return encodeCsv([headers, ...rows], { separator: ";", includeBom: true });
}
