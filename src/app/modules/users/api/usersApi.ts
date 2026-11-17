import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { WorkspaceMode } from "@/ports/session";
import { useWarehouseScopeId } from "@/ports/warehouse";

import { type FetchHttpClient, parseResponse } from "@/shared/http";
import { adminApiPath, adminQueryKey } from "@/ports/administration";

import {
	accountUserSchema,
	type AccountUserUpdate,
	accountUserUpdateSchema,
	type EditableAccount,
	usersSchema,
} from "./users.dto";

export function useAdminUsers(http: FetchHttpClient, mode: WorkspaceMode) {
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
	http: FetchHttpClient,
	mode: WorkspaceMode,
	onRemoved: () => void,
) {
	const client = useQueryClient();
	const scopeId = useWarehouseScopeId();
	const path = adminApiPath(mode, "users");

	return useMutation({
		mutationFn: ({
			id,
			revision,
		}: Pick<EditableAccount, "id" | "revision">) => {
			const target = `${path}/${encodeURIComponent(id)}`;

			return http.request(target, {
				method: "DELETE",
				headers: { "If-Match": `"${revision}"` },
			});
		},
		onSuccess: async () => {
			await client.invalidateQueries({
				queryKey: adminQueryKey(scopeId, path),
			});

			onRemoved();
		},
	});
}

export function useUpdateAdminUser(
	http: FetchHttpClient,
	mode: WorkspaceMode,
	userId: string,
	onSaved: () => void,
) {
	const client = useQueryClient();
	const scopeId = useWarehouseScopeId();
	const path = adminApiPath(mode, "users");

	return useMutation({
		mutationFn: async (input: AccountUserUpdate) => {
			const body = accountUserUpdateSchema.parse(input);
			const response = await http.request(
				`${path}/${encodeURIComponent(userId)}`,
				{
					method: "PATCH",
					body,
				},
			);

			return parseResponse(accountUserSchema, response);
		},
		onSuccess: async () => {
			const auditEndpoint = adminApiPath(mode, "audit");

			await Promise.all(
				[path, auditEndpoint].map((resource) =>
					client.invalidateQueries({
						queryKey: adminQueryKey(scopeId, resource),
					}),
				),
			);

			onSaved();
		},
	});
}
