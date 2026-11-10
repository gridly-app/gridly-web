import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
	type Category,
	type CategoryInput,
	type CommandExecutor,
	useWarehouseResources,
	type Warehouse,
} from "@/entities/warehouse";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { errorMessage } from "@/shared/lib";
import { Button, Feedback, Link, Modal } from "@/shared/ui";
import { CategoryForm } from "./CategoryForm";
import { CategoryStorage } from "./CategoryStorage";

const sections = [
	["inbound", "Поставки"],
	["outbound", "Отгрузки"],
	["inventory", "Остатки"],
] as const;

export function CategoryDetail({
	category,
	warehouse,
	execute,
	pending,
	onSave,
	onClose,
}: {
	category: Category;
	warehouse: Warehouse;
	execute: CommandExecutor;
	pending: boolean;
	onSave: (input: CategoryInput) => Promise<void>;
	onClose: () => void;
}) {
	const mode = useWorkspaceMode();
	const [archiveError, setArchiveError] = useState("");
	const [archiving, setArchiving] = useState(false);
	const [editingName, setEditingName] = useState(false);
	const map = useWarehouseResources(warehouse, ["map"]);

	return (
		<Modal title={category.name} onClose={onClose} wide>
			{archiveError && <Feedback tone="error">{archiveError}</Feedback>}
			{category.allowedActions?.includes("archive") && !category.archived && (
				<Button
					disabled={pending || archiving}
					onClick={async () => {
						setArchiving(true);
						setArchiveError("");
						try {
							await execute("archiveCategory", category.id);
							onClose();
						} catch (error) {
							setArchiveError(errorMessage(error));
						} finally {
							setArchiving(false);
						}
					}}
				>
					Архивировать категорию
				</Button>
			)}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<nav className="flex flex-wrap gap-2" aria-label="Разделы по категории">
					{sections.map(([page, label]) => (
						<Link
							key={page}
							asButton
							size="sm"
							variant="secondary"
							render={
								<RouterLink
									to={{
										pathname: warehousePath(mode, warehouse.id, page),
										search: new URLSearchParams({
											category: category.id,
										}).toString(),
									}}
								/>
							}
						>
							{label}
						</Link>
					))}
				</nav>
				{category.allowedActions?.includes("edit") && !editingName && (
					<Button
						size="sm"
						variant="secondary"
						onClick={() => setEditingName(true)}
					>
						Переименовать
					</Button>
				)}
			</div>
			{editingName && category.allowedActions?.includes("edit") && (
				<CategoryForm category={category} pending={pending} onSave={onSave} />
			)}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3>Правила хранения</h3>
				<Link
					render={<RouterLink to={warehousePath(mode, warehouse.id, "map")} />}
				>
					Открыть карту склада
				</Link>
			</div>
			{map.loading ? (
				<Feedback tone="loading">Загружаем зоны склада…</Feedback>
			) : map.error ? (
				<Feedback
					tone="error"
					action={<Button onClick={() => void map.retry()}>Повторить</Button>}
				>
					Не удалось загрузить зоны склада.
				</Feedback>
			) : (
				<CategoryStorage
					key={map.warehouse.version}
					category={category}
					warehouse={map.warehouse}
					execute={execute}
					pending={pending}
				/>
			)}
		</Modal>
	);
}
