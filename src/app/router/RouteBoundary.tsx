import { Component, type ReactNode, Suspense } from "react";
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
