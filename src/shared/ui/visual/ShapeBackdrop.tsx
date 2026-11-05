import { useEffect, useRef, useState } from "react";
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
			className={`shape-backdrop ${className}`}
		>
			<ShapeGrid
				cellSize={48}
				speed={0.18}
				lineColor={colors.line}
				hoverColor={colors.hover}
				fillOpacity={0.12}
				tiltX={12}
				tiltY={-8}
				fade={0.8}
				glow={0.15}
				clickCascade={false}
			/>
		</div>
	);
}
