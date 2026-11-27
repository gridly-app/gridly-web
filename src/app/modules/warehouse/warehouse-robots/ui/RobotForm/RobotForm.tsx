import { useId, useState } from "react";

import {
	type Cell,
	type Robot,
	type RobotInput,
	robotParameterLimits,
	robotRoleOptions,
} from "@/domain/warehouse";
import { Checkbox, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import {
	CheckLabel,
	Field,
	FormGrid,
	FormShell,
	Select,
} from "@/shared/ui/forms";

import { robotFromForm } from "../../model/robotFromForm";

import styles from "./RobotForm.module.css";

const robotNameMaxLength = 80;
const defaultSpeed = 2;
const defaultDuration = 3;
const defaultCapacity = "10.000";

function spawnCellLabel(cell: Cell) {
	const kind = cell.type === "charge" ? "Зарядка" : "Проход";

	return `${cell.x}, ${cell.y} · ${kind}`;
}

export function RobotForm({
	robot,
	spawnCells,
	isPending,
	onSave,
}: {
	robot?: Robot | undefined;
	spawnCells: readonly Cell[];
	isPending: boolean;
	onSave: (robot: RobotInput) => Promise<void>;
}) {
	const controlId = useId();
	const [position, setPosition] = useState("");
	const roles = robotRoleOptions.map((role) => ({
		...role,
		checked: !robot || robot.roles.includes(role.value),
	}));
	const positionOptions = spawnCells.map((cell) => ({
		value: `${cell.x},${cell.y}`,
		label: spawnCellLabel(cell),
	}));

	function handleSubmit(data: FormData) {
		return onSave(robotFromForm(data, robot, spawnCells));
	}

	if (!robot && !spawnCells.length) {
		return (
			<Feedback tone="info">
				На опубликованной карте нет свободных клеток прохода или зарядки.
				Освободите клетку или измените карту.
			</Feedback>
		);
	}

	return (
		<FormShell pending={isPending} onSubmit={handleSubmit}>
			{!robot && (
				<Field label="Стартовая клетка *">
					<input type="hidden" name="position" value={position} />
					<Select
						value={position}
						onValueChange={setPosition}
						aria-label="Стартовая клетка"
						options={positionOptions}
					/>
				</Field>
			)}
			<Field label="Название *">
				<Input
					name="name"
					defaultValue={robot?.name}
					required
					maxLength={robotNameMaxLength}
				/>
			</Field>
			<Field label="Специализация *">
				<div className={styles.controls}>
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
						{...robotParameterLimits.speed}
						step={1}
						type="number"
						defaultValue={robot?.speed || defaultSpeed}
						required
					/>
				</Field>
				<Field label="Тиков на действие">
					<Input
						name="duration"
						{...robotParameterLimits.duration}
						step={1}
						type="number"
						defaultValue={robot?.duration || defaultDuration}
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
					defaultValue={robot?.capacity || defaultCapacity}
					required
				/>
			</Field>
		</FormShell>
	);
}
