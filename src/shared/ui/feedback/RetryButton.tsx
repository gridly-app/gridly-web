import { Button, type ButtonProps } from "../controls/Button";

interface RetryButtonProps extends Pick<ButtonProps, "size" | "variant"> {
	onRetry: () => void;
	children?: string;
}

export function RetryButton({
	onRetry,
	children = "Повторить",
	...props
}: RetryButtonProps) {
	return (
		<Button {...props} onClick={() => void onRetry()}>
			{children}
		</Button>
	);
}
