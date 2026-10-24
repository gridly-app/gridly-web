import { Button, ErrorNotice, Field, Form, Input, Modal } from "@/shared/ui";
import type { useMapSize } from "../../model/map/useMapSize";
import localLayout from "./Layout.module.css";

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
				<p className={localLayout.muted}>
					Поставьте симуляцию на паузу. Клетки с товарами и роботами
					сохраняются.
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
					<p role="alert">
						Изменение размера доступно в демо. Текущий сервер не поддерживает
						эту операцию.
					</p>
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
