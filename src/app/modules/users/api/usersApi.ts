import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApiPath, adminQueryKey } from "@/ports/administration";
import type { WorkspaceMode } from "@/ports/session";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { ApiError, type HttpClient, parseResponse } from "@/shared/http";

import {
	accountUserSchema,
	type AccountUserUpdate,
	accountUserUpdateSchema,
	assignmentSchema,
	type EditableAccount,
	usersSchema,
} from "./users.dto";

export function isForbidden(error: unknown) {
	return (
		error instanceof ApiError &&
		error.status === 403 &&
		error.code === "FORBIDDEN"
	);
}

function useUsersCache(mode: WorkspaceMode) {
	const client = useQueryClient();
	const scopeId = useWarehouseScopeId();
	const path = adminApiPath(mode, "users");

	function invalidate(resource = path) {
		return client.invalidateQueries({
			queryKey: adminQueryKey(scopeId, resource),
		});
	}

	return { path, invalidate };
}

export function useAdminUsers(http: HttpClient, mode: WorkspaceMode) {
	const scopeId = useWarehouseScopeId();
	const path = adminApiPath(mode, "users");

	return useQuery({
		queryKey: adminQueryKey(scopeId, path),
		queryFn: async ({ signal }) => {
			const response = await http.request(path, { signal });

			return parseResponse(usersSchema, response);
		},
		retry: false,
	});
}

export function useRemoveAdminUser(
	http: HttpClient,
	mode: WorkspaceMode,
	onRemoved: () => void,
) {
	const { path, invalidate } = useUsersCache(mode);

	return useMutation({
		mutationFn: ({
			id,
			revision,
			warehouseId,
		}: Pick<EditableAccount, "id" | "revision"> & { warehouseId?: string }) => {
			const scope = warehouseId
				? `/warehouses/${encodeURIComponent(warehouseId)}`
				: "";

			return http.request(`${path}/${encodeURIComponent(id)}${scope}`, {
				method: "DELETE",
				headers: { "If-Match": `"${revision}"` },
			});
		},
		onSettled: async (_result, error) => {
			if (error && !isForbidden(error)) return;

			await invalidate();

			if (!error) onRemoved();
		},
	});
}

export function useUpdateAdminUser(
	http: HttpClient,
	mode: WorkspaceMode,
	userId: string,
	onSaved: () => void,
) {
	const { path, invalidate } = useUsersCache(mode);

	return useMutation({
		mutationFn: async (input: AccountUserUpdate) => {
			const body = accountUserUpdateSchema.parse(input);
			const response = await http.request(
				`${path}/${encodeURIComponent(userId)}`,
				{ method: "PATCH", body },
			);

			return parseResponse(accountUserSchema, response);
		},
		onError: async (error) => {
			if (isForbidden(error)) await invalidate();
		},
		onSuccess: async () => {
			await Promise.all([
				invalidate(),
				invalidate(adminApiPath(mode, "audit")),
			]);
			onSaved();
		},
	});
}

export function useAddWarehouseMember(
	http: HttpClient,
	mode: WorkspaceMode,
	onAdded: () => void,
) {
	const { path, invalidate } = useUsersCache(mode);

	return useMutation({
		mutationFn: (input: Parameters<typeof assignmentSchema.parse>[0]) =>
			http.request(`${path}/assignments`, {
				method: "POST",
				body: assignmentSchema.parse(input),
			}),
		onSettled: async (_result, error) => {
			if (error && !isForbidden(error)) return;

			await invalidate();

			if (!error) onAdded();
		},
	});
}
