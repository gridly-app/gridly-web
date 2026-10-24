import feedbackStyles from "./Feedback.module.css";
export interface ErrorNoticeProps {
	message?: string;
	className?: string;
}

export function ErrorNotice({ message, className = "" }: ErrorNoticeProps) {
	return message ? (
		<p className={`${feedbackStyles.error} ${className}`} role="alert">
			{message}
		</p>
	) : null;
}
