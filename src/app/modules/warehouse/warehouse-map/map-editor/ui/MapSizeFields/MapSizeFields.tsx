import { useId } from "react";

import { Input } from "@/shared/ui/controls";
import { Field } from "@/shared/ui/forms";

const minMapSize = 5;
const maxMapSize = 100;

export function MapSizeFields({
	width,
	height,
	widthError,
	heightError,
}: {
	width: number;
	height: number;
	widthError?: string | undefined;
	heightError?: string | undefined;
}) {
	const widthErrorId = useId();
	const heightErrorId = useId();

	return (
		<>
			<Field label="Ширина" error={widthError} errorId={widthErrorId}>
				<Input
					name="width"
					aria-describedby={widthError ? widthErrorId : undefined}
					type="number"
					min={minMapSize}
					max={maxMapSize}
					required
					defaultValue={width}
				/>
			</Field>
			<Field label="Высота" error={heightError} errorId={heightErrorId}>
				<Input
					name="height"
					aria-describedby={heightError ? heightErrorId : undefined}
					type="number"
					min={minMapSize}
					max={maxMapSize}
					required
					defaultValue={height}
				/>
			</Field>
		</>
	);
}
