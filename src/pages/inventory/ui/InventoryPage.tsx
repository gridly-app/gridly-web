import {
	Button,
	DataPanel,
	Field,
	Input,
	ListFilters,
	Modal,
	SearchField,
	SegmentedControl,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	WarmTooltip,
} from "@/shared/ui";
import { useInventoryPage } from "../model/useInventoryPage";
import { InventoryTable } from "./InventoryTable";
import { WriteOffForm } from "./WriteOffForm";

export function InventoryPage() {
	const model = useInventoryPage();
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
				<div className="report-context">
					<span>
						{writeOffView ? "Списания без цены" : "Остатки без цены"}
						{model.from && ` · ${model.from} — ${model.to}`}
					</span>
					<Button variant="text" size="sm" onClick={model.resetFilters}>
						Сбросить фильтры отчёта
					</Button>
				</div>
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
						<SearchField
							aria-label={
								writeOffView
									? "Поиск по списаниям"
									: stockView
										? "Поиск по остаткам"
										: "Поиск по ожидаемым поступлениям"
							}
							value={model.search}
							onChange={model.setSearch}
						/>
						<ListFilters
							count={
								[
									model.category !== "all",
									model.filter !== "all",
									!!model.from,
									!!model.to,
								].filter(Boolean).length
							}
							onReset={model.resetFilters}
						>
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
						</ListFilters>
					</>
				}
			>
				{stockView && model.visibleStock.length > 0 && (
					<InventoryTable
						items={model.visibleStock}
						pending={model.pending}
						onWriteOff={model.openWriteOff}
						highlightUnpriced={model.filter === "unpriced"}
					/>
				)}
				{writeOffView &&
					model.writeOffsAvailable &&
					model.writeOffs.length > 0 && (
						<Table>
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
										<TableCell>{item.productName}</TableCell>
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
					<Table>
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
										</TableCell>
										<TableCell>
											+{delivery.quantity.toLocaleString("ru-RU")} шт.
										</TableCell>
										<TableCell>
											<strong>{delivery.orderNumber}</strong>
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
