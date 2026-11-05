import { ScrollArea } from "@/shared/ui";
import { useSettingsPage } from "../model/useSettingsPage";
import { CabinetSettings } from "./CabinetSettings";
import { SettingsForm } from "./SettingsForm";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
	const { warehouse, execute, pending } = useSettingsPage();
	const props = { w: warehouse, execute, pending };
	return (
		<ScrollArea className={styles.pageScroll}>
			<div className={styles.settings}>
				<header className={styles.heading}>
					<h2>Настройки склада</h2>
					<p>{warehouse.name}</p>
				</header>
				<div className={styles.settingsGrid} key={warehouse.id}>
					<SettingsForm section="general" {...props} />
					<SettingsForm section="confirmations" {...props} />
					<CabinetSettings {...props} />
				</div>
			</div>
		</ScrollArea>
	);
}
