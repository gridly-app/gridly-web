import { Component, type ReactNode, Suspense } from "react";
import { Button, Feedback } from "@/shared/ui";

export function RouteFailure() {
	return (
		<Feedback tone="error" role="alert">
			Не удалось открыть страницу. Попробуйте загрузить её ещё раз.
			<Button onClick={() => window.location.reload()}>
				Перезагрузить страницу
			</Button>
		</Feedback>
	);
}

export class RouteBoundary extends Component<
	{ children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	render() {
		if (this.state.failed) {
			return <RouteFailure />;
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
