import {
	type Product,
	productOccupancy,
	productPrice,
	type Stock,
	totalReserved,
} from "@/domain/warehouse";
import { DetailFact, DetailFacts } from "@/shared/ui/dataDisplay";

import styles from "./ProductFacts.module.css";

const numberFormat = new Intl.NumberFormat("ru-RU");
const moneyFormat = new Intl.NumberFormat("ru-RU", {
	style: "currency",
	currency: "RUB",
});

export function ProductFacts({
	product,
	stock,
}: {
	product: Product;
	stock: Stock[];
}) {
	const occupancy = productOccupancy(product, stock);
	const reserved = totalReserved(stock);
	const price = productPrice(product.price);
	const occupiedVolume =
		occupancy.volume === null
			? "—"
			: `${numberFormat.format(occupancy.volume)} м³`;
	const priceLabel = price === null ? "Не указана" : moneyFormat.format(price);
	const shelfLabel = product.shelf
		? `${numberFormat.format(product.shelf)} дн.`
		: "Без срока";

	return (
		<DetailFacts className={styles.productFacts}>
			<DetailFact label="На складе">
				{numberFormat.format(occupancy.quantity)} шт.
			</DetailFact>
			<DetailFact label="В резерве">
				{numberFormat.format(reserved)} шт.
			</DetailFact>
			<DetailFact label="Занято на складе">{occupiedVolume}</DetailFact>
			<DetailFact label="Цена за единицу">{priceLabel}</DetailFact>
			<DetailFact label="Объём единицы">{product.volume} м³</DetailFact>
			<DetailFact label="Типовой срок годности">{shelfLabel}</DetailFact>
		</DetailFacts>
	);
}
