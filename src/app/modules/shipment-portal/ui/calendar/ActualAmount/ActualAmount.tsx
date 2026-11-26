import { Button } from "@/shared/ui/controls";

export function ActualAmount({
	quantity,
	showZeroActual,
	label,
	onClick,
}: {
	quantity: number;
	showZeroActual: boolean;
	label: string;
	onClick: () => void;
}) {
	if (quantity === 0) return <>{showZeroActual ? 0 : "Нет отгрузки"}</>;

	return (
		<Button size="sm" variant="text" aria-label={label} onClick={onClick}>
			{quantity}
		</Button>
	);
}
