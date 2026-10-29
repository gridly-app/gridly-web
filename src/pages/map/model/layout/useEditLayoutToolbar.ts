import { useEffect, useRef, useState } from "react";
import type { Category } from "@/entities/warehouse";
import { type CellType, cellLabels } from "@/entities/warehouse";

import type { MapEditor } from "./useMapEditor";

export interface EditLayoutToolbarOptions {
	categories: Category[];
	editor: MapEditor;
	pending: boolean;
	running: boolean;
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
	const [availableWidth, setAvailableWidth] = useState(850);

	useEffect(() => {
		if (!container.current) {
			return;
		}
		const element = container.current;
		const workspace = element.closest<HTMLElement>("[data-map-workspace]");
		const observer = new ResizeObserver(() => {
			const map = workspace?.querySelector<HTMLElement>("[data-map-scroll]");

			setAvailableWidth(Math.max(120, (map?.clientWidth || 850) - 48));
			workspace?.style.setProperty(
				"--construction-toolbar-height",
				`${element.getBoundingClientRect().height}px`,
			);
		});

		observer.observe(element);
		if (workspace) {
			observer.observe(workspace);
		}

		return () => {
			observer.disconnect();
			workspace?.style.removeProperty("--construction-toolbar-height");
		};
	}, []);
	const available = categories.filter((category) => !category.archived);
	const categoryPages: (typeof available)[] = [[]];
	let usedWidth = 0;

	for (const category of available) {
		const itemWidth = category.name.length * 7.2 + 24;

		if (
			usedWidth &&
			usedWidth + itemWidth > Math.max(120, availableWidth - 100)
		) {
			categoryPages.push([]);
			usedWidth = 0;
		}
		categoryPages.at(-1)?.push(category);
		usedWidth += itemWidth;
	}
	const pages = categoryPages.length;
	const activePage = Math.min(page, pages - 1);
	const categoryTools = (categoryPages[activePage] ?? []).map((category) => ({
		...category,
		selected: editor.categoryId === category.id,
	}));
	const tools = (Object.entries(cellLabels) as [CellType, string][]).map(
		([type, label]) => ({
			type,
			label,
			color: palette[type],
			selected: editor.brush === type,
		}),
	);

	function changePage(page: number) {
		setPage(Math.max(0, Math.min(pages - 1, page)));
	}

	return {
		container,
		tools,
		categoryTools,
		page: activePage,
		pages,
		changePage,
		editor,
		pending,
	};
}
