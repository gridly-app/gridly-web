import {
	type Product,
	productOccupancy,
	productPrice,
	type Stock,
} from "@/entities/warehouse";
import { DetailFact, DetailFacts } from "@/shared/ui/dataDisplay";
import styles from "./ProductFacts.module.css";

const number = new Intl.NumberFormat("ru-RU");
const money = new Intl.NumberFormat("ru-RU", {
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
	const reserved = stock.reduce((sum, item) => sum + (item.reserved ?? 0), 0);
	const price = productPrice(product.price);

	return (
		<DetailFacts className={styles.productFacts}>
			<DetailFact label="На складе">
				{number.format(occupancy.quantity)} шт.
			</DetailFact>
			<DetailFact label="В резерве">{number.format(reserved)} шт.</DetailFact>
			<DetailFact label="Занято на складе">
				{occupancy.volume === null
					? "—"
					: `${number.format(occupancy.volume)} м³`}
			</DetailFact>
			<DetailFact label="Цена за единицу">
				{price === null ? "Не указана" : money.format(price)}
			</DetailFact>
			<DetailFact label="Объём единицы">{product.volume} м³</DetailFact>
			<DetailFact label="Типовой срок годности">
				{product.shelf ? `${number.format(product.shelf)} дн.` : "Без срока"}
			</DetailFact>
		</DetailFacts>
	);
}
