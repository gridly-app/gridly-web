import { IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { errorMessage } from "@/shared/lib";
import { Button, IconButton, Input } from "@/shared/ui/controls";
import { ErrorNotice, Feedback } from "@/shared/ui/feedback";
import { Field, Form, FormActions, FormGrid } from "@/shared/ui/forms";

const defaultMapSize = "10";

export function WarehouseDimensionsForm({
	savedWidth,
	savedHeight,
	canResize,
	busy,
	saving,
	saveDimensions,
}: {
	savedWidth: number;
	savedHeight: number;
	canResize: boolean;
	busy: boolean;
	saving: boolean;
	saveDimensions: (size: { width: number; height: number }) => Promise<boolean>;
}) {
	const [draftWidth, setDraftWidth] = useState<string | null>(null);
	const [draftHeight, setDraftHeight] = useState<string | null>(null);
	const width = draftWidth ?? String(savedWidth);
	const height = draftHeight ?? String(savedHeight);
	const sizeChanged =
		Number(width) !== savedWidth || Number(height) !== savedHeight;
	const sizeDirty = draftWidth !== null || draftHeight !== null;
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");

	function changeSize(nextWidth: string, nextHeight: string) {
		setDraftWidth(nextWidth === String(savedWidth) ? null : nextWidth);
		setDraftHeight(nextHeight === String(savedHeight) ? null : nextHeight);
		setError("");
		setMessage("");
	}

	async function save() {
		if (busy || !canResize || !sizeChanged) return;
		setError("");
		setMessage("");
		try {
			if (
				await saveDimensions({ width: Number(width), height: Number(height) })
			) {
				setDraftWidth(null);
				setDraftHeight(null);
				setMessage("Сохранено");
			}
		} catch (error) {
			setError(errorMessage(error));
		}
	}

	return (
		<Form
			onSubmit={(event) => {
				event.preventDefault();
				void save();
			}}
		>
			<h4>Размеры карты</h4>
			<FormGrid>
				<Field label="Ширина, клеток">
					<Input
						type="number"
						min={5}
						max={100}
						step={1}
						required
						value={width}
						onChange={(event) => changeSize(event.currentTarget.value, height)}
						disabled={busy}
					/>
				</Field>
				<Field label="Высота, клеток">
					<Input
						type="number"
						min={5}
						max={100}
						step={1}
						required
						value={height}
						onChange={(event) => changeSize(width, event.currentTarget.value)}
						disabled={busy}
					/>
				</Field>
			</FormGrid>
			<ErrorNotice message={error} />
			{message && <Feedback tone="success">{message}</Feedback>}
			<FormActions>
				<Button
					type="submit"
					loading={saving}
					disabled={!canResize || busy || !sizeChanged}
					tooltip={
						!canResize ? "Изменение размеров карты недоступно" : undefined
					}
				>
					Сохранить размеры
				</Button>
				{sizeDirty && (
					<Button
						type="button"
						variant="secondary"
						disabled={busy}
						onClick={() => changeSize(String(savedWidth), String(savedHeight))}
					>
						Вернуть сохранённые размеры
					</Button>
				)}
				<IconButton
					type="button"
					label="Сбросить размеры карты до 10 × 10"
					tooltip="Сбросить размеры до 10 × 10"
					icon={<IconRefresh size={16} />}
					disabled={busy}
					onClick={() => changeSize(defaultMapSize, defaultMapSize)}
				/>
			</FormActions>
		</Form>
	);
}
