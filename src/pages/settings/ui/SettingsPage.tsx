import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { ScrollArea } from "@/shared/ui/navigation";
import { useSettingsPage } from "../model/useSettingsPage";
import { CabinetSettings } from "./CabinetSettings";
import { SettingsForm } from "./SettingsForm";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
	const {
		warehouse,
		execute,
		pending,
		settingsError,
		retrySettings,
		settingsLoading,
	} = useSettingsPage();
	const props = {
		w: warehouse,
		execute,
		pending,
		settingsError,
		retrySettings,
		settingsLoading,
	};
	return (
		<ScrollArea className={styles.pageScroll}>
			<div className={styles.settings}>
				<header className={styles.heading}>
					<h2>Настройки склада</h2>
					<p>{warehouse.name}</p>
				</header>
				{settingsLoading && (
					<Feedback tone="loading">Загружаем настройки…</Feedback>
				)}
				{settingsError && (
					<Feedback
						tone="error"
						action={<RetryButton onRetry={retrySettings} />}
					>
						Не удалось загрузить настройки города и порога остатка.{" "}
						{errorMessage(settingsError)}
					</Feedback>
				)}
				<div className={styles.settingsGrid} key={warehouse.id}>
					<SettingsForm section="general" {...props} />
					<SettingsForm section="confirmations" {...props} />
					<CabinetSettings {...props} />
				</div>
			</div>
		</ScrollArea>
	);
}
