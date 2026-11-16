import type { SubmitEvent } from "react";
import { Button } from "@/shared/ui/controls";
import { ErrorNotice } from "@/shared/ui/feedback";
import { Form } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";
import styles from "./MapSizeDialog.module.css";
import { MapSizeFields } from "./MapSizeFields";

export interface MapSizeDialogProps {
	model: {
		open: boolean;
		close: () => void;
		submit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>;
		width: number;
		height: number;
		error: string;
		widthError?: string | undefined;
		heightError?: string | undefined;
		supported: boolean;
		unavailableReason: string;
		saving: boolean;
	};
}

export function MapSizeDialog({ model }: MapSizeDialogProps) {
	if (!model.open) {
		return null;
	}

	return (
		<Modal title="Размер карты" onClose={model.close}>
			<Form
				onSubmit={(event) => {
					void model.submit(event);
				}}
			>
				<p className={styles.description}>
					Допустимость изменения размера проверяется при сохранении.
				</p>
				<MapSizeFields
					width={model.width}
					height={model.height}
					widthError={model.widthError}
					heightError={model.heightError}
				/>

				<ErrorNotice message={model.error} />
				{!model.supported && <ErrorNotice message={model.unavailableReason} />}
				<Button
					type="submit"
					loading={model.saving}
					disabled={!model.supported}
				>
					Сохранить размер
				</Button>
			</Form>
		</Modal>
	);
}
