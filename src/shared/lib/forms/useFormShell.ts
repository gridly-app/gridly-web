import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { errorMessage } from "../errorMessage";

export interface FormShellOptions {
	children: ReactNode;
	onSubmit: (data: FormData) => Promise<void>;
	pending?: boolean | undefined;
	submitLabel?: string | undefined;
}

export function useFormShell({
	children,
	onSubmit,
	pending = false,
	submitLabel = "Сохранить",
}: FormShellOptions) {
	const inFlight = useRef(false);
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		if (pending || inFlight.current) {
			return;
		}
		const data = new FormData(e.currentTarget);
		inFlight.current = true;

		setError("");
		setSubmitting(true);
		try {
			await onSubmit(data);
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			inFlight.current = false;
			setSubmitting(false);
		}
	}

	return { handleSubmit, children, error, pending, submitting, submitLabel };
}
