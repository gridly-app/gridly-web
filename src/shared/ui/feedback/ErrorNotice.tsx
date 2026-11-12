import { Feedback } from "./Feedback";

export interface ErrorNoticeProps {
	message?: string | undefined;
	className?: string | undefined;
	inset?: boolean | undefined;
}

export function ErrorNotice({ message, className, inset }: ErrorNoticeProps) {
	return message ? (
		<Feedback tone="error" className={className} inset={inset}>
			{message}
		</Feedback>
	) : null;
}
