import { Button } from "@/shared/ui";

import type { getOrderPresentation } from "../model/getOrderPresentation";
import type { useOrderDetail } from "../model/useOrderDetail";

export interface OrderTasksProps {
	model: Pick<ReturnType<typeof useOrderDetail>, "pending" | "confirmTask"> &
		Pick<ReturnType<typeof getOrderPresentation>, "tasks">;
}

export function OrderTasks({ model }: OrderTasksProps) {
	const { tasks, pending } = model;

	return tasks?.flatMap(
		(task) =>
			task.confirmationActions?.map((action) => (
				<Button
					variant="secondary"
					disabled={pending}
					key={`${task.id}:${action.id}`}
					onClick={() => void model.confirmTask(task, action.id)}
				>
					{action.label}
				</Button>
			)) ?? [],
	);
}
