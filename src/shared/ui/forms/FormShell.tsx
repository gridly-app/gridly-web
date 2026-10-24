import type { FormShellOptions } from "@/shared/lib";
import { useFormShell } from "@/shared/lib";
import { Button } from "../controls/Button";
import { ErrorNotice } from "../feedback/ErrorNotice";
import { Form } from "./Form";
import { FormActions } from "./FormLayout";

export type FormShellProps = FormShellOptions;

export function FormShell(props: FormShellProps) {
	const { handleSubmit, children, error, pending, submitting, submitLabel } =
		useFormShell(props);

	return (
		<Form
			onSubmit={(event) => {
				void handleSubmit(event);
			}}
		>
			{children}
			<ErrorNotice message={error} />
			<FormActions>
				<Button type="submit" loading={pending || submitting}>
					{pending || submitting ? "Сохраняем…" : submitLabel}
				</Button>
			</FormActions>
		</Form>
	);
}
