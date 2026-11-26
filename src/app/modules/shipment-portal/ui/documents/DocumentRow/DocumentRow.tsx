import { categories, type Shipment } from "@/domain/shipment";
import { formatMoment } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";

export function DocumentRow({
	document,
	timeZone,
	isPending,
	isDownloading,
	onDownload,
}: {
	document: Shipment["documents"][number];
	timeZone: string;
	isPending: boolean;
	isDownloading: boolean;
	onDownload: (id: string, name: string) => Promise<void>;
}) {
	const downloadLabel = `Скачать ${document.name}`;
	const buttonLabel = isDownloading ? "Скачиваем…" : "Скачать";

	function handleDownload() {
		void onDownload(document.id, document.name);
	}

	return (
		<tr>
			<th scope="row">{document.name}</th>
			<td>{categories[document.category]}</td>
			<td>{formatMoment(document.uploaded_at, timeZone)}</td>
			<td>{document.version}</td>
			<td>
				<Button
					variant="default"
					size="sm"
					disabled={isPending}
					aria-label={downloadLabel}
					onClick={handleDownload}
				>
					{buttonLabel}
				</Button>
			</td>
		</tr>
	);
}
