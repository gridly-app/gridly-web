import { Button } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";

export function RouteFailure() {
	return (
		<Feedback
			tone="error"
			title="Не удалось открыть страницу"
			action={
				<Button
					variant="secondary"
					size="sm"
					onClick={() => window.location.reload()}
				>
					Перезагрузить страницу
				</Button>
			}
		>
			Попробуйте загрузить её ещё раз.
		</Feedback>
	);
}
