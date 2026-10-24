import { Form as FormPrimitive } from "@base-ui/react/form";

export type FormProps = FormPrimitive.Props;

export function Form(props: FormProps) {
	return <FormPrimitive data-slot="form" {...props} />;
}
