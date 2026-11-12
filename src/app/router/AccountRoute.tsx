import { lazy, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useWarehouses } from "@/entities/warehouse";
import { useSession } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { errorMessage, readPreference, useOnlineStatus } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

const AuthPage = lazy(() =>
	import("@/pages/auth").then((module) => ({ default: module.AuthPage })),
);

export function AuthRoute() {
	const online = useOnlineStatus();
	const { error } = useSession();
	if (!online)
		return (
			<Feedback tone="warning">
				Нет соединения. Для входа подключитесь к сети.{error && <p>{error}</p>}
			</Feedback>
		);
	return <AuthPage />;
}

export function AccountRoute({ children }: { children: ReactNode }) {
	const { user, status, error, restore } = useSession();
	if (status === "restoring")
		return <Feedback tone="loading">Восстанавливаем сессию…</Feedback>;
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

	return user ? children : <AuthRoute />;
}

export function WorkspaceEntry() {
	const query = useWarehouses();
	const last = readPreference("gridly.last");
	if (query.isPending)
		return <Feedback tone="loading">Загружаем склады…</Feedback>;
	if (query.error)
		return (
			<Feedback
				tone="error"
				title="Не удалось загрузить склады"
				action={
					<RetryButton variant="secondary" size="sm" onRetry={query.refetch} />
				}
			>
				{errorMessage(query.error)}
			</Feedback>
		);
	const id =
		query.data?.find((warehouse) => warehouse.id === last)?.id ??
		query.data?.[0]?.id ??
		"new";
	return <Navigate replace to={warehousePath("standard", id)} />;
}
