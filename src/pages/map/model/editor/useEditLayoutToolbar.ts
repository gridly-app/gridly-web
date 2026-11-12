import { useEffect, useRef, useState } from "react";
import type { Category } from "@/entities/warehouse";
import { type CellType, cellLabels } from "@/entities/warehouse";

import type { MapEditor } from "./useMapEditor";

export interface EditLayoutToolbarOptions {
	categories: Category[];
	editor: Pick<
		MapEditor,
		| "brush"
		| "categoryId"
		| "applyCategory"
		| "applyType"
		| "busy"
		| "canRedo"
		| "canSave"
		| "canUndo"
		| "discard"
		| "errors"
		| "redo"
		| "resetting"
		| "save"
		| "saveUnavailableReason"
		| "undo"
	>;
	pending: boolean;
	palette: Record<CellType, string>;
}

export function useEditLayoutToolbar({
	editor,
	pending,
	palette,
	categories,
}: EditLayoutToolbarOptions) {
	const [page, setPage] = useState(0);
	const container = useRef<HTMLDivElement>(null);
	const measure = useRef<HTMLDivElement>(null);
	const [widths, setWidths] = useState<number[]>([]);
	const [availableWidth, setAvailableWidth] = useState(850);

	const available = categories.filter((category) => !category.archived);
	useEffect(() => {
		const element = container.current;
		const track = measure.current;
		if (!element || !track) return;
		const workspace = element.closest<HTMLElement>("[data-map-workspace]");
		const observer = new ResizeObserver(() => {
			setAvailableWidth(
				element.clientWidth -
					2 * parseFloat(getComputedStyle(element).paddingInlineStart),
			);
			setWidths(
				Array.from(
					track.children,
					(item) => item.getBoundingClientRect().width + 4,
				),
			);
			workspace?.style.setProperty(
				"--construction-toolbar-height",
				`${element.getBoundingClientRect().height}px`,
			);
		});

		observer.observe(element);
		observer.observe(track);
		if (workspace) {
			observer.observe(workspace);
		}

		return () => {
			observer.disconnect();
			workspace?.style.removeProperty("--construction-toolbar-height");
		};
	}, []);
	const itemWidth = (name: string, index: number) =>
		widths[index] ?? name.length * 7.2 + 28;
	const contentWidth = Math.max(0, availableWidth - 18);
	const needsPaging =
		available.reduce(
			(width, category, index) => width + itemWidth(category.name, index),
			0,
		) -
			4 >
		contentWidth;
	const categoryPages: (typeof available)[] = [[]];
	let usedWidth = 0;

	for (const [index, category] of available.entries()) {
		const width = itemWidth(category.name, index);

		if (
			usedWidth &&
			needsPaging &&
			usedWidth + width - 4 > Math.max(0, contentWidth - 88)
		) {
			categoryPages.push([]);
			usedWidth = 0;
		}
		categoryPages.at(-1)?.push(category);
		usedWidth += width;
	}
	const pages = categoryPages.length;
	const activePage = Math.min(page, pages - 1);
	const categoryTools = (categoryPages[activePage] ?? []).map((category) => ({
		...category,
		selected: editor.categoryId === category.id,
	}));
	const tools = (Object.entries(cellLabels) as [CellType, string][])
		.filter(([type]) => type !== "cold")
		.map(([type, label]) => ({
			type,
			label,
			color: palette[type],
			selected: editor.brush === type,
		}));

	function changePage(page: number) {
		setPage(Math.max(0, Math.min(pages - 1, page)));
	}

	return {
		container,
		measure,
		available,
		tools,
		categoryTools,
		page: activePage,
		pages,
		changePage,
		editor,
		pending,
	};
}
