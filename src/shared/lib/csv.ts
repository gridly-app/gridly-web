type CsvCell = string | number | null;

export function encodeCsv(
	rows: readonly (readonly CsvCell[])[],
	{ separator = ",", includeBom = false }: { separator?: "," | ";"; includeBom?: boolean } = {},
) {
	const lines = rows.map((row) => row.map(encodeCell).join(separator));
	const text = lines.join("\r\n");

	return includeBom ? `\uFEFF${text}` : text;
}

function encodeCell(value: CsvCell) {
	const text = String(value ?? "");
	const isFormula = typeof value === "string" && /^\s*[=+@-]|^[\t\r\n]/.test(value);
	const escaped = text.replaceAll('"', '""');

	return isFormula ? `"'${escaped}"` : `"${escaped}"`;
}
