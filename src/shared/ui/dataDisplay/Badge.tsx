import type { ComponentProps } from "react";
import { Badge as SpaceBadge } from "../spaceui/badge";
export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "accent";
const variants = {
	success: "success",
	warning: "warning",
	danger: "error",
	neutral: "secondary",
	accent: "info",
} as const;
export function Badge({
	tone = "success",
	...props
}: ComponentProps<"span"> & { tone?: BadgeTone | undefined }) {
	return <SpaceBadge variant={variants[tone]} {...props} />;
}
