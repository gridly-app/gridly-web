import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useNavigate } from "react-router-dom";
import { WarehouseRepositoryProvider } from "@/entities/warehouse";
import { useDemoSession, WorkspaceModeProvider } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { errorMessage } from "@/shared/lib";
import { Button, Feedback } from "@/shared/ui";
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
						{status === "expired"
							? "Начать новое демо"
							: status === "error"
								? "Повторить"
								: "Начать демо"}
					</Button>
				</>
			)}
			<Link to="/">На лендинг</Link>
		</main>
	);
}
