import { useSettingsPage } from "../model/useSettingsPage";
import { SettingsForm } from "./SettingsForm";

export function SettingsPage() {
	const { warehouse, saveSettings, pending, savedVersion } = useSettingsPage();

	return (
		<SettingsForm
			key={savedVersion}
			w={warehouse}
			pending={pending}
			save={saveSettings}
		/>
	);
}
