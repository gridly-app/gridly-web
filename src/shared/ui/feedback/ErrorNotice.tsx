import { Feedback } from "./Feedback";

export interface ErrorNoticeProps {
	message?: string | undefined;
	className?: string | undefined;
}

export function ErrorNotice({ message, className = "" }: ErrorNoticeProps) {
	return message ? (
		<Feedback tone="error" className={className}>
			{message}
		</Feedback>
	) : null;
}
