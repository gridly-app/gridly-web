import { type SubmitEvent, useState } from "react";
import type { CommandExecutor, Warehouse } from "@/domain/warehouse";
import { errorMessage } from "@/shared/lib";

export function useMapSize({
	warehouse,
	command,
	blocked,
}: {
	warehouse: Pick<Warehouse, "width" | "height" | "allowedActions">;
	command: CommandExecutor;
	blocked: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);

	function show() {
		setError("");
		setOpen(true);
	}

	function close() {
		if (!saving) {
			setOpen(false);
		}
	}

	async function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (blocked || saving) return;

		const data = new FormData(event.currentTarget);

		setSaving(true);
		setError("");
		try {
			await command("resize", {
				width: Number(data.get("width")),
				height: Number(data.get("height")),
			});
			setOpen(false);
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setSaving(false);
		}
	}

	return {
		open,
		show,
		close,
		submit,
		saving,
		error,
		width: warehouse.width,
		height: warehouse.height,
		supported: !blocked && !!warehouse.allowedActions?.includes("resize"),
		unavailableReason: blocked
			? "Завершите операцию с планировкой или закройте черновик перед изменением размера."
			: "Изменение размера недоступно по данным сервера.",
	};
}
