import { Button } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";

export function StartupFailure() {
	function reload() {
		window.location.reload();
	}

	return (
		<Feedback
			tone="error"
			title="Не удалось загрузить приложение"
			action={
				<Button type="button" onClick={reload}>
					Перезагрузить страницу
				</Button>
			}
		>
			Проверьте соединение и попробуйте ещё раз.
		</Feedback>
	);
}
