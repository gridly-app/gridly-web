import { Link as RouterLink } from "react-router-dom";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import {
	Button,
	DataPanel,
	Feedback,
	Field,
	Input,
	Link,
	ListFilters,
	Modal,
	SegmentedControl,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	useTableColumns,
	WarmTooltip,
} from "@/shared/ui";
import { useInventoryPage } from "../model/useInventoryPage";
import { InventoryTable } from "./InventoryTable";
import { StockLinks } from "./StockLinks";
import { WriteOffForm } from "./WriteOffForm";

export function InventoryPage() {
	const model = useInventoryPage();
	const mode = useWorkspaceMode();
	const warehouse = model.warehouse;
	const stockColumns = useTableColumns("stock", [
		"Зона",
		"Количество",
		"Резерв",
		"Годность",
		"Действия",
	]);
	const incomingColumns = useTableColumns("incoming", [
		"Ожидается",
		"Поставка / поставщик",
		"Срок",
	]);
	const writeOffColumns = useTableColumns("writeoffs", [
		"Списано",
		"Стоимость",
		"Дата",
		"Причина",
	]);
	const stockView = model.view === "stock";
	const writeOffView = model.view === "writeoffs";
	const empty = stockView
		? model.visibleStock.length === 0
		: writeOffView
			? model.writeOffs.length === 0
			: model.expectedProducts.length === 0;
	const emptyMessage = writeOffView
		? !model.writeOffsAvailable
			? "Журнал списаний пока недоступен."
			: model.writeOffsEmpty
				? "Списаний пока нет."
				: "Списаний с выбранными фильтрами нет."
		: stockView
			? model.empty
				? "На складе пока нет остатков."
				: "Ничего не найдено. Измените поиск или фильтр."
			: "Ожидаемых поступлений с выбранными фильтрами нет.";
	return (
		<>
			{model.filter === "unpriced" && (
				<Feedback
					tone="info"
					className="workspace-alert"
					action={
						<Button variant="text" size="sm" onClick={model.resetFilters}>
							Сбросить фильтры отчёта
						</Button>
					}
				>
					{writeOffView ? "Списания без цены" : "Остатки без цены"}
					{model.from && ` · с ${model.from}`}
					{model.to && ` · по ${model.to}`}
				</Feedback>
			)}
			<DataPanel
				empty={empty}
				emptyMessage={emptyMessage}
				toolbar={
					<>
						<SegmentedControl
							aria-label="Раздел остатков"
							value={model.view}
							onValueChange={model.changeView}
							items={[
								{ value: "stock", label: "На складе" },
								{ value: "incoming", label: "Ожидается" },
								{ value: "writeoffs", label: "Списания" },
							]}
						/>

						{
							(stockView
								? stockColumns
								: writeOffView
									? writeOffColumns
									: incomingColumns
							).button
						}
						<ListFilters
							search={{
								"aria-label": writeOffView
									? "Поиск по списаниям"
									: stockView
										? "Поиск по остаткам"
										: "Поиск по ожидаемым поступлениям",
								value: model.search,
								onChange: model.setSearch,
							}}
							count={
								[
									model.category !== "all",
									!!model.productFilter,
									model.filter !== "all",
									!!model.from,
									!!model.to,
								].filter(Boolean).length
							}
							onReset={model.resetFilters}
						>
							<Select
								aria-label="Товар"
								value={model.productFilter ?? "all"}
								onValueChange={model.setProduct}
								options={[
									{ value: "all", label: "Все товары" },
									...warehouse.products.map((product) => ({
										value: product.id,
										label: `${product.name} · ${product.sku}`,
									})),
								]}
							/>
							{(stockView || writeOffView) && (
								<Select
									aria-label={
										writeOffView ? "Фильтр списаний" : "Фильтр остатков"
									}
									value={model.filter}
									onValueChange={model.changeFilter}
									options={[
										{
											value: "all",
											label: writeOffView ? "Все списания" : "Все партии",
										},
										...(stockView
											? [
													{ value: "expired", label: "Просрочено" },
													{ value: "reserved", label: "В резерве" },
													{ value: "zero", label: "Нулевые остатки" },
												]
											: []),
										{ value: "unpriced", label: "Без цены" },
									]}
								/>
							)}
							{writeOffView && (
								<>
									<Field label="С">
										<Input
											type="date"
											value={model.from}
											onChange={(event) => model.setFrom(event.target.value)}
										/>
									</Field>
									<Field label="По">
										<Input
											type="date"
											value={model.to}
											onChange={(event) => model.setTo(event.target.value)}
										/>
									</Field>
								</>
							)}
							<Select
								aria-label="Категория остатков"
								value={model.category}
								onValueChange={model.setCategory}
								options={[
									{ value: "all", label: "Все категории" },
									...model.categories.map((category) => ({
										value: category.id,
										label: category.name,
									})),
								]}
							/>
						</ListFilters>
					</>
				}
			>
				{stockView && model.visibleStock.length > 0 && (
					<InventoryTable
						items={model.visibleStock}
						hiddenColumns={stockColumns.hiddenColumns}
						warehouse={warehouse}
						pending={model.pending}
						onWriteOff={model.openWriteOff}
						highlightUnpriced={model.filter === "unpriced"}
					/>
				)}
				{writeOffView &&
					model.writeOffsAvailable &&
					model.writeOffs.length > 0 && (
						<Table hiddenColumns={writeOffColumns.hiddenColumns}>
							<TableHeader>
								<TableRow>
									<TableHead>Товар</TableHead>
									<TableHead>Списано</TableHead>
									<TableHead>Стоимость</TableHead>
									<TableHead>Дата</TableHead>
									<TableHead>Причина</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{model.writeOffs.map((item) => (
									<TableRow
										key={item.id}
										data-unpriced-highlight={model.filter === "unpriced"}
									>
										<TableCell>
											{item.productName}
											<StockLinks
												warehouseId={warehouse.id}
												productId={item.product}
												orders={warehouse.orders}
											/>
										</TableCell>
										<TableCell>
											{item.quantity.toLocaleString("ru-RU")} шт.
										</TableCell>
										<TableCell>
											{item.price === null
												? "Не указана"
												: (item.price * item.quantity).toLocaleString("ru-RU", {
														style: "currency",
														currency: "RUB",
													})}
										</TableCell>
										<TableCell>
											{new Date(item.time).toLocaleDateString("ru-RU", {
												timeZone: model.timezone,
											})}
										</TableCell>
										<TableCell>{item.reason}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				{model.view === "incoming" && model.expectedProducts.length > 0 && (
					<Table hiddenColumns={incomingColumns.hiddenColumns}>
						<TableHeader>
							<TableRow>
								<TableHead>Товар</TableHead>
								<TableHead>Ожидается</TableHead>
								<TableHead>Поставка / поставщик</TableHead>
								<TableHead>Срок</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{model.expectedProducts.flatMap((item) =>
								item.incoming.deliveries.map((delivery) => (
									<TableRow key={`${item.id}-${delivery.orderId}`}>
										<TableCell>
											<strong>{item.name}</strong>
											<StockLinks
												warehouseId={warehouse.id}
												productId={item.id}
												orders={warehouse.orders}
											/>
										</TableCell>
										<TableCell>
											+{delivery.quantity.toLocaleString("ru-RU")} шт.
										</TableCell>
										<TableCell>
											<Link
												render={
													<RouterLink
														to={{
															pathname: warehousePath(
																mode,
																warehouse.id,
																"inbound",
															),
															search: new URLSearchParams({
																order: delivery.orderId,
															}).toString(),
														}}
													/>
												}
											>
												{delivery.orderNumber}
											</Link>
											<small className="table-note">{delivery.party}</small>
										</TableCell>
										<TableCell>
											<WarmTooltip content={delivery.forecast.note} focusable>
												<span>{delivery.label}</span>
											</WarmTooltip>
										</TableCell>
									</TableRow>
								)),
							)}
						</TableBody>
					</Table>
				)}
			</DataPanel>
			{model.selected && (
				<Modal title="Списание партии" onClose={model.closeWriteOff}>
					<WriteOffForm
						stock={model.selected}
						pending={model.pending}
						onSave={model.writeOffStock}
					/>
				</Modal>
			)}
		</>
	);
}
