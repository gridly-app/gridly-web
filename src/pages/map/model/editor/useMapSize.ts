import { type SubmitEvent, useState } from "react";
import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";

export function useMapSize({
	w,
	command,
}: {
	w: Pick<Warehouse, "width" | "height" | "allowedActions">;
	command: CommandExecutor;
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
		width: w.width,
		height: w.height,
		supported: !!w.allowedActions?.includes("resize"),
	};
}
