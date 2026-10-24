import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useWarehouse, useWarehouses } from "@/entities/warehouse";
import { useSession } from "@/shared/auth";
import { environment } from "@/shared/config";
import { errorMessage, useOnlineStatus, useTheme } from "@/shared/lib";
import { useWarehouseCreation } from "./creation/useWarehouseCreation";
import { useWorkspaceCommands } from "./useWorkspaceCommands";
import { useWorkspaceNotice } from "./useWorkspaceNotice";

export type WorkspaceShellModel = ReturnType<typeof useWorkspaceShell>;

export function useWorkspaceShell() {
	const { warehouseId = "new" } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const page = location.pathname.split("/").at(-1) || "map";
	const { user, isDemo, logout: endSession } = useSession();
	const requiresNetwork = !isDemo && !environment.mockApi;
	const { dark, setDark } = useTheme();
	const list = useWarehouses();
	const snapshot = useWarehouse(warehouseId);

	useEffect(() => {
		if (
			isDemo &&
			snapshot.isError &&
			!list.isFetching &&
			list.data?.length &&
			warehouseId !== "new" &&
			!list.data.some((warehouse) => warehouse.id === warehouseId)
		) {
			void navigate(`/warehouses/${list.data[0].id}/map`, { replace: true });
		}
	}, [
		isDemo,
		list.data,
		list.isFetching,
		snapshot.isError,
		warehouseId,
		navigate,
	]);
	const notice = useWorkspaceNotice();
	const creation = useWarehouseCreation(warehouseId);
	const online = useOnlineStatus();
	useEffect(() => {
		if (!isDemo) localStorage.setItem("gridly.last", warehouseId);
	}, [warehouseId, isDemo]);
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
			void navigate(`/warehouses/${value}/${page}`);
		}
	}

	async function logout() {
		try {
			await endSession();
			void navigate("/auth", { replace: true });
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
	const hasWaitingInbound =
		warehouse?.orders.some(
			(order) => order.kind === "inbound" && order.status === "waiting",
		) || false;

	return {
		sidebar: {
			workspace: { warehouseId, changeWarehouse, list },
			navigation: {
				warehouseId,
				robotCount: warehouse?.robots.length,
				hasWaitingInbound,
			},
			profile: { user, isDemo, dark, setDark, logout },
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
	};
}
