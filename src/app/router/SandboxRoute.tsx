import { IconAlertTriangle } from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useState } from "react";
import { Outlet, Link as RouterLink, useNavigate } from "react-router-dom";
import { useNavigationConfirmation } from "@/ports/navigation";
import { useSandboxAccess } from "@/ports/session";
import { errorMessage } from "@/shared/lib";
import { Button, StableLabel } from "@/shared/ui/controls";
import { Feedback, Skeleton } from "@/shared/ui/feedback";
import { Link } from "@/shared/ui/navigation";
import { useWarehouseRuntime } from "../composition/app-providers.compose";
import { WorkspaceProviders } from "../composition/workspace-providers.compose";
import styles from "./SandboxRoute.module.css";
import { WorkspaceEntry } from "./WorkspaceEntry";

export function SandboxEntry() {
	const { access } = useSandboxAccess();
	if (!access) return null;
	return (
		<WorkspaceEntry
			preferredWarehouse={
				access.last_warehouse_id || access.initial_warehouse_id
			}
		/>
	);
}

function SandboxWorkspace() {
	const warehouse = useWarehouseRuntime("sandbox");
	const { controller } = useSandboxAccess();
	useNavigationConfirmation((_currentPath, nextPath) => {
		const path = nextPath.toLowerCase();
		if (path === "/sandbox" || path.startsWith("/sandbox/")) return;

		return {
			title: "Предупреждение",
			description:
				"При выходе изменения песочницы будут сброшены. При следующем входе откроется исходный сценарий.",
			icon: (
				<IconAlertTriangle
					aria-hidden="true"
					className={styles.exitIcon}
					size={32}
				/>
			),
			cancelLabel: "Остаться",
			confirmLabel: "Выйти",
			onConfirm: controller.end,
		};
	});

	return (
		<WorkspaceProviders mode="sandbox" warehouse={warehouse}>
			<Outlet />
		</WorkspaceProviders>
	);
}

export function SandboxRoute() {
	const { status, access, error, controller } = useSandboxAccess();
	const accountWarehouse = useWarehouseRuntime("account");
	const navigate = useNavigate();
	const [actionError, setActionError] = useState("");

	useLayoutEffect(() => {
		accountWarehouse.clear();
	}, [accountWarehouse]);

	useEffect(() => {
		void controller.restore();
	}, [controller]);
	if (status === "active" && access)
		return <SandboxWorkspace key={access.access_id} />;

	const pending =
		status === "starting" || (status === "idle" && access !== null);
	let launchLabel = "Начать работу";
	if (status === "expired") launchLabel = "Начать заново";
	if (status === "error") launchLabel = "Повторить";
	async function launch() {
		setActionError("");
		try {
			await controller.start();
			const current = controller.getSnapshot();
			if (current.status === "active" && current.access) {
				await navigate("/sandbox", { replace: true });
			}
		} catch (failure) {
			setActionError(controller.getSnapshot().error || errorMessage(failure));
		}
	}
	return (
		<main className={styles.entry}>
			<h1>
				{status === "expired"
					? "Доступ к песочнице завершён"
					: "Песочница Gridly"}
			</h1>
			<p>Готовый склад с товарами, роботами и заказами. Без регистрации.</p>
			{pending ? (
				<Skeleton
					className={styles.loading}
					label="Подготавливаем данные склада…"
				/>
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
							variants={["Начать заново", "Повторить", "Начать работу"]}
						>
							{launchLabel}
						</StableLabel>
					</Button>
				</>
			)}
			<Link render={<RouterLink to="/" />}>На лендинг</Link>
		</main>
	);
}
