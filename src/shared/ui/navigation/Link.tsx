import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import linkStyles from "./Link.module.css";

export type LinkProps = useRender.ComponentProps<"a">;

export function Link({ render, className = "", ...props }: LinkProps) {
	const defaults = {
		className: `${linkStyles.spaceLink} ${className}`,
		"data-slot": "link",
	};

	return useRender({
		defaultTagName: "a",
		render,
		props: mergeProps<"a">(defaults, props),
	});
}
