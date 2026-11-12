import { Input as InputPrimitive } from "@base-ui/react/input";
import { clsx } from "clsx";
import type * as React from "react";

import css from "./input.module.css";

export type InputProps = Omit<
	InputPrimitive.Props & React.RefAttributes<HTMLInputElement>,
	"size"
> & {
	size?: "sm" | "default" | "lg" | number;
	unstyled?: boolean;
	nativeInput?: boolean;
};

export function Input({
	className,
	size = "default",
	unstyled = false,
	nativeInput = false,
	style,
	...props
}: InputProps): React.ReactElement {
	const inputClassName = clsx(
		css.input,
		size === "sm" && css.inputSm,
		size === "lg" && css.inputLg,
		props.type === "search" && css.inputSearch,
		props.type === "file" && css.inputFile,
	);
	return (
		<span
			className={
				clsx(css.control, !unstyled && css.styledControl, className) ||
				undefined
			}
			data-size={size}
			data-slot="input-control"
		>
			{nativeInput ? (
				<input
					className={inputClassName}
					data-slot="input"
					size={typeof size === "number" ? size : undefined}
					style={typeof style === "function" ? undefined : style}
					{...props}
				/>
			) : (
				<InputPrimitive
					className={inputClassName}
					data-slot="input"
					size={typeof size === "number" ? size : undefined}
					style={style}
					{...props}
				/>
			)}
		</span>
	);
}
