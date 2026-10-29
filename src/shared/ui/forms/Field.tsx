import { Field as FieldPrimitive } from "@base-ui/react/field";
import type { ReactNode } from "react";
import feedbackStyles from "../feedback/Feedback.module.css";
import fieldStyles from "./Field.module.css";
import localLayout from "./Layout.module.css";

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
	className = "",
}: FieldProps) {
	return (
		<FieldPrimitive.Root className={`${fieldStyles.field} ${className}`}>
			<FieldPrimitive.Label>
				<span aria-hidden={accessibleLabel ? true : undefined}>{label}</span>
				{accessibleLabel && (
					<span className={localLayout.srOnly}>{accessibleLabel}</span>
				)}
			</FieldPrimitive.Label>
			{children}
			<FieldPrimitive.Error className={feedbackStyles.error} />
		</FieldPrimitive.Root>
	);
}
