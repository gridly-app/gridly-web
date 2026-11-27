import type { Category, Product, ProductInput } from "@/domain/warehouse";
import { Input } from "@/shared/ui/controls";
import { Combobox, Field, FormGrid, FormShell } from "@/shared/ui/forms";

import { catalogNameMaxLength } from "../../model/catalog";
import { productFromForm } from "../../model/productFromForm";

const defaultVolume = "0.500";

export function ProductForm({
	product,
	categories,
	isPending,
	onSave,
}: {
	product?: Product | undefined;
	categories: Category[];
	isPending: boolean;
	onSave: (product: ProductInput) => Promise<void>;
}) {
	const categoryOptions = categories.map((category) => ({
		value: category.id,
		label: category.name,
	}));

	function handleSubmit(data: FormData) {
		return onSave(productFromForm(data, product));
	}

	return (
		<FormShell pending={isPending} onSubmit={handleSubmit}>
			<Field label="Название *">
				<Input
					name="name"
					defaultValue={product?.name}
					required
					maxLength={catalogNameMaxLength}
				/>
			</Field>
			<Field label="Артикул *">
				<Input name="sku" defaultValue={product?.sku} required />
			</Field>
			<Field label="Категория *">
				<Combobox
					name="category"
					defaultValue={product?.category || ""}
					required
					placeholder="Выберите категорию"
					options={categoryOptions}
				/>
			</Field>
			<FormGrid>
				<Field label="Объём, м³ *">
					<Input
						name="volume"
						defaultValue={product?.volume || defaultVolume}
						required
						inputMode="decimal"
					/>
				</Field>
				<Field label="Цена, ₽ (необязательно)">
					<Input
						name="price"
						defaultValue={product?.price ?? ""}
						placeholder="Не указана"
						inputMode="decimal"
					/>
				</Field>
			</FormGrid>
			<Field label="Типовой срок годности, дней (0 — без срока)">
				<Input
					name="shelf"
					type="number"
					min={0}
					defaultValue={product?.shelf || 0}
				/>
			</Field>
		</FormShell>
	);
}
