import type { ReactNode } from "react";
import { FieldError, FieldLabel, Field as SpaceField } from "../spaceui/field";
export interface FieldProps {
	label: string;
	accessibleLabel?: string | undefined;
	children: ReactNode;
	className?: string | undefined;
}
export function Field({
	label,
	accessibleLabel,
	children,
	className,
}: FieldProps) {
	return (
		<SpaceField className={className}>
			<FieldLabel>{accessibleLabel || label}</FieldLabel>
			{children}
			<FieldError />
		</SpaceField>
	);
}
