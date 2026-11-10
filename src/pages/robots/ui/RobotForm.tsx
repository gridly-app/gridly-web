import { useId, useState } from "react";
import {
	Checkbox,
	CheckLabel,
	Feedback,
	Field,
	FormGrid,
	FormShell,
	Input,
	Select,
} from "@/shared/ui";
import type { RobotFormOptions } from "../model/createRobotForm";
import { createRobotForm } from "../model/createRobotForm";
import localLayout from "./Layout.module.css";

export interface RobotFormProps extends RobotFormOptions {
	pending: boolean;
}

export function RobotForm({
	robot,
	pending,
	onSave,
	spawnCells,
}: RobotFormProps) {
	const controlId = useId();
	const [position, setPosition] = useState("");
	const { handleSubmit, roles } = createRobotForm({
		onSave,
		robot,
		spawnCells,
	});

	if (!robot && !spawnCells.length)
		return (
			<Feedback tone="info">
				На опубликованной карте нет свободных клеток прохода или зарядки.
				Освободите клетку или измените карту.
			</Feedback>
		);
	return (
		<FormShell pending={pending} onSubmit={handleSubmit}>
			{!robot && (
				<Field label="Стартовая клетка *">
					<input type="hidden" name="position" value={position} />
					<Select
						value={position}
						onValueChange={setPosition}
						aria-label="Стартовая клетка"
						options={spawnCells.map((c) => ({
							value: `${c.x},${c.y}`,
							label: `${c.x}, ${c.y}${c.type === "charge" ? " · Зарядка" : " · Проход"}`,
						}))}
					/>
				</Field>
			)}
			<Field label="Название *">
				<Input name="name" defaultValue={robot?.name} required maxLength={80} />
			</Field>
			<Field label="Специализация *">
				<div className={`${localLayout.row} ${localLayout.wrap}`}>
					{roles.map((role) => (
						<CheckLabel key={role.value} htmlFor={`${controlId}-${role.value}`}>
							<Checkbox
								id={`${controlId}-${role.value}`}
								name="roles"
								value={role.value}
								defaultChecked={role.checked}
							/>
							{role.label}
						</CheckLabel>
					))}
				</div>
			</Field>
			<FormGrid>
				<Field label="Клеток за тик">
					<Input
						name="speed"
						max={5}
						step={1}
						type="number"
						min={1}
						defaultValue={robot?.speed || 2}
						required
					/>
				</Field>
				<Field label="Тиков на действие">
					<Input
						name="duration"
						max={20}
						step={1}
						type="number"
						min={1}
						defaultValue={robot?.duration || 3}
						required
					/>
				</Field>
			</FormGrid>
			<Field label="Грузоподъёмность, м³ *">
				<Input
					name="capacity"
					type="number"
					min="0.001"
					step="0.001"
					defaultValue={robot?.capacity || "10.000"}
					required
				/>
			</Field>
		</FormShell>
	);
}
