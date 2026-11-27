import type { Ref } from "react";

import { Button, StableLabel, Toolbar } from "@/shared/ui/controls";
import { StatusBadge } from "@/shared/ui/dataDisplay";

import type { useMapSimulation } from "../../model/viewport/useMapSimulation";

import styles from "./MapToolbar.module.css";

export function MapToolbar({
	running,
	robotCount,
	isPending,
	simulation,
	viewTrigger,
	onOpenView,
}: {
	running: boolean;
	robotCount: number;
	isPending: boolean;
	simulation: Pick<
		ReturnType<typeof useMapSimulation>,
		"activeRobots" | "supported" | "toggle"
	>;
	viewTrigger: Ref<HTMLButtonElement>;
	onOpenView: () => void;
}) {
	function handleToggleSimulation() {
		void simulation.toggle();
	}

	return (
		<Toolbar aria-label="Действия карты" className={styles.toolbar}>
			<StatusBadge
				compactOnMobile
				status={running ? "online" : "offline"}
				primaryText={`${simulation.activeRobots} в работе`}
				animated={running}
			>
				/ {robotCount} роботов
			</StatusBadge>
			<div className={styles.actions}>
				{simulation.supported && (
					<Button
						className={styles.button}
						variant="ghost"
						onClick={handleToggleSimulation}
						disabled={isPending}
					>
						<StableLabel variants={["Пауза", "Продолжить"]}>
							{running ? "Пауза" : "Продолжить"}
						</StableLabel>
					</Button>
				)}
				<Button
					className={styles.button}
					ref={viewTrigger}
					variant="secondary"
					onClick={onOpenView}
					tooltip="Открыть карту на всю рабочую область"
				>
					Режим просмотра
				</Button>
			</div>
		</Toolbar>
	);
}
