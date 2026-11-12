import { useState } from "react";
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
import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Link } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";
import styles from "./CategoryDetail.module.css";
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
			<div className={styles.actions}>
				<nav className={styles.sectionLinks} aria-label="Разделы по категории">
					{sections.map(([page, label]) => (
						<Link
							key={page}
							asButton
							size="sm"
							variant="secondary"
							to={{
								pathname: warehousePath(mode, warehouse.id, page),
								search: new URLSearchParams({
									category: category.id,
								}).toString(),
							}}
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
			<div className={styles.storageHeader}>
				<h3>Правила хранения</h3>
				<Link to={warehousePath(mode, warehouse.id, "map")}>
					Открыть карту склада
				</Link>
			</div>
			{map.loading ? (
				<Feedback tone="loading">Загружаем зоны склада…</Feedback>
			) : map.error ? (
				<Feedback tone="error" action={<RetryButton onRetry={map.retry} />}>
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
