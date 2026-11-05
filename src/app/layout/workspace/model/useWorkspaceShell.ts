import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useWarehouse, useWarehouses } from "@/entities/warehouse";
import { useDemoSession, useSession, useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { errorMessage, useOnlineStatus, useTheme } from "@/shared/lib";
import { writePreference } from "@/shared/lib/browserStorage";
import { useWarehouseCreation } from "./creation/useWarehouseCreation";
import { useWorkspaceCommands } from "./useWorkspaceCommands";
import { useWorkspaceNotice } from "./useWorkspaceNotice";

export type WorkspaceShellModel = ReturnType<typeof useWorkspaceShell>;

export function useWorkspaceShell() {
	const { warehouseId = "new" } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const page = location.pathname.split("/").at(-1) || "map";
	const { user, logout: endSession } = useSession();
	const mode = useWorkspaceMode();
	const isDemo = mode === "demo";
	const { controller: demo } = useDemoSession();
	const requiresNetwork = true;
	const [resetOpen, setResetOpen] = useState(false);
	const [resetPending, setResetPending] = useState(false);
	const [resetError, setResetError] = useState("");
	async function restartDemo() {
		if (resetPending) return;
		setResetPending(true);
		setResetError("");
		try {
			await demo.start(true);
			const session = demo.getSnapshot().session;
			if (session)
				void navigate(warehousePath("demo", session.initial_warehouse_id), {
					replace: true,
				});
		} catch (error) {
			setResetError(errorMessage(error));
		} finally {
			setResetPending(false);
		}
	}
	const { dark, setDark } = useTheme();
	const list = useWarehouses();
	const snapshot = useWarehouse(warehouseId);

	useEffect(() => {
		if (
			isDemo &&
			snapshot.isError &&
			!list.isFetching &&
			list.data !== undefined &&
			warehouseId !== "new" &&
			!list.data.some((warehouse) => warehouse.id === warehouseId)
		) {
			void navigate(warehousePath(mode, list.data[0]?.id ?? "new"), {
				replace: true,
			});
		}
	}, [
		isDemo,
		list.data,
		list.isFetching,
		snapshot.isError,
		warehouseId,
		navigate,
		mode,
	]);
	const notice = useWorkspaceNotice();
	const creation = useWarehouseCreation(warehouseId);
	const online = useOnlineStatus();
	useEffect(() => {
		if (!isDemo) writePreference("gridly.last", warehouseId);
		else demo.rememberWarehouse(warehouseId);
	}, [warehouseId, isDemo, demo]);
	const commands = useWorkspaceCommands({
		warehouseId,
		snapshot,
		requiresNetwork,
		notify: notice.show,
	});
	const warehouse = snapshot.data;
	const stale = snapshot.isError || (requiresNetwork && !online);
	function changeWarehouse(value: string) {
		if (value) {
			void navigate(warehousePath(mode, value, page));
		}
	}

	async function logout() {
		try {
			if (isDemo) demo.end();
			else await endSession();
			void navigate(isDemo ? "/" : "/auth", { replace: true });
		} catch (error) {
			notice.show(errorMessage(error));
		}
	}

	function retrySnapshot() {
		void snapshot.refetch();
	}

	const scope = warehouse
		? {
				warehouse,
				execute: commands.execute,
				command: commands.command,
				pending: commands.pending || stale || snapshot.isFetching,
			}
		: null;
	const hasWaitingInbound = warehouse?.summary?.hasWaitingInbound ?? false;
	return {
		sidebar: {
			workspace: { warehouseId, changeWarehouse, list },
			navigation: {
				warehouseId,
				mode,
				robotCount: warehouse?.summary?.robotCount,
				hasWaitingInbound,
			},
			profile: {
				user,
				isDemo,
				dark,
				setDark,
				logout,
				restartDemo: () => {
					setResetError("");
					setResetOpen(true);
				},
				landing: () => {
					void navigate("/");
				},
				account: () => {
					void navigate("/app");
				},
			},
		},
		content: {
			page,
			warehouse,
			stale,
			warehouseId,
			openCreation: () => creation.setOpen(true),
			snapshot,
			retrySnapshot,
			scope,
		},
		notice: { message: notice.message, dismiss: notice.dismiss },
		creation,
		isDemo,
		demoReset: {
			open: resetOpen,
			pending: resetPending,
			error: resetError,
			onConfirm: restartDemo,
			onCancel: () => setResetOpen(false),
		},
	};
}
