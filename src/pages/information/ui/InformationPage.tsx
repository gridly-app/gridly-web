import { IconBuildingWarehouse } from "@tabler/icons-react";
import { Button } from "@/shared/ui";
import { useInformationPage } from "../model/useInformationPage";
import informationStyles from "./InformationPage.module.css";

export function InformationPage() {
	const { warehouse, openSettings } = useInformationPage();

	return (
		<section className={informationStyles.warehouseInformation}>
			<div className={informationStyles.informationName}>
				<IconBuildingWarehouse size={28} />
				<h2>{warehouse.name}</h2>
			</div>
			<dl>
				<div>
					<dt>Расположение</dt>
					<dd>{warehouse.location}</dd>
				</div>
				<div>
					<dt>Размер карты</dt>
					<dd>
						{warehouse.width} × {warehouse.height} клеток
					</dd>
				</div>
				<div>
					<dt>Часовой пояс</dt>
					<dd>{warehouse.timezone}</dd>
				</div>
				<div>
					<dt>Карта</dt>
					<dd>{warehouse.published ? "Опубликована" : "Черновик"}</dd>
				</div>
				<div>
					<dt>Роботы</dt>
					<dd>{warehouse.summary?.robotCount ?? "—"}</dd>
				</div>
				<div>
					<dt>Товары</dt>
					<dd>{warehouse.summary?.productCount ?? "—"}</dd>
				</div>
			</dl>
			<Button variant="ghost" onClick={openSettings}>
				Изменить параметры
			</Button>
		</section>
	);
}
