import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { mergeClassName } from "../mergeClassName";
import avatarStyles from "./Avatar.module.css";

export type AvatarProps = AvatarPrimitive.Root.Props;

export type AvatarFallbackProps = AvatarPrimitive.Fallback.Props;

export function Avatar({ className = "", ...props }: AvatarProps) {
	return (
		<AvatarPrimitive.Root
			className={mergeClassName(avatarStyles.avatar, className)}
			data-slot="avatar"
			{...props}
		/>
	);
}

export function AvatarFallback(props: AvatarFallbackProps) {
	return <AvatarPrimitive.Fallback data-slot="avatar-fallback" {...props} />;
}
