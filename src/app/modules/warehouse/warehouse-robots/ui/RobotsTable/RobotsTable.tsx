import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { StatusBadge } from "@/ports/warehouse";
import { errorMessage } from "@/shared/lib";
import { IconButton } from "@/shared/ui/controls";
import {
	Table,
	TableActions,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableNote,
	TableRow,
} from "@/shared/ui/dataDisplay";
import { Link } from "@/shared/ui/navigation";
import { ConfirmDialog } from "@/shared/ui/overlays";

import type { RobotRow, useRobotsPage } from "../../model/useRobotsPage";

const orderKindLabels = { inbound: "Поставка", outbound: "Отгрузка" };

export function RobotsTable({
	model,
	hiddenColumns,
}: {
	model: Pick<
		ReturnType<typeof useRobotsPage>,
		"warehouseId" | "visibleRobots" | "pending" | "setEditing" | "removeRobot"
	>;
	hiddenColumns: readonly number[];
}) {
	const { visibleRobots, pending, warehouseId } = model;
	const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(
		null,
	);
	const [error, setError] = useState("");
	const [isDeleting, setIsDeleting] = useState(false);

	async function handleConfirmDelete() {
		if (!deleting || isDeleting) return;

		setIsDeleting(true);
		setError("");

		try {
			await model.removeRobot(deleting.id);
			setDeleting(null);
		} catch (removeError) {
			setError(errorMessage(removeError));
		} finally {
			setIsDeleting(false);
		}
	}

	function handleRequestDelete(robot: RobotRow) {
		setError("");
		setDeleting({ id: robot.id, name: robot.name });
	}

	function handleCancelDelete() {
		setDeleting(null);
	}

	return (
		<>
			<Table hiddenColumns={hiddenColumns}>
				<TableHeader>
					<TableRow>
						<TableHead>Робот</TableHead>
						<TableHead>Специализация</TableHead>
						<TableHead>Скорость</TableHead>
						<TableHead>Груз</TableHead>
						<TableHead>Текущая задача</TableHead>
						<TableHead>Статус</TableHead>
						<TableHead />
					</TableRow>
				</TableHeader>
				<TableBody>
					{visibleRobots.map((robot) => (
						<TableRow key={robot.id}>
							<TableCell>
								<b>{robot.name}</b>
							</TableCell>
							<TableCell>{robot.rolesLabel}</TableCell>
							<TableCell>{robot.speed} кл./тик</TableCell>
							<TableCell>{robot.capacity} м³</TableCell>
							<TableCell>
								<RobotAssignment robot={robot} warehouseId={warehouseId} />
							</TableCell>
							<TableCell>
								<StatusBadge value={robot.status} />
							</TableCell>
							<TableCell>
								<TableActions>
									<IconButton
										label="Изменить"
										icon={<IconPencil size={16} />}
										variant="secondary"
										disabled={pending || !robot.canEdit}
										onClick={() => model.setEditing(robot)}
									/>
									<IconButton
										label="Удалить"
										icon={<IconTrash size={16} />}
										variant="destructive-outline"
										disabled={!robot.canDelete || pending}
										title={
											robot.blockedReason ||
											(robot.canDelete ? undefined : "Удаление недоступно")
										}
										onClick={() => handleRequestDelete(robot)}
									/>
								</TableActions>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<ConfirmDialog
				open={deleting !== null}
				title="Удалить робота?"
				description={`Робот «${deleting?.name ?? ""}» будет удалён со склада.`}
				confirmLabel="Удалить"
				pending={pending || isDeleting}
				error={error}
				onConfirm={handleConfirmDelete}
				onCancel={handleCancelDelete}
			/>
		</>
	);
}

function RobotAssignment({
	robot,
	warehouseId,
}: {
	robot: RobotRow;
	warehouseId: string;
}) {
	const mode = useWorkspaceMode();
	const { title, order, detail } = robot.assignment;

	if (!order) return <strong>{title}</strong>;

	const orderLabel = order.kind ? (
		<Link
			to={{
				pathname: warehousePath(mode, warehouseId, order.kind),
				search: new URLSearchParams({ order: order.id }).toString(),
			}}
		>
			{orderKindLabels[order.kind]} {order.number}
		</Link>
	) : (
		<span>Заказ {order.number}</span>
	);

	return (
		<>
			<strong>{title}</strong>
			<div>
				{orderLabel}
				<TableNote>{detail}</TableNote>
			</div>
		</>
	);
}
