import { useSettingsPage } from "../model/useSettingsPage";
import { SettingsForm } from "./SettingsForm";
export function SettingsPage() {
	const { warehouse, execute, pending } = useSettingsPage();
	return (
		<SettingsForm
			key={warehouse.id}
			w={warehouse}
			execute={execute}
			pending={pending}
		/>
	);
}
