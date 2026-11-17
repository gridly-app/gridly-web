import { Button } from "@/shared/ui/controls";

import { managementStyles as sharedStyles } from "@/shared/ui/management";
import styles from "./AuditPagination.module.css";

export function AuditPagination({
	count,
	page,
	pageSize,
	onChange,
}: {
	count: number;
	page: number;
	pageSize: number;
	onChange: (page: number) => void;
}) {
	const pageCount = Math.ceil(count / pageSize);
	const hasMultiplePages = pageCount > 1;
	const isLastPage = page + 1 >= pageCount;

	function handlePreviousPage() {
		onChange(page - 1);
	}

	function handleNextPage() {
		onChange(page + 1);
	}

	return (
		<nav className={styles.pagination} aria-label="Страницы журнала аудита">
			<span aria-live="polite">
				Найдено событий: {count}
				{hasMultiplePages && `. Страница ${page + 1} из ${pageCount}`}
			</span>
			{hasMultiplePages && (
				<div className={sharedStyles.actions}>
					<Button
						size="sm"
						variant="secondary"
						disabled={page === 0}
						onClick={handlePreviousPage}
					>
						Назад
					</Button>
					<Button
						size="sm"
						variant="secondary"
						disabled={isLastPage}
						onClick={handleNextPage}
					>
						Далее
					</Button>
				</div>
			)}
		</nav>
	);
}
