import type { Ref } from "react";
import { Button, StableLabel, Toolbar } from "@/shared/ui/controls";
import { StatusBadge } from "@/shared/ui/dataDisplay";
import type { useMapSimulation } from "../../model/viewport/useMapSimulation";
import mapStyles from "./MapToolbar.module.css";

interface MapToolbarProps {
	running: boolean;
	robotCount: number | undefined;
	pending: boolean;
	simulation: Pick<
		ReturnType<typeof useMapSimulation>,
		"activeRobots" | "supported" | "toggle"
	>;
	viewTrigger: Ref<HTMLButtonElement>;
	openView: () => void;
}

export function MapToolbar({
	running,
	robotCount,
	pending,
	simulation,
	viewTrigger,
	openView,
}: MapToolbarProps) {
	return (
		<Toolbar aria-label="Действия карты" className={mapStyles.toolbar}>
			<StatusBadge
				compactOnMobile
				status={running ? "online" : "offline"}
				primaryText={`${simulation.activeRobots ?? "—"} в работе`}
				animated={running}
			>
				/ {robotCount ?? "—"} роботов
			</StatusBadge>
			<div className={mapStyles.actions}>
				{simulation.supported && (
					<Button
						className={mapStyles.button}
						variant="ghost"
						onClick={() => {
							void simulation.toggle();
						}}
						disabled={pending}
					>
						<StableLabel variants={["Пауза", "Продолжить"]}>
							{running ? "Пауза" : "Продолжить"}
						</StableLabel>
					</Button>
				)}
				<Button
					className={mapStyles.button}
					ref={viewTrigger}
					variant="secondary"
					onClick={openView}
					tooltip="Открыть карту на всю рабочую область"
				>
					Режим просмотра
				</Button>
			</div>
		</Toolbar>
	);
}
