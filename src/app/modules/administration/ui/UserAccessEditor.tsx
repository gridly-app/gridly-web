import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";
import { useWarehouseScopeId, useWarehouses } from "@/ports/warehouse";
import { type FetchHttpClient, parseResponse } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Button, Checkbox, Input } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/dataDisplay";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Combobox, Field } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";
import styles from "../Administration.module.css";
import {
	type AccountUser,
	accountUserSchema,
	accountUserUpdateSchema,
	auditPath,
	usersPath,
} from "../model/shipmentAudit";

export function UserAccessEditor({
	http,
	path,
	user,
	permissions,
	onClose,
	onSave,
}: {
	http: FetchHttpClient;
	path: string;
	user: AccountUser;
	permissions: { code: string; label: string; group: string }[];
	onClose: () => void;
	onSave: () => void;
}) {
	const warehouses = useWarehouses();
	const scopeId = useWarehouseScopeId();
	const queryClient = useQueryClient();
	const fieldId = useId();
	const [warehouseId, setWarehouseId] = useState("");
	const [assigned, setAssigned] = useState(
		() => new Map(user.warehouses.map((entry) => [entry.warehouse_id, entry])),
	);
	const locations = warehouses.data ?? [];
	const selected =
		locations.find(({ id }) => id === warehouseId) ??
		locations.find(({ id }) => assigned.has(id)) ??
		locations[0];
	const currentAccess = selected && assigned.get(selected.id);
	const groups = [...new Set(permissions.map(({ group }) => group))];
	const mutation = useMutation({
		mutationFn: async (
			body: ReturnType<typeof accountUserUpdateSchema.parse>,
		) =>
			parseResponse(
				accountUserSchema,
				await http.request(`${path}/${encodeURIComponent(user.id)}`, {
					method: "PATCH",
					body: accountUserUpdateSchema.parse(body),
				}),
			),
		onSuccess: async () => {
			const prefix = path.slice(0, -usersPath.length);
			await Promise.all(
				[path, prefix + auditPath].map((resource) =>
					queryClient.invalidateQueries({
						queryKey: [scopeId, "shipment-admin", resource],
					}),
				),
			);
			onSave();
		},
	});

	function updateAccess(id: string, name: string, codes: string[]) {
		setAssigned((current) => {
			const next = new Map(current);
			if (codes.length)
				next.set(id, {
					warehouse_id: id,
					warehouse_name: name,
					permissions: codes,
				});
			else next.delete(id);
			return next;
		});
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		mutation.mutate({
			name: String(data.get("name")).trim(),
			login: String(data.get("login")).trim(),
			revision: user.revision ?? 0,
			warehouses: [...assigned.values()],
		});
	}

	return (
		<Modal
			wide
			title={`Доступ · ${user.name}`}
			onClose={() => {
				if (!mutation.isPending) onClose();
			}}
		>
			<form className={styles.form} method="post" onSubmit={submit}>
				<div className={styles.editorColumns}>
					<Field label="Имя">
						<Input
							name="name"
							required
							maxLength={120}
							defaultValue={user.name}
						/>
					</Field>
					<Field label="Логин">
						<Input
							name="login"
							required
							maxLength={254}
							defaultValue={user.login}
						/>
					</Field>
				</div>
				{warehouses.isPending && (
					<Feedback tone="loading">Загружаем склады…</Feedback>
				)}
				{warehouses.error && (
					<Feedback
						tone="error"
						action={<RetryButton onRetry={warehouses.refetch} />}
					>
						{errorMessage(warehouses.error)}
					</Feedback>
				)}
				{selected && (
					<>
						<Combobox
							className={styles.warehouseSelect}
							aria-label="Склад для настройки доступа"
							value={selected.id}
							onValueChange={setWarehouseId}
							options={locations.map(({ id, name }) => ({
								value: id,
								label: `${name} · ${assigned.get(id)?.permissions.length ?? 0}`,
							}))}
						/>
						<fieldset>
							<legend>{selected.name}</legend>
							<div className={styles.actions}>
								<Badge
									tone={
										currentAccess?.permissions.length ? "success" : "neutral"
									}
								>
									{currentAccess?.permissions.length
										? `Разрешений: ${currentAccess.permissions.length}`
										: "Нет разрешений"}
								</Badge>
								{currentAccess && (
									<Button
										variant="text"
										size="sm"
										onClick={() => updateAccess(selected.id, selected.name, [])}
									>
										Снять доступ
									</Button>
								)}
							</div>
							<div className={styles.editorColumns}>
								{groups.map((group) => (
									<div key={group}>
										<strong className={styles.subtle}>{group}</strong>
										{permissions
											.filter((permission) => permission.group === group)
											.map(({ code, label }) => {
												const id = `${fieldId}-${code}`;
												const codes = currentAccess?.permissions ?? [];
												return (
													<label
														key={code}
														className={styles.checkRow}
														htmlFor={id}
													>
														<Checkbox
															id={id}
															checked={codes.includes(code)}
															onCheckedChange={(checked) =>
																updateAccess(
																	selected.id,
																	selected.name,
																	checked
																		? [...codes, code]
																		: codes.filter((value) => value !== code),
																)
															}
														/>
														{label}
													</label>
												);
											})}
									</div>
								))}
							</div>
							{currentAccess?.permissions.some(
								(code) =>
									!permissions.some((permission) => permission.code === code),
							) && (
								<p className={styles.subtle}>
									У склада есть дополнительные разрешения, выданные сервером.
								</p>
							)}
						</fieldset>
					</>
				)}
				{mutation.error && (
					<Feedback tone="error">{errorMessage(mutation.error)}</Feedback>
				)}
				<div className={styles.actions}>
					<Button
						variant="secondary"
						onClick={onClose}
						disabled={mutation.isPending}
					>
						Отмена
					</Button>
					<Button
						type="submit"
						disabled={mutation.isPending || !warehouses.isSuccess}
					>
						Сохранить пользователя
					</Button>
				</div>
			</form>
		</Modal>
	);
}
