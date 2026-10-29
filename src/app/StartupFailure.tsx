import { Button, Feedback } from "@/shared/ui";

export function StartupFailure() {
	function reload() {
		window.location.reload();
	}

	return (
		<Feedback tone="loading" role="alert">
			<h1>Не удалось загрузить приложение</h1>
			<p>Проверьте соединение и попробуйте ещё раз.</p>
			<Button type="button" onClick={reload}>
				Перезагрузить страницу
			</Button>
		</Feedback>
	);
}
