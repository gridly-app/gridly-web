import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import type * as React from "react";
import { Input, type InputProps } from "@/shared/ui/spaceui/input";

import css from "./input-group.module.css";

const inputGroupAddonVariants = cva(css.inputGroupAddon, {
	defaultVariants: {
		align: "inline-start",
	},
	variants: {
		align: {
			"block-end": css.alignBlockEnd,
			"block-start": css.alignBlockStart,
			"inline-end": css.alignInlineEnd,
			"inline-start": css.alignInlineStart,
		},
	},
});

export function InputGroup({
	className,
	...props
}: React.ComponentProps<"div">): React.ReactElement {
	return (
		<div
			className={clsx(css.root, className)}
			data-slot="input-group"
			role="group"
			{...props}
		/>
	);
}

export function InputGroupAddon({
	className,
	align = "inline-start",
	...props
}: React.ComponentProps<"div"> &
	VariantProps<typeof inputGroupAddonVariants>): React.ReactElement {
	return (
		<div
			className={clsx(inputGroupAddonVariants({ align }), className)}
			data-align={align}
			data-slot="input-group-addon"
			onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
				const target = e.target as HTMLElement;
				const isInteractive = target.closest(
					"button, a, input, select, textarea, [role='button'], [role='combobox'], [role='listbox'], [data-slot='select-trigger']",
				);
				if (isInteractive) return;
				e.preventDefault();
				const parent = e.currentTarget.parentElement;
				const input = parent?.querySelector<
					HTMLInputElement | HTMLTextAreaElement
				>("input, textarea");
				if (input && !parent?.querySelector("input:focus, textarea:focus")) {
					input.focus();
				}
			}}
			{...props}
		/>
	);
}

export function InputGroupInput({
	className,
	...props
}: InputProps): React.ReactElement {
	return <Input className={className} unstyled {...props} />;
}
