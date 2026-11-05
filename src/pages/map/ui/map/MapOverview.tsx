import { IconHandStop } from "@tabler/icons-react";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/ui";
export type MapOverviewProps = { editing: boolean };
export function MapOverview({ editing }: MapOverviewProps) {
	return (
		<Empty>
			<EmptyMedia variant="icon">
				<IconHandStop aria-hidden="true" />
			</EmptyMedia>
			<EmptyHeader>
				<EmptyTitle>
					{editing ? "Выберите клетки" : "Выберите клетку"}
				</EmptyTitle>
				<EmptyDescription>
					{editing
						? "Нажимайте на клетки или выделяйте область. Повторный клик снимает выделение."
						: "Нажмите на клетку, чтобы посмотреть информацию. Складская зона показывается целиком."}
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
