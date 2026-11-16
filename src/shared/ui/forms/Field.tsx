import type { ReactNode } from "react";
import { FieldError, FieldLabel, Field as SpaceField } from "../spaceui/field";
export interface FieldProps {
	label: string;
	accessibleLabel?: string | undefined;
	error?: string | undefined;
	errorId?: string | undefined;
	children: ReactNode;
	className?: string | undefined;
}
export function Field({
	label,
	accessibleLabel,
	error,
	errorId,
	children,
	className,
}: FieldProps) {
	return (
		<SpaceField className={className} invalid={error ? true : undefined}>
			<FieldLabel>{accessibleLabel || label}</FieldLabel>
			{children}
			<FieldError
				id={error ? errorId : undefined}
				match={error ? true : undefined}
			>
				{error}
			</FieldError>
		</SpaceField>
	);
}
