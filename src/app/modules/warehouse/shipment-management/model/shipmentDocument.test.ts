import { expect, test } from "bun:test";

import { validateShipmentDocument } from "./shipmentDocument";

test.each(["pdf", "document.", "document.exe"])(
	"rejects the unsupported filename %s",
	(name) => {
		const file = new File(["file"], name);

		expect(() => validateShipmentDocument(file)).toThrow("Поддерживаются PDF");
	},
);

test("rejects an empty file", () => {
	expect(() => validateShipmentDocument(new File([], "document.pdf"))).toThrow(
		"Выберите непустой файл.",
	);
});

test("accepts an uppercase extension at the size limit and rejects the next byte", () => {
	const limit = new Uint8Array(20 * 1024 * 1024);

	expect(() =>
		validateShipmentDocument(new File([limit], "document.PDF")),
	).not.toThrow();
	expect(() =>
		validateShipmentDocument(new File([limit, "x"], "document.pdf")),
	).toThrow("Размер файла превышает 20 МиБ.");
});
