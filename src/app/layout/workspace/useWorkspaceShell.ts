import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useWarehouse, useWarehouses } from "@/entities/warehouse";
import { useDemoSession, useSession, useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import {
	errorMessage,
	useOnlineStatus,
	useTheme,
	writePreference,
} from "@/shared/lib";
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
	const notify = useWorkspaceNotice();
	const creation = useWarehouseCreation(warehouseId);
	const online = useOnlineStatus();
	useEffect(() => {
		if (!isDemo) writePreference("gridly.last", warehouseId);
		else demo.rememberWarehouse(warehouseId);
	}, [warehouseId, isDemo, demo]);
	const commands = useWorkspaceCommands({
		warehouseId,
		snapshot,
		notify,
	});
	const warehouse = snapshot.data;
	const stale = snapshot.isError || !online;
	function changeWarehouse(value: string) {
		if (value) {
			void navigate(warehousePath(mode, value, page));
		}
	}

	async function logout() {
		try {
			if (!isDemo) await endSession();
			void navigate(isDemo ? "/" : "/auth", { replace: true });
		} catch (error) {
			notify(errorMessage(error));
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
	return {
		sidebar: {
			workspace: { warehouseId, changeWarehouse, warehouses: list.data ?? [] },
			navigation: {
				warehouseId,
				mode,
			},
			profile: {
				user,
				isDemo,
				dark,
				setDark,
				logout,
				account: () => {
					void navigate("/app");
				},
			},
		},
		content: {
			page,
			warehouse,
			warehouseId,
			openCreation: () => creation.setOpen(true),
			snapshot,
			retrySnapshot,
			scope,
		},
		creation,
	};
}
