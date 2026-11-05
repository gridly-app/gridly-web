import type { ReactNode } from "react";
import { cn } from "@/shared/lib/spaceui/utils";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardPanel,
	CardTitle,
} from "@/shared/ui/spaceui/card";
export interface SignInBlockProps {
	title: string;
	description: string;
	children: ReactNode;
	footer: ReactNode;
	className?: string | undefined;
}
export function SignInBlock({
	title,
	description,
	children,
	footer,
	className,
}: SignInBlockProps) {
	return (
		<Card
			className={cn(
				"w-full max-w-md overflow-hidden border border-border bg-background transition-all duration-200",
				className,
			)}
		>
			<CardHeader className="space-y-2 text-center p-6 pb-3">
				<CardTitle className="text-2xl font-bold tracking-tight">
					{title}
				</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardPanel className="space-y-4 p-6 pt-3 pb-3">{children}</CardPanel>
			<CardFooter className="flex flex-col space-y-4 border-t border-border p-6">
				{footer}
			</CardFooter>
		</Card>
	);
}
