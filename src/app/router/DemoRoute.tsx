import { IconAlertTriangle } from "@tabler/icons-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
	Navigate,
	Outlet,
	Link as RouterLink,
	useBlocker,
	useNavigate,
} from "react-router-dom";
import { WarehouseRepositoryProvider } from "@/entities/warehouse";
import { useDemoSession, WorkspaceModeProvider } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { errorMessage } from "@/shared/lib";
import { Button, StableLabel } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Link } from "@/shared/ui/navigation";
import { ConfirmDialog } from "@/shared/ui/overlays";
import { useAppDependencies } from "../composition/AppProviders";
import styles from "./DemoRoute.module.css";

export function DemoEntry() {
	const { session } = useDemoSession();
	return session ? (
		<Navigate
			replace
			to={warehousePath(
				"demo",
				session.last_warehouse_id || session.initial_warehouse_id,
			)}
		/>
	) : null;
}

function DemoWorkspace() {
	const { demoClient, demoRepository } = useAppDependencies();
	const { controller } = useDemoSession();
	const exit = useBlocker(({ nextLocation }) => {
		const path = nextLocation.pathname.toLowerCase();
		return path !== "/demo" && !path.startsWith("/demo/");
	});
	useEffect(
		() => () => {
			void demoClient.cancelQueries();
			demoRepository.clear();
		},
		[demoClient, demoRepository],
	);
	return (
		<QueryClientProvider client={demoClient}>
			<WarehouseRepositoryProvider repository={demoRepository}>
				<WorkspaceModeProvider value="demo">
					<Outlet />
					{exit.state === "blocked" && (
						<ConfirmDialog
							open
							title="Предупреждение"
							icon={
								<IconAlertTriangle
									aria-hidden="true"
									className={styles.exitIcon}
									size={32}
								/>
							}
							description="При выходе все изменения в демо будут сброшены. При следующем входе откроется исходный сценарий."
							cancelLabel="Остаться"
							confirmLabel="Выйти"
							onCancel={exit.reset}
							onConfirm={() => {
								exit.proceed();
								controller.end();
							}}
						/>
					)}
				</WorkspaceModeProvider>
			</WarehouseRepositoryProvider>
		</QueryClientProvider>
	);
}

export function DemoRoute() {
	const { status, session, error, controller } = useDemoSession();
	const navigate = useNavigate();
	const [actionError, setActionError] = useState("");
	useEffect(() => {
		void controller.restore();
	}, [controller]);
	const pending = status === "starting" || (status === "idle" && !!session);
	if (status === "active" && session)
		return <DemoWorkspace key={session.session_id} />;
	async function launch() {
		setActionError("");
		try {
			if (session) await controller.restore();
			else await controller.start();
			const current = controller.getSnapshot();
			if (current.status === "active" && current.session) {
				void navigate(
					warehousePath("demo", current.session.initial_warehouse_id),
					{ replace: true },
				);
			}
		} catch (failure) {
			setActionError(controller.getSnapshot().error || errorMessage(failure));
		}
	}
	return (
		<main className={styles.entry}>
			<h1>{status === "expired" ? "Демо завершено" : "Демо Gridly"}</h1>
			<p>Готовый склад с товарами, роботами и заказами. Без регистрации.</p>
			{pending ? (
				<Feedback tone="loading">Подготавливаем демо…</Feedback>
			) : (
				<>
					{(actionError || error) && (
						<Feedback tone="error" role="alert">
							{actionError || error}
						</Feedback>
					)}
					<Button
						onClick={() => {
							void launch();
						}}
					>
						<StableLabel
							variants={["Начать новое демо", "Повторить", "Начать демо"]}
						>
							{status === "expired"
								? "Начать новое демо"
								: status === "error"
									? "Повторить"
									: "Начать демо"}
						</StableLabel>
					</Button>
				</>
			)}
			<Link render={<RouterLink to="/" />}>На лендинг</Link>
		</main>
	);
}
