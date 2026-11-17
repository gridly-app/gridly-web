import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { StatusBadge as Badge } from "@/ports/warehouse";
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

import type { useRobotsPage } from "../../model/useRobotsPage";

export interface RobotsTableProps {
	hiddenColumns: readonly number[];
	model: Pick<
		ReturnType<typeof useRobotsPage>,
		"warehouseId" | "visibleRobots" | "pending" | "setEditing" | "removeRobot"
	>;
}

export function RobotsTable({ model, hiddenColumns }: RobotsTableProps) {
	const { visibleRobots, pending, warehouseId } = model;
	const mode = useWorkspaceMode();
	const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(
		null,
	);
	const [error, setError] = useState("");
	const [deletingPending, setDeletingPending] = useState(false);
	async function confirmDelete() {
		if (!deleting || deletingPending) return;
		setDeletingPending(true);
		setError("");
		try {
			const result = await model.removeRobot(deleting.id);
			if (result.ok) setDeleting(null);
			else setError(errorMessage(result.error));
		} catch (failure) {
			setError(errorMessage(failure));
		} finally {
			setDeletingPending(false);
		}
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
					{visibleRobots.map((r) => (
						<TableRow key={r.id}>
							<TableCell>
								<b>{r.name}</b>
							</TableCell>
							<TableCell>{r.rolesLabel}</TableCell>
							<TableCell>{r.speed} кл./тик</TableCell>
							<TableCell>{r.capacity} м³</TableCell>
							<TableCell>
								<strong>{r.assignment.title}</strong>
								{r.assignment.order && (
									<div>
										{r.assignment.order.kind ? (
											<Link
												to={{
													pathname: warehousePath(
														mode,
														warehouseId,
														r.assignment.order.kind,
													),
													search: new URLSearchParams({
														order: r.assignment.order.id,
													}).toString(),
												}}
											>
												{r.assignment.order.kind === "inbound"
													? "Поставка"
													: "Отгрузка"}{" "}
												{r.assignment.order.number}
											</Link>
										) : (
											<span>Заказ {r.assignment.order.number}</span>
										)}
										<TableNote>{r.assignment.detail}</TableNote>
									</div>
								)}
							</TableCell>
							<TableCell>
								<Badge value={r.status} />
							</TableCell>
							<TableCell>
								<TableActions>
									<IconButton
										label="Изменить"
										icon={<IconPencil size={16} />}
										variant="secondary"
										disabled={pending || !r.canEdit}
										onClick={() => model.setEditing(r)}
									/>
									<IconButton
										label="Удалить"
										icon={<IconTrash size={16} />}
										variant="destructive-outline"
										disabled={!r.canDelete || pending}
										title={
											r.blockedReason ||
											(!r.canDelete ? "Удаление недоступно" : undefined)
										}
										onClick={() => {
											setError("");
											setDeleting({ id: r.id, name: r.name });
										}}
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
				pending={pending || deletingPending}
				error={error}
				onConfirm={confirmDelete}
				onCancel={() => setDeleting(null)}
			/>
		</>
	);
}
