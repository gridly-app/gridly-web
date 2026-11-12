"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { clsx } from "clsx";
import type React from "react";

import css from "./label.module.css";

export function Label({
	className,
	render,
	...props
}: useRender.ComponentProps<"label">): React.ReactElement {
	const defaultProps = {
		className: clsx(css.root, className),
		"data-slot": "label",
	};

	return useRender({
		defaultTagName: "label",
		props: mergeProps<"label">(defaultProps, props),
		render,
	});
}
