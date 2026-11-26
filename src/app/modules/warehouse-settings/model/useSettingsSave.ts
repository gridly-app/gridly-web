import { useState } from "react";
import { errorMessage, useSingleFlight } from "@/shared/lib";

export interface SettingsMessage {
	text: string;
	tone: "success" | "error";
}

export function useSettingsSave(pending: boolean) {
	const flight = useSingleFlight();
	const [message, setMessage] = useState<SettingsMessage | null>(null);

	async function writeWithMessage(write: () => Promise<void>) {
		setMessage(null);

		try {
			await write();
			setMessage({ text: "Сохранено", tone: "success" });
		} catch (error) {
			setMessage({ text: errorMessage(error), tone: "error" });
		}
	}

	async function save(write: () => Promise<void>) {
		if (pending) return;

		await flight.run(() => writeWithMessage(write));
	}

	function clearMessage() {
		setMessage(null);
	}

	return { isBusy: pending || flight.isRunning, message, save, clearMessage };
}
