import { useState } from "react";
import { ScrollArea, SegmentedControl } from "@/shared/ui";
import { useSettingsPage } from "../model/useSettingsPage";
import { CabinetSettings } from "./CabinetSettings";
import { SettingsForm } from "./SettingsForm";
import styles from "./SettingsPage.module.css";
import { WarehouseRecords } from "./WarehouseRecords";

export function SettingsPage() {
	const { warehouse, execute, pending } = useSettingsPage();
	const [tab, setTab] = useState<"general" | "processes" | "data">("general");
	return (
		<ScrollArea className={styles.pageScroll}>
			<div className={styles.settings}>
				<header className={styles.heading}>
					<div>
						<h2>Настройки склада</h2>
						<p>{warehouse.name}</p>
					</div>
					<SegmentedControl
						aria-label="Раздел настроек"
						value={tab}
						onValueChange={setTab}
						items={[
							{ value: "general", label: "Склад" },
							{ value: "processes", label: "Процессы" },
							{ value: "data", label: "Данные" },
						]}
					/>
				</header>
				<section
					className={styles.panel}
					hidden={tab !== "general"}
					aria-label="Основные настройки склада"
				>
					<div className={styles.settingsGrid}>
						<SettingsForm
							key={`${warehouse.id}-general`}
							section="general"
							w={warehouse}
							execute={execute}
							pending={pending}
						/>
						<CabinetSettings
							key={`${warehouse.id}-policies`}
							section="policies"
							w={warehouse}
							execute={execute}
							pending={pending}
						/>
					</div>
				</section>
				<section
					className={styles.panel}
					hidden={tab !== "processes"}
					aria-label="Подтверждения и зоны"
				>
					<div className={styles.settingsGrid}>
						<SettingsForm
							key={`${warehouse.id}-confirmations`}
							section="confirmations"
							w={warehouse}
							execute={execute}
							pending={pending}
						/>
						<CabinetSettings
							key={`${warehouse.id}-zones`}
							section="zones"
							w={warehouse}
							execute={execute}
							pending={pending}
						/>
					</div>
				</section>
				<section
					className={styles.panel}
					hidden={tab !== "data"}
					aria-label="Управление данными"
				>
					<WarehouseRecords w={warehouse} execute={execute} pending={pending} />
				</section>
			</div>
		</ScrollArea>
	);
}
