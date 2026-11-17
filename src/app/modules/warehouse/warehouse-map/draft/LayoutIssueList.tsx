import type { Cell } from "@/domain/warehouse/layout";
import type { LayoutIssue } from "@/ports/warehouse";
import { Button } from "@/shared/ui/controls";

export function LayoutIssueList({
	issues,
	cells,
	onSelectCell,
}: {
	issues: readonly LayoutIssue[];
	cells: ReadonlyMap<string, Cell>;
	onSelectCell: (cell: Cell) => void;
}) {
	return (
		<ul aria-label="Ошибки планировки">
			{issues.map((issue) => {
				const key = JSON.stringify(issue);
				if (issue.kind === "field") {
					return (
						<li key={key}>
							{issue.field} — {issue.message}
						</li>
					);
				}
				const cell = cells.get(issue.key);
				const label = `Клетка ${issue.key} — ${issue.message}`;

				return (
					<li key={key}>
						{cell ? (
							<Button variant="text" onClick={() => onSelectCell(cell)}>
								{label}
							</Button>
						) : (
							label
						)}
					</li>
				);
			})}
		</ul>
	);
}
