import type { ReactNode } from "react";
import localLayout from "./Layout.module.css";
import signInStyles from "./SignInBlock.module.css";

export interface SignInBlockProps {
	title: string;
	description: string;
	children: ReactNode;
	footer: ReactNode;
}

export function SignInBlock({
	title,
	description,
	children,
	footer,
}: SignInBlockProps) {
	return (
		<section>
			<header className={signInStyles.signInHeader}>
				<h2>{title}</h2>
				<p className={localLayout.muted}>{description}</p>
			</header>
			<div>{children}</div>
			<footer>{footer}</footer>
		</section>
	);
}
