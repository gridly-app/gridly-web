import { Field as FieldPrimitive } from "@base-ui/react/field";
import { mergeProps } from "@base-ui/react/merge-props";
import { clsx } from "clsx";
import type * as React from "react";

import css from "./textarea.module.css";

export type TextareaProps = React.ComponentPropsWithoutRef<"textarea"> &
	React.RefAttributes<HTMLTextAreaElement> & {
		size?: "sm" | "default" | "lg" | number;
		unstyled?: boolean;
	};

export function Textarea({
	className,
	size = "default",
	unstyled = false,
	ref,
	...props
}: TextareaProps): React.ReactElement {
	return (
		<span
			className={
				clsx(css.control, !unstyled && css.styledControl, className) ||
				undefined
			}
			data-size={size}
			data-slot="textarea-control"
		>
			<FieldPrimitive.Control
				ref={ref}
				value={props.value}
				defaultValue={props.defaultValue}
				disabled={props.disabled}
				id={props.id}
				name={props.name}
				render={(defaultProps: React.ComponentProps<"textarea">) => (
					<textarea
						className={clsx(
							css.input,
							size === "sm" && css.inputSm,
							size === "lg" && css.inputLg,
						)}
						data-slot="textarea"
						{...mergeProps(defaultProps, props)}
					/>
				)}
			/>
		</span>
	);
}
