import { Button, Input } from "@/shared/ui/controls";
import { ErrorNotice } from "@/shared/ui/feedback";
import { Field, Form } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";
import type { useMapSize } from "../../model/editor/useMapSize";
import styles from "./MapSizeDialog.module.css";

export interface MapSizeDialogProps {
	model: ReturnType<typeof useMapSize>;
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
				<Field label="Ширина">
					<Input
						name="width"
						type="number"
						min={5}
						max={100}
						required
						defaultValue={model.width}
					/>
				</Field>
				<Field label="Высота">
					<Input
						name="height"
						type="number"
						min={5}
						max={100}
						required
						defaultValue={model.height}
					/>
				</Field>
				<ErrorNotice message={model.error} />
				{!model.supported && (
					<ErrorNotice message="Изменение размера недоступно по данным сервера." />
				)}
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
