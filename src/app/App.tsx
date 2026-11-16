import { AppRouter } from "./app-routes.compose";
import { AppProviders } from "./composition/app-providers.compose";
import type { AppDependencies } from "./composition/dependencies.compose";

export function App({ dependencies }: { dependencies: AppDependencies }) {
	return (
		<AppProviders dependencies={dependencies}>
			<AppRouter />
		</AppProviders>
	);
}
