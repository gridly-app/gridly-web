import { saveFile } from "@/shared/http";

const unsafeFileNameCharacters = /[<>:"/\\|?*\p{Cc}]/gu;

export function fileNamePart(value: string) {
	return value.replace(unsafeFileNameCharacters, "_");
}

export function saveCsvFile(csv: string, fileName: string) {
	const file = new Blob([csv], { type: "text/csv;charset=utf-8" });

	saveFile(file, fileName);
}
