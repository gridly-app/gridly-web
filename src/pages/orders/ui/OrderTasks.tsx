import { StatusBadge as Badge } from "@/entities/warehouse";
import { Button, MiniCard } from "@/shared/ui";

import type { getOrderPresentation } from "../model/getOrderPresentation";
import type { useOrderDetail } from "../model/useOrderDetail";

export interface OrderTasksProps {
	model: Pick<ReturnType<typeof useOrderDetail>, "pending" | "confirmTask"> &
		Pick<ReturnType<typeof getOrderPresentation>, "tasks">;
}

export function OrderTasks({ model }: OrderTasksProps) {
	const { tasks, pending } = model;

	return (
		<>
			{tasks?.map((task) => (
				<MiniCard key={task.id}>
					<p>
						Задание {task.id.slice(0, 8)} · {task.typeLabel} ·{" "}
						<Badge value={task.status} />
					</p>
					{task.confirmationActions?.map((action) => (
						<Button
							variant="ghost"
							disabled={pending}
							key={action.id}
							onClick={() => void model.confirmTask(task, action.id)}
						>
							{action.label}
						</Button>
					))}
				</MiniCard>
			))}
		</>
	);
}
