import { AppProviders } from "@/app/composition/AppProviders";
import type { AppDependencies } from "@/app/composition/dependencies";
import { AppRouter } from "@/app/router/AppRouter";
import { RouteBoundary } from "@/app/router/RouteBoundary";

export function App({ dependencies }: { dependencies: AppDependencies }) {
	return (
		<AppProviders dependencies={dependencies}>
			<RouteBoundary>
				<AppRouter />
			</RouteBoundary>
		</AppProviders>
	);
}
