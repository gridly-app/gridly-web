import { useEffect, useRef, useState } from "react";
import styles from "./ShapeBackdrop.module.css";
import ShapeGrid from "./ShapeGrid";

export function ShapeBackdrop({
	className = "",
}: {
	className?: string | undefined;
}) {
	const root = useRef<HTMLDivElement>(null);
	const [colors, setColors] = useState({ line: "#e4e4e7", hover: "#18181b" });
	useEffect(() => {
		const update = () => {
			const style = getComputedStyle(root.current ?? document.documentElement);
			setColors({
				line: style.getPropertyValue("--border").trim(),
				hover: style.getPropertyValue("--primary").trim(),
			});
		};
		update();
		const observer = new MutationObserver(update);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-theme"],
		});
		return () => observer.disconnect();
	}, []);
	return (
		<div
			ref={root}
			aria-hidden="true"
			className={`${styles.backdrop} ${className}`}
		>
			<ShapeGrid lineColor={colors.line} hoverColor={colors.hover} />
		</div>
	);
}
