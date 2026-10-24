import { Input as InputPrimitive } from "@base-ui/react/input";
import { mergeClassName } from "../mergeClassName";
import styles from "./Control.module.css";

export type InputProps = InputPrimitive.Props;

export function Input({ className, ...props }: InputProps) {
	return (
		<InputPrimitive
			data-slot="input"
			className={mergeClassName(styles.control, className)}
			{...props}
		/>
	);
}
