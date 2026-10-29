import {
	IconChevronDown,
	IconDimensions,
	IconHammer,
	IconRoute,
} from "@tabler/icons-react";
import type { RefObject } from "react";
import { Button, Menu, MenuItem, MenuPopup, MenuTrigger } from "@/shared/ui";
import type { MapEditor } from "../../model/layout/useMapEditor";
import type { useMapView } from "../../model/map/useMapView";

import mapStyles from "./WarehouseMap.module.css";

export interface MapNavigationProps {
	navigation: RefObject<HTMLDivElement | null>;
	view: Pick<ReturnType<typeof useMapView>, "setViewing">;
	editor: {
		active: boolean;
		busy: boolean;
		menuOpen: boolean;
		setMenuOpen: (open: boolean) => void;
		start: MapEditor["startMode"];
		openSize: () => void;
		close: () => void;
	};
	routes: {
		configuring: boolean;
		optimize: () => Promise<void>;
		supported: boolean;
		optimizing: boolean;
	};
}

export function MapNavigation({
	view,
	editor,
	routes,
	navigation,
}: MapNavigationProps) {
	return (
		<div ref={navigation} className={mapStyles.mapViewNavigation}>
			<nav aria-label="Управление картой">
				<ul className={mapStyles.spaceNavigationList}>
					<li>
						<Menu open={editor.menuOpen} onOpenChange={editor.setMenuOpen}>
							<MenuTrigger
								disabled={editor.busy}
								render={
									<Button
										variant="ghost"
										className={mapStyles.spaceNavigationTrigger}
									/>
								}
							>
								Редактирование <IconChevronDown size={14} />
							</MenuTrigger>
							<MenuPopup className={mapStyles.spaceNavigationContent}>
								<MenuItem
									nativeButton
									render={
										<Button
											variant="ghost"
											size="sm"
											className={mapStyles.navigationItem}
										/>
									}
									onClick={editor.openSize}
									disabled={editor.active}
								>
									<IconDimensions size={16} />
									Размер
								</MenuItem>
								<MenuItem
									nativeButton
									render={
										<Button
											variant="ghost"
											size="sm"
											className={mapStyles.navigationItem}
										/>
									}
									onClick={() => editor.start("construction")}
								>
									<IconHammer size={16} />
									Строительство
								</MenuItem>
								<MenuItem
									nativeButton
									render={
										<Button
											variant="ghost"
											size="sm"
											className={mapStyles.navigationItem}
										/>
									}
									onClick={() => editor.start("routes")}
								>
									<IconRoute size={16} />
									Настройка путей
								</MenuItem>
							</MenuPopup>
						</Menu>
					</li>

					{routes.configuring && (
						<li>
							<Button
								variant="ghost"
								disabled={!routes.supported || routes.optimizing}
								title={
									!routes.supported
										? "Построение маршрутов недоступно по данным сервера"
										: undefined
								}
								onClick={() => {
									void routes.optimize();
								}}
							>
								Оптимизация путей
							</Button>
						</li>
					)}
					{editor.active && (
						<li>
							<Button
								className={mapStyles.viewButton}
								variant="ghost"
								disabled={editor.busy}
								onClick={editor.close}
							>
								Закрыть редактор
							</Button>
						</li>
					)}
					<li>
						<Button
							className={mapStyles.viewButton}
							variant="ghost"
							onClick={() => view.setViewing(false)}
							tooltip="Вернуться в рабочую область · Esc"
						>
							Выйти из просмотра
						</Button>
					</li>
				</ul>
			</nav>
		</div>
	);
}
