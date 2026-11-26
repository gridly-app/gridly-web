import { UserError } from "@/shared/invariants";

const extensions = ["pdf", "png", "jpg", "jpeg", "xlsx", "docx", "csv"];
const sizeLimit = 20 * 1024 * 1024;
export const documentVersionLimit = 100;
const acceptedExtensions = extensions.map((extension) => `.${extension}`);
export const documentAccept = acceptedExtensions.join(",");

export function validateShipmentDocument(file: FormDataEntryValue | null) {
	if (!(file instanceof File) || !file.size)
		throw new UserError("Выберите непустой файл.");
	if (file.size > sizeLimit)
		throw new UserError("Размер файла превышает 20 МиБ.");

	const separator = file.name.lastIndexOf(".");
	const extension =
		separator > 0 ? file.name.slice(separator + 1).toLowerCase() : "";

	if (!extension || !extensions.includes(extension)) {
		throw new UserError("Поддерживаются PDF, PNG, JPEG, XLSX, DOCX и CSV.");
	}
}
