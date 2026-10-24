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
import type { useRouteEditor } from "../../model/map/useRouteEditor";
import mapStyles from "./WarehouseMap.module.css";

export interface MapNavigationProps {
	navigation: RefObject<HTMLDivElement | null>;
	view: Pick<ReturnType<typeof useMapView>, "setViewing">;
	editor: {
		active: boolean;
		menuOpen: boolean;
		setMenuOpen: (open: boolean) => void;
		start: MapEditor["startMode"];
		openSize: () => void;
		close: () => void;
	};
	routes: {
		configuring: boolean;
		optimize: ReturnType<typeof useRouteEditor>["optimize"];
	};
}

export function MapNavigation({
	view,
	editor,
	routes,
	navigation,
}: MapNavigationProps) {
	return (
		<div ref={navigation} className={mapStyles["map-view-navigation"]}>
			<nav aria-label="Управление картой">
				<ul className={mapStyles["space-navigation-list"]}>
					<li>
						<Menu open={editor.menuOpen} onOpenChange={editor.setMenuOpen}>
							<MenuTrigger
								render={
									<Button
										variant="ghost"
										className={mapStyles["space-navigation-trigger"]}
									/>
								}
							>
								Редактирование <IconChevronDown size={14} />
							</MenuTrigger>
							<MenuPopup className={mapStyles["space-navigation-content"]}>
								<MenuItem
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
								className={mapStyles.viewButton}
								variant="ghost"
								onClick={routes.optimize}
								tooltip="Заново выбрать доки и кратчайшие пути для всех блоков склада"
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
