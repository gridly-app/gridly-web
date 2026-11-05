import {
	IconArrowBackUp,
	IconArrowForwardUp,
	IconChevronLeft,
	IconChevronRight,
	IconRotate,
} from "@tabler/icons-react";
import { Button, Feedback, Toolbar, ToolbarGroup } from "@/shared/ui";
import {
	type EditLayoutToolbarOptions,
	useEditLayoutToolbar,
} from "../../model/layout/useEditLayoutToolbar";
import styles from "./EditLayoutToolbar.module.css";

export type EditLayoutToolbarProps = EditLayoutToolbarOptions & {
	className?: string | undefined;
};
export function EditLayoutToolbar(props: EditLayoutToolbarProps) {
	const { container, ...model } = useEditLayoutToolbar(props);
	const { tools, editor, pending } = model;
	return (
		<div
			ref={container}
			className={`${styles.editor} ${props.className ?? ""}`}
		>
			<div className={styles.measureViewport} aria-hidden="true" inert>
				<div ref={model.measure} className={styles.measureCategories}>
					{model.available.map((category) => (
						<Button
							key={category.id}
							size="compact"
							variant="ghost"
							className={styles.categoryButton}
						>
							{category.name}
						</Button>
					))}
				</div>
			</div>
			<Toolbar
				data-variant="floating"
				aria-label="Категории строительства"
				className={styles.categoryPagination}
				hidden={model.available.length === 0}
			>
				{model.pages > 1 && (
					<Button
						size="compact"
						variant="ghost"
						aria-label="Предыдущие категории"
						disabled={model.page === 0 || editor.busy}
						onClick={() => model.changePage(model.page - 1)}
					>
						<IconChevronLeft size={16} />
					</Button>
				)}
				<div className={styles.categories}>
					{model.categoryTools.map((category) => (
						<Button
							size="compact"
							variant="ghost"
							className={styles.categoryButton}
							key={category.id}
							selected={category.selected}
							disabled={editor.busy}
							onClick={() => editor.applyCategory(category)}
						>
							{category.name}
						</Button>
					))}
				</div>
				{model.pages > 1 && (
					<Button
						size="compact"
						variant="ghost"
						aria-label="Следующие категории"
						disabled={model.page + 1 === model.pages || editor.busy}
						onClick={() => model.changePage(model.page + 1)}
					>
						<IconChevronRight size={16} />
					</Button>
				)}
			</Toolbar>
			<Toolbar
				data-variant="floating"
				aria-label="Инструменты строительства"
				className={styles.editorControls}
			>
				<ToolbarGroup
					aria-label="Тип клетки"
					className={`${styles.controlsRow} ${styles.toolsRow}`}
				>
					{tools.map((tool) => (
						<Button
							size="compact"
							variant="ghost"
							selected={tool.selected}
							disabled={editor.busy}
							key={tool.type}
							onClick={() => editor.applyType(tool.type)}
						>
							<i aria-hidden="true" style={{ background: tool.color }} />
							{tool.label}
						</Button>
					))}
				</ToolbarGroup>
				<div className={styles.actionsRow}>
					<ToolbarGroup
						aria-label="История изменений"
						className={styles.controlsRow}
					>
						<Button
							size="compact"
							variant="ghost"
							disabled={!editor.canUndo}
							onClick={editor.undo}
							aria-label="Отменить"
						>
							<IconArrowBackUp size={16} />
						</Button>
						<Button
							size="compact"
							variant="ghost"
							disabled={!editor.canRedo}
							onClick={editor.redo}
							aria-label="Вернуть отменённое"
						>
							<IconArrowForwardUp size={16} />
						</Button>
					</ToolbarGroup>
					<ToolbarGroup
						aria-label="Сохранение изменений"
						className={styles.controlsRow}
					>
						<Button
							size="compact"
							disabled={pending || editor.busy || !editor.canSave}
							tooltip={
								!editor.canSave ? editor.saveUnavailableReason : undefined
							}
							onClick={() => {
								void editor.save();
							}}
						>
							Сохранить изменения
						</Button>
						<Button
							size="compact"
							variant="ghost"
							disabled={pending || editor.busy}
							aria-busy={editor.resetting}
							onClick={editor.discard}
							aria-label="Отменить все изменения"
						>
							<IconRotate
								className={editor.resetting ? styles.resetSpinning : ""}
								size={16}
							/>
						</Button>
					</ToolbarGroup>
				</div>
			</Toolbar>
			{editor.errors && (
				<Feedback
					className={styles.notice}
					tone={editor.errors.length ? "error" : "success"}
				>
					{editor.errors.length
						? editor.errors.slice(0, 8).join(" · ")
						: "Карта проверена. Ошибок нет."}
				</Feedback>
			)}
		</div>
	);
}
