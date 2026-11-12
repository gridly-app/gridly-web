import { type ReactNode, useRef, useState } from "react";
import { errorMessage } from "@/shared/lib";
import { Button } from "../controls/Button";
import { StableLabel } from "../controls/StableLabel";
import { ErrorNotice } from "../feedback/ErrorNotice";
import { Form } from "../spaceui/form";
import { FormActions } from "./FormLayout";

interface FormShellProps {
	children: ReactNode;
	onSubmit: (data: FormData) => Promise<void>;
	pending?: boolean | undefined;
	submitLabel?: string | undefined;
	submitVariant?: "default" | "destructive";
}

export function FormShell({
	submitVariant = "default",
	children,
	onSubmit,
	pending = false,
	submitLabel = "Сохранить",
}: FormShellProps) {
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

	return (
		<Form
			onSubmit={(event) => {
				void handleSubmit(event);
			}}
		>
			{children}
			<ErrorNotice message={error} />
			<FormActions>
				<Button
					variant={submitVariant}
					type="submit"
					loading={pending || submitting}
				>
					<StableLabel variants={[submitLabel, "Сохраняем…"]}>
						{pending || submitting ? "Сохраняем…" : submitLabel}
					</StableLabel>
				</Button>
			</FormActions>
		</Form>
	);
}
