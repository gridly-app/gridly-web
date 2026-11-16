import { type ReactNode, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { useSession } from "@/ports/session";
import { useOnlineStatus } from "@/shared/lib";
import { Feedback, RetryButton, Skeleton } from "@/shared/ui/feedback";
import { useWarehouseRuntime } from "../composition/app-providers.compose";
import { WorkspaceProviders } from "../composition/workspace-providers.compose";

export function AuthRoute({ signIn }: { signIn: ReactNode }) {
	const online = useOnlineStatus();
	const { error } = useSession();
	if (!online)
		return (
			<Feedback tone="warning">
				Нет соединения. Для входа подключитесь к сети.{error && <p>{error}</p>}
			</Feedback>
		);
	return <Suspense fallback={<Skeleton layout="form" />}>{signIn}</Suspense>;
}

export function AccountRoute({ signIn }: { signIn: ReactNode }) {
	const { user, status, error, restore, scopeId } = useSession();
	const warehouse = useWarehouseRuntime("account");
	if (status === "restoring")
		return <Skeleton layout="page" label="Восстанавливаем сессию…" />;
	if (status === "error")
		return (
			<Feedback
				tone="error"
				title="Не удалось восстановить сессию"
				action={<RetryButton variant="secondary" size="sm" onRetry={restore} />}
			>
				{error}
			</Feedback>
		);

	if (!user) return <AuthRoute signIn={signIn} />;

	return (
		<WorkspaceProviders key={scopeId} mode="standard" warehouse={warehouse}>
			<Outlet />
		</WorkspaceProviders>
	);
}
