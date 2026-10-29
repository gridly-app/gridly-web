import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { mergeClassName } from "../mergeClassName";
import switchStyles from "./Switch.module.css";

export type SwitchProps = SwitchPrimitive.Root.Props;

export function Switch({ className = "", ...props }: SwitchProps) {
	return (
		<SwitchPrimitive.Root
			className={mergeClassName(switchStyles.spaceSwitch, className)}
			{...props}
		>
			<SwitchPrimitive.Thumb className={switchStyles.spaceSwitchThumb} />
		</SwitchPrimitive.Root>
	);
}
