import { useState } from "react";

import type {
	Category,
	CategoryInput,
	CommandExecutor,
} from "@/domain/warehouse";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { useWarehouseResources } from "@/ports/warehouse";
import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Link } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";

import type { CatalogWarehouse } from "../../model/warehouseResources";
import { CategoryForm } from "../CategoryForm/CategoryForm";
import { CategoryStorage } from "../CategoryStorage/CategoryStorage";

import styles from "./CategoryDetail.module.css";

const sectionLinks = [
	{ section: "inbound", label: "Поставки" },
	{ section: "outbound", label: "Отгрузки" },
	{ section: "inventory", label: "Остатки" },
] as const;

export function CategoryDetail({
	category,
	warehouse,
	execute,
	isPending,
	onSave,
	onClose,
}: {
	category: Category;
	warehouse: CatalogWarehouse;
	execute: CommandExecutor;
	isPending: boolean;
	onSave: (input: CategoryInput) => Promise<void>;
	onClose: () => void;
}) {
	const mode = useWorkspaceMode();
	const [archiveError, setArchiveError] = useState("");
	const [isArchiving, setIsArchiving] = useState(false);
	const [isRenaming, setIsRenaming] = useState(false);
	const canArchive =
		Boolean(category.allowedActions?.includes("archive")) && !category.archived;
	const canEdit = Boolean(category.allowedActions?.includes("edit"));
	const categorySearch = new URLSearchParams({
		category: category.id,
	}).toString();

	async function handleArchive() {
		setIsArchiving(true);
		setArchiveError("");

		try {
			await execute("archiveCategory", category.id);
			onClose();
		} catch (error) {
			setArchiveError(errorMessage(error));
		} finally {
			setIsArchiving(false);
		}
	}

	function handleRename() {
		setIsRenaming(true);
	}

	return (
		<Modal title={category.name} onClose={onClose} wide>
			{archiveError && <Feedback tone="error">{archiveError}</Feedback>}
			{canArchive && (
				<Button disabled={isPending || isArchiving} onClick={handleArchive}>
					Архивировать категорию
				</Button>
			)}
			<div className={styles.actions}>
				<nav className={styles.sectionLinks} aria-label="Разделы по категории">
					{sectionLinks.map(({ section, label }) => (
						<Link
							key={section}
							asButton
							size="sm"
							variant="secondary"
							to={{
								pathname: warehousePath(mode, warehouse.id, section),
								search: categorySearch,
							}}
						>
							{label}
						</Link>
					))}
				</nav>
				{canEdit && !isRenaming && (
					<Button size="sm" variant="secondary" onClick={handleRename}>
						Переименовать
					</Button>
				)}
			</div>
			{canEdit && isRenaming && (
				<CategoryForm
					category={category}
					isPending={isPending}
					onSave={onSave}
				/>
			)}
			<div className={styles.storageHeader}>
				<h3>Правила хранения</h3>
				<Link to={warehousePath(mode, warehouse.id, "map")}>
					Открыть карту склада
				</Link>
			</div>
			<CategoryStorageSection
				category={category}
				warehouse={warehouse}
				execute={execute}
				isPending={isPending}
			/>
		</Modal>
	);
}

function CategoryStorageSection({
	category,
	warehouse,
	execute,
	isPending,
}: {
	category: Category;
	warehouse: CatalogWarehouse;
	execute: CommandExecutor;
	isPending: boolean;
}) {
	const map = useWarehouseResources(warehouse, ["map"]);

	if (map.error && !map.data) {
		return (
			<Feedback tone="error" action={<RetryButton onRetry={map.retry} />}>
				Не удалось загрузить зоны склада.
			</Feedback>
		);
	}

	if (!map.data)
		return <Feedback tone="loading">Загружаем зоны склада…</Feedback>;

	return (
		<CategoryStorage
			key={map.data.version}
			category={category}
			warehouse={map.data}
			execute={execute}
			isPending={isPending}
		/>
	);
}
