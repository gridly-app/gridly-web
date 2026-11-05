import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { StatusBadge as Badge } from "@/entities/warehouse";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { errorMessage } from "@/shared/lib";
import {
	ConfirmDialog,
	IconButton,
	Link,
	Table,
	TableActions,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui";

import type { useRobotsPage } from "../model/useRobotsPage";

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
						<TableHead style={{ width: 150 }}>Робот</TableHead>
						<TableHead style={{ width: 150 }}>Специализация</TableHead>
						<TableHead style={{ width: 110 }}>Скорость</TableHead>
						<TableHead style={{ width: 110 }}>Груз</TableHead>
						<TableHead style={{ width: 230 }}>Текущая задача</TableHead>
						<TableHead style={{ width: 140 }}>Статус</TableHead>
						<TableHead style={{ width: 88 }} />
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
												render={
													<RouterLink
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
													/>
												}
											>
												{r.assignment.order.kind === "inbound"
													? "Поставка"
													: "Отгрузка"}{" "}
												{r.assignment.order.number}
											</Link>
										) : (
											<span>Заказ {r.assignment.order.number}</span>
										)}
										<small className="table-note">{r.assignment.detail}</small>
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
