import type { ReactNode } from "react";

export function StableLabel({
	children,
	variants,
}: {
	children: ReactNode;
	variants: readonly string[];
}) {
	return (
		<span className="stable-label">
			{variants.map((label) => (
				<span key={label} className="stable-label-reserve" aria-hidden="true">
					{label}
				</span>
			))}
			<span className="stable-label-value">{children}</span>
		</span>
	);
}
