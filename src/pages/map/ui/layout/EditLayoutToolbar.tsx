import {
	IconArrowBackUp,
	IconArrowForwardUp,
	IconCheck,
	IconDeviceFloppy,
	IconRotate,
} from "@tabler/icons-react";
import {
	Button,
	Feedback,
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/shared/ui";
import type { EditLayoutToolbarOptions } from "../../model/layout/useEditLayoutToolbar";
import { useEditLayoutToolbar } from "../../model/layout/useEditLayoutToolbar";
import editorStyles from "./EditLayoutToolbar.module.css";

export type EditLayoutToolbarProps = EditLayoutToolbarOptions & {
	className?: string;
};

export function EditLayoutToolbar(props: EditLayoutToolbarProps) {
	const { container, ...model } = useEditLayoutToolbar(props);
	const { tools, editor, pending, canPublish, publishTitle } = model;

	return (
		<div
			ref={container}
			className={`${editorStyles.editor} ${props.className ?? ""}`}
		>
			<Pagination
				className={editorStyles.categoryPagination}
				aria-label="Категории строительства"
			>
				<PaginationContent
					variant="fitted"
					className={editorStyles.editorPill}
				>
					<PaginationItem>
						<PaginationPrevious
							size="compact"
							disabled={model.page === 0}
							onClick={() => model.changePage(model.page - 1)}
						/>
					</PaginationItem>
					{model.categoryTools.map((category) => (
						<PaginationItem key={category.id}>
							<Button
								size="compact"
								variant="ghost"
								className={editorStyles.categoryButton}
								selected={category.selected}
								onClick={() => editor.applyCategory(category)}
							>
								{category.name}
							</Button>
						</PaginationItem>
					))}
					<PaginationItem>
						<PaginationNext
							size="compact"
							disabled={model.page + 1 === model.pages}
							onClick={() => model.changePage(model.page + 1)}
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
			<div
				className={`${editorStyles.editorControls} ${editorStyles.editorPill}`}
			>
				<div className={`${editorStyles.controlsRow} ${editorStyles.toolsRow}`}>
					{tools.map((tool) => (
						<Button
							size="compact"
							variant="ghost"
							selected={tool.selected}
							key={tool.type}
							onClick={() => editor.applyType(tool.type)}
						>
							<i style={{ background: tool.color }} />
							{tool.label}
						</Button>
					))}
				</div>
				<div className={editorStyles.controlsRow}>
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
					<Button
						size="compact"
						variant="ghost"
						disabled={pending}
						onClick={() => {
							void editor.save();
						}}
						aria-label="Сохранить"
					>
						<IconDeviceFloppy size={16} />
					</Button>
					<Button
						size="compact"
						variant="ghost"
						onClick={editor.validate}
						aria-label="Проверить"
					>
						<IconCheck size={16} />
					</Button>
					<Button
						size="compact"
						variant="default"
						disabled={!canPublish}
						title={publishTitle}
						onClick={() => {
							void editor.publish();
						}}
					>
						Опубликовать
					</Button>
					<Button
						size="compact"
						variant="ghost"
						disabled={pending || editor.resetting}
						aria-busy={editor.resetting}
						onClick={editor.discard}
						aria-label="Отменить все изменения"
					>
						<IconRotate
							className={editor.resetting ? editorStyles.resetSpinning : ""}
							size={16}
						/>
					</Button>
				</div>
			</div>
			{editor.errors && (
				<Feedback
					className={editorStyles.notice}
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
