import { IconEdit, IconTrash } from "@tabler/icons-react";
import type { ComponentProps } from "react";

import { IconButton } from "@/shared/ui/controls";

type RowActionProps = Pick<
	ComponentProps<typeof IconButton>,
	"label" | "onClick" | "disabled"
>;

export function EditRowAction(props: RowActionProps) {
	return (
		<IconButton
			{...props}
			icon={<IconEdit aria-hidden="true" />}
			tooltip="Изменить"
			variant="secondary"
		/>
	);
}

export function DeleteRowAction(props: RowActionProps) {
	return (
		<IconButton
			{...props}
			icon={<IconTrash aria-hidden="true" />}
			tooltip="Удалить"
			variant="destructive-outline"
		/>
	);
}
