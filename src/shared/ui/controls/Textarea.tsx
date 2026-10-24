import { Field as FieldPrimitive } from "@base-ui/react/field";
import type { ComponentPropsWithRef } from "react";
import styles from "./Control.module.css";

export type TextareaProps = ComponentPropsWithRef<"textarea">;

export function Textarea({ ref, className = "", ...props }: TextareaProps) {
	return (
		<FieldPrimitive.Control
			ref={ref}
			value={props.value}
			defaultValue={props.defaultValue}
			disabled={props.disabled}
			id={props.id}
			name={props.name}
			render={
				<textarea
					className={`${styles.control} ${className}`}
					data-slot="textarea"
					{...props}
				/>
			}
		/>
	);
}
