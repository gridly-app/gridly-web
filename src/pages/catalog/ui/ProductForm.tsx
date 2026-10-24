import type { Category, Product } from "@/entities/warehouse";
import { Combobox, Field, FormGrid, FormShell, Input } from "@/shared/ui";
import { productFromForm } from "../model/productFromForm";

export interface ProductFormProps {
	categories: Category[];
	product?: Product;
	onSave: (product: Product) => Promise<void>;
	pending: boolean;
}

export function ProductForm({
	product,
	categories,
	pending,
	onSave,
}: ProductFormProps) {
	return (
		<FormShell
			pending={pending}
			onSubmit={(data) => onSave(productFromForm(data, product))}
		>
			<Field label="Название *">
				<Input
					name="name"
					defaultValue={product?.name}
					required
					maxLength={80}
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
					options={categories.map((category) => ({
						value: category.id,
						label: category.name,
					}))}
				/>
			</Field>
			<FormGrid>
				<Field label="Объём, м³ *">
					<Input
						name="volume"
						defaultValue={product?.volume || "0.500"}
						required
						inputMode="decimal"
					/>
				</Field>
				<Field label="Цена, ₽ *">
					<Input
						name="price"
						defaultValue={product?.price || "0.00"}
						required
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
