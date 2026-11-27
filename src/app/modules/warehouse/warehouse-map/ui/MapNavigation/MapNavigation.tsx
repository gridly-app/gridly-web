import {
	IconChevronDown,
	IconDimensions,
	IconHammer,
	IconRoute,
} from "@tabler/icons-react";
import type { RefObject } from "react";

import { Button, Toolbar } from "@/shared/ui/controls";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/shared/ui/overlays";

import type { MapEditor } from "../../model/draft/useMapEditor";

import styles from "./MapNavigation.module.css";

export interface MapNavigationProps {
	navigation: RefObject<HTMLDivElement | null>;
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
	onExitView: () => void;
}

export function MapNavigation({
	navigation,
	editor,
	routes,
	onExitView,
}: MapNavigationProps) {
	const menuItemButton = (
		<Button variant="ghost" size="sm" className={styles.navigationItem} />
	);
	const optimizeHint = routes.supported
		? undefined
		: "Построение маршрутов недоступно по данным сервера";

	function handleConstruction() {
		editor.start("construction");
	}

	function handleRoutes() {
		editor.start("routes");
	}

	function handleOptimize() {
		void routes.optimize();
	}

	return (
		<Toolbar
			data-variant="floating"
			data-map-editor-menu=""
			aria-label="Действия режима просмотра"
			ref={navigation}
			className={styles.mapViewNavigation}
		>
			<nav aria-label="Управление картой">
				<ul className={styles.spaceNavigationList}>
					<li>
						<Menu open={editor.menuOpen} onOpenChange={editor.setMenuOpen}>
							<MenuTrigger
								disabled={editor.busy}
								render={
									<Button
										variant="ghost"
										className={styles.spaceNavigationTrigger}
									/>
								}
							>
								Редактирование <IconChevronDown size={14} />
							</MenuTrigger>
							<MenuPopup
								className={styles.spaceNavigationContent}
								data-map-editor-menu=""
							>
								<MenuItem
									nativeButton
									render={menuItemButton}
									onClick={editor.openSize}
									disabled={editor.active}
								>
									<IconDimensions size={16} />
									Размер
								</MenuItem>
								<MenuItem
									nativeButton
									render={menuItemButton}
									onClick={handleConstruction}
								>
									<IconHammer size={16} />
									Строительство
								</MenuItem>
								<MenuItem
									nativeButton
									render={menuItemButton}
									onClick={handleRoutes}
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
								title={optimizeHint}
								onClick={handleOptimize}
							>
								Оптимизация путей
							</Button>
						</li>
					)}
					{editor.active && (
						<li>
							<Button
								className={styles.viewButton}
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
							className={styles.viewButton}
							variant="ghost"
							onClick={onExitView}
							tooltip="Вернуться в рабочую область · Esc"
						>
							Выйти из просмотра
						</Button>
					</li>
				</ul>
			</nav>
		</Toolbar>
	);
}
