import type { FormShellOptions } from "@/shared/lib";
import { useFormShell } from "@/shared/lib";
import { Button } from "../controls/Button";
import { StableLabel } from "../controls/StableLabel";
import { ErrorNotice } from "../feedback/ErrorNotice";
import { Form } from "./Form";
import { FormActions } from "./FormLayout";

export type FormShellProps = FormShellOptions & {
	submitVariant?: "default" | "destructive";
};

export function FormShell({
	submitVariant = "default",
	...props
}: FormShellProps) {
	const { handleSubmit, children, error, pending, submitting, submitLabel } =
		useFormShell(props);

	return (
		<Form
			className="space-y-4"
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
