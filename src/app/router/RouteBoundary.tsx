import { Component, type ReactNode, Suspense } from "react";
import { Button, Feedback } from "@/shared/ui";

export class RouteBoundary extends Component<
	{ children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	private reload(this: void) {
		window.location.reload();
	}

	render() {
		if (this.state.failed) {
			return (
				<Feedback tone="error" role="alert">
					Не удалось открыть страницу. Попробуйте загрузить её ещё раз.
					<Button onClick={this.reload}>Перезагрузить страницу</Button>
				</Feedback>
			);
		}

		return (
			<Suspense
				fallback={
					<Feedback tone="loading" role="status">
						Загружаем страницу…
					</Feedback>
				}
			>
				{this.props.children}
			</Suspense>
		);
	}
}
