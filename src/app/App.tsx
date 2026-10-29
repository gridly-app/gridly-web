import { AppProviders } from "@/app/composition/AppProviders";
import type { AppDependencies } from "@/app/composition/dependencies";
import { AppRouter } from "@/app/router/AppRouter";

export function App({ dependencies }: { dependencies: AppDependencies }) {
	return (
		<AppProviders dependencies={dependencies}>
			<AppRouter />
		</AppProviders>
	);
}
