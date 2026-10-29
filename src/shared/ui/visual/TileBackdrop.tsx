import { ProximityGrid } from "./ProximityGrid";
import tileStyles from "./TileBackdrop.module.css";

export interface TileBackdropProps {
	rows?: number;
	classNames?: { root?: string; grid?: string; fade?: string };
}

export function TileBackdrop({ rows = 8, classNames = {} }: TileBackdropProps) {
	return (
		<div
			className={`${tileStyles.tileBackdrop} ${classNames.root ?? ""}`}
			aria-hidden="true"
		>
			<ProximityGrid
				className={`${tileStyles.tileBackdropGrid} ${classNames.grid ?? ""}`}
				columns={12}
				rows={rows}
			/>
			<div
				className={`${tileStyles.tileBackdropFade} ${classNames.fade ?? ""}`}
			/>
		</div>
	);
}
