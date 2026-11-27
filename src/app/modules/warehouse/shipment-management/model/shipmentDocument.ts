import { UserError } from "@/shared/lib";

const extensions = ["pdf", "png", "jpg", "jpeg", "xlsx", "docx", "csv"];
const sizeLimitBytes = 20 * 1024 * 1024;

export const documentVersionLimit = 100;
export const documentSizeLimitLabel = "20 МиБ";
export const documentFormatsLabel = "PDF, PNG, JPEG, XLSX, DOCX и CSV";
export const documentAccept = extensions
	.map((extension) => `.${extension}`)
	.join(",");

function fileExtension(name: string) {
	const separator = name.lastIndexOf(".");

	return separator > 0 ? name.slice(separator + 1).toLowerCase() : "";
}

export function validateShipmentDocument(file: FormDataEntryValue | null) {
	if (!(file instanceof File) || !file.size)
		throw new UserError("Выберите непустой файл.");
	if (file.size > sizeLimitBytes)
		throw new UserError(`Размер файла превышает ${documentSizeLimitLabel}.`);

	const extension = fileExtension(file.name);

	if (!extensions.includes(extension))
		throw new UserError(`Поддерживаются ${documentFormatsLabel}.`);
}
