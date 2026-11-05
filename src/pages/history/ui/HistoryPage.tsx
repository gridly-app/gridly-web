import {
	Badge,
	DataPanel,
	Field,
	Input,
	ListFilters,
	SearchField,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui";
import { useHistoryPage } from "../model/useHistoryPage";
import styles from "./HistoryPage.module.css";

export function HistoryPage() {
	const model = useHistoryPage();
	const date = (value: string) =>
		Number.isFinite(Date.parse(value))
			? new Date(value).toLocaleDateString("ru-RU", {
					timeZone: model.timezone,
					day: "numeric",
					month: "short",
					year: "numeric",
				})
			: "Дата не передана";
	const time = (value: string) =>
		Number.isFinite(Date.parse(value))
			? new Date(value).toLocaleTimeString("ru-RU", {
					timeZone: model.timezone,
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
				})
			: "—";
	return (
		<DataPanel
			empty={model.visibleEvents.length === 0}
			emptyMessage={
				!model.valid
					? "Дата начала не должна быть позже даты окончания."
					: model.empty
						? "История операций пока пуста."
						: "Нет событий с выбранными фильтрами."
			}
			toolbar={
				<>
					<SearchField
						aria-label="Поиск по истории"
						value={model.search}
						onChange={model.setSearch}
					/>
					<ListFilters
						count={
							[
								model.category !== "all",
								model.sort !== "newest",
								!!model.from,
								!!model.to,
							].filter(Boolean).length
						}
						onReset={() => {
							model.setCategory("all");
							model.setSort("newest");
							model.setFrom("");
							model.setTo("");
						}}
					>
						<Select
							aria-label="Раздел истории"
							value={model.category}
							onValueChange={model.setCategory}
							options={[
								{ value: "all", label: "Все разделы" },
								...model.groups,
							]}
						/>
						<Select
							aria-label="Порядок событий"
							value={model.sort}
							onValueChange={model.setSort}
							options={[
								{ value: "newest", label: "Сначала новые" },
								{ value: "oldest", label: "Сначала старые" },
							]}
						/>
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
					</ListFilters>
				</>
			}
		>
			<div className={styles.log} data-history-log="">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Событие</TableHead>
							<TableHead className={styles.category}>Раздел</TableHead>
							<TableHead className={styles.when}>Когда</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{model.visibleEvents.map((event) => (
							<TableRow key={event.id}>
								<TableCell>
									<div className={styles.event}>
										<strong>{event.title}</strong>
										{event.detail && <p>{event.detail}</p>}
										<span className={styles.mobileBadge}>
											<Badge tone="neutral">{event.groupLabel}</Badge>
										</span>
									</div>
								</TableCell>
								<TableCell className={styles.category}>
									<Badge tone="neutral">{event.groupLabel}</Badge>
								</TableCell>
								<TableCell className={styles.when}>
									<time
										dateTime={
											Number.isFinite(Date.parse(event.time))
												? event.time
												: undefined
										}
									>
										{date(event.time)}
										<small>{time(event.time)}</small>
									</time>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</DataPanel>
	);
}
