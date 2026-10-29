import { useId } from "react";
import {
	Checkbox,
	CheckLabel,
	Field,
	FormGrid,
	FormShell,
	Input,
} from "@/shared/ui";
import type { RobotFormOptions } from "../model/createRobotForm";
import { createRobotForm } from "../model/createRobotForm";
import localLayout from "./Layout.module.css";

export interface RobotFormProps extends RobotFormOptions {
	pending: boolean;
}

export function RobotForm({ robot, pending, onSave }: RobotFormProps) {
	const controlId = useId();
	const { handleSubmit, roles } = createRobotForm({ onSave, robot });

	return (
		<FormShell pending={pending} onSubmit={handleSubmit}>
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
						type="number"
						min={1}
						defaultValue={robot?.speed || 2}
						required
					/>
				</Field>
				<Field label="Тиков на действие">
					<Input
						name="duration"
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
