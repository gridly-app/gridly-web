export interface StaticTextProps {
	text: string;
	className?: string | undefined;
}

export function StaticText({ text, className = "" }: StaticTextProps) {
	return <span className={className}>{text}</span>;
}
