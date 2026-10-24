import { IconRobot } from "@tabler/icons-react";
import { StatusBadge as Badge } from "@/entities/warehouse";
import {
	Button,
	Table,
	TableActions,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableIcon,
	TableRow,
} from "@/shared/ui";

import type { useRobotsPage } from "../model/useRobotsPage";

export interface RobotsTableProps {
	model: Pick<
		ReturnType<typeof useRobotsPage>,
		"visibleRobots" | "pending" | "setEditing" | "removeRobot"
	>;
}

export function RobotsTable({ model }: RobotsTableProps) {
	const { visibleRobots, pending } = model;

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Робот</TableHead>
					<TableHead>Специализация</TableHead>
					<TableHead>Скорость</TableHead>
					<TableHead>Груз</TableHead>
					<TableHead>Статус</TableHead>
					<TableHead />
				</TableRow>
			</TableHeader>
			<TableBody>
				{visibleRobots.map((r) => (
					<TableRow key={r.id}>
						<TableCell>
							<TableIcon>
								<IconRobot size={18} />
							</TableIcon>
							<b>{r.name}</b>
						</TableCell>
						<TableCell>{r.rolesLabel}</TableCell>
						<TableCell>{r.speed} кл./тик</TableCell>
						<TableCell>{r.capacity} м³</TableCell>
						<TableCell>
							<Badge value={r.status} />
						</TableCell>
						<TableCell>
							<TableActions>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => model.setEditing(r)}
								>
									Изменить
								</Button>
								<Button
									size="sm"
									variant="ghost"
									disabled={!r.canDelete || pending}
									title="Удаление доступно только свободным роботам"
									onClick={() => void model.removeRobot(r.id)}
								>
									Удалить
								</Button>
							</TableActions>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
