import { useEffect, useRef, useState } from "react";

import { type Category, type CellType, cellLabels } from "@/domain/warehouse";

export interface EditLayoutToolbarOptions {
	categories: Category[];
	editor: {
		brush: CellType;
		categoryId: string | null;
		applyCategory: (category: Category) => void;
		applyType: (type: CellType) => void;
		busy: boolean;
		canRedo: boolean;
		canSave: boolean;
		canUndo: boolean;
		discard: () => void;
		errors: string[] | null;
		redo: () => void;
		resetting: boolean;
		save: () => Promise<void>;
		saveUnavailableReason: string | undefined;
		undo: () => void;
	};
	pending: boolean;
	palette: Record<CellType, string>;
	onHeightChange: (height: number | undefined) => void;
}

const defaultAvailableWidth = 850;
const buttonGap = 4;
const estimatedCharacterWidth = 7.2;
const estimatedButtonPadding = 28;
const toolbarPadding = 18;
const paginationControlsWidth = 88;

const cellTools = (Object.entries(cellLabels) as [CellType, string][]).filter(
	([type]) => type !== "cold",
);

function paginateCategories(
	categories: Category[],
	widthOf: (name: string, index: number) => number,
	width: number,
) {
	const totalWidth = categories.reduce(
		(sum, category, index) => sum + widthOf(category.name, index),
		0,
	);
	const needsPaging = totalWidth - buttonGap > width;
	const pageWidth = Math.max(0, width - paginationControlsWidth);
	const pages: Category[][] = [[]];
	let usedWidth = 0;

	for (const [index, category] of categories.entries()) {
		const categoryWidth = widthOf(category.name, index);

		if (
			usedWidth &&
			needsPaging &&
			usedWidth + categoryWidth - buttonGap > pageWidth
		) {
			pages.push([]);
			usedWidth = 0;
		}

		pages.at(-1)?.push(category);
		usedWidth += categoryWidth;
	}

	return pages;
}

export function useEditLayoutToolbar({
	editor,
	pending,
	palette,
	categories,
	onHeightChange,
}: EditLayoutToolbarOptions) {
	const [page, setPage] = useState(0);
	const [widths, setWidths] = useState<number[]>([]);
	const [availableWidth, setAvailableWidth] = useState(defaultAvailableWidth);
	const container = useRef<HTMLDivElement>(null);
	const measure = useRef<HTMLDivElement>(null);
	const available = categories.filter((category) => !category.archived);

	useEffect(() => {
		const element = container.current;
		const track = measure.current;

		if (!element || !track) return;

		function update() {
			if (!element || !track) return;

			const padding = parseFloat(getComputedStyle(element).paddingInlineStart);

			setAvailableWidth(element.clientWidth - 2 * padding);
			setWidths(
				Array.from(
					track.children,
					(item) => item.getBoundingClientRect().width + buttonGap,
				),
			);
			onHeightChange(element.getBoundingClientRect().height);
		}

		const observer = new ResizeObserver(update);

		observer.observe(element);
		observer.observe(track);
		update();

		return () => {
			observer.disconnect();
			onHeightChange(undefined);
		};
	}, [onHeightChange]);

	function itemWidth(name: string, index: number) {
		return (
			widths[index] ??
			name.length * estimatedCharacterWidth + estimatedButtonPadding
		);
	}

	const categoryPages = paginateCategories(
		available,
		itemWidth,
		Math.max(0, availableWidth - toolbarPadding),
	);
	const pages = categoryPages.length;
	const activePage = Math.min(page, pages - 1);
	const categoryTools = (categoryPages[activePage] ?? []).map((category) => ({
		...category,
		selected: editor.categoryId === category.id,
	}));
	const tools = cellTools.map(([type, label]) => ({
		type,
		label,
		color: palette[type],
		selected: editor.brush === type,
	}));

	function changePage(next: number) {
		setPage(Math.max(0, Math.min(pages - 1, next)));
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
