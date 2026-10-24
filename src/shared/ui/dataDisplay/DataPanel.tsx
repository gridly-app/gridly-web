import type { ReactNode } from "react";
import feedbackStyles from "../feedback/Feedback.module.css";
import panelStyles from "./DataPanel.module.css";

export interface DataPanelProps {
	toolbar: ReactNode;
	children: ReactNode;
	empty?: boolean;
}

export function DataPanel({
	toolbar,
	children,
	empty = false,
}: DataPanelProps) {
	return (
		<div className={`${panelStyles.panel} ${panelStyles["data-panel"]}`}>
			<div className={panelStyles["table-toolbar"]}>{toolbar}</div>
			<div className={panelStyles["table-scroll"]}>
				{children}
				{empty && (
					<div className={feedbackStyles.empty}>
						Пока нет данных. Создайте первую запись с помощью кнопки выше.
					</div>
				)}
			</div>
		</div>
	);
}
