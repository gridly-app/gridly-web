import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { ComponentProps } from "react";
import { Button } from "../controls/Button";
import paginationStyles from "./Pagination.module.css";

export function Pagination(props: ComponentProps<"nav">) {
	return <nav aria-label="Пагинация" data-slot="pagination" {...props} />;
}

export function PaginationContent({
	variant = "default",
	className = "",
	...props
}: ComponentProps<"ul"> & { variant?: ("default" | "fitted") | undefined }) {
	return (
		<ul
			className={`${paginationStyles.paginationContent} ${variant === "fitted" ? paginationStyles.fitted : ""} ${className}`}
			data-slot="pagination-content"
			{...props}
		/>
	);
}

export function PaginationItem(props: ComponentProps<"li">) {
	return <li data-slot="pagination-item" {...props} />;
}

export function PaginationPrevious(props: ComponentProps<typeof Button>) {
	return (
		<Button variant="ghost" aria-label="Предыдущие категории" {...props}>
			<IconChevronLeft size={18} />
		</Button>
	);
}

export function PaginationNext(props: ComponentProps<typeof Button>) {
	return (
		<Button variant="ghost" aria-label="Следующие категории" {...props}>
			<IconChevronRight size={18} />
		</Button>
	);
}
