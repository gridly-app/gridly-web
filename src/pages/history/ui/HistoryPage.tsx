import { DataPanel, SearchField } from "@/shared/ui";
import { useHistoryPage } from "../model/useHistoryPage";
import historyStyles from "./HistoryPage.module.css";
import localLayout from "./Layout.module.css";

const dateFormatter = new Intl.DateTimeFormat("ru");

export function HistoryPage() {
	const { visibleEvents, empty, search, setSearch } = useHistoryPage();

	return (
		<DataPanel
			empty={visibleEvents.length === 0}
			emptyMessage={
				empty
					? "История операций пока пуста."
					: "Ничего не найдено. Измените поиск."
			}
			toolbar={
				<SearchField
					aria-label="Поиск по истории"
					value={search}
					onChange={setSearch}
				/>
			}
		>
			<ul className={historyStyles.timeline}>
				{visibleEvents.map((e) => (
					<li key={e.id}>
						<span className={historyStyles.eventDot} />
						<div>
							<b>{e.title}</b>
							<p className={localLayout.muted}>{e.detail}</p>
						</div>
						<time>{dateFormatter.format(new Date(e.time))}</time>
					</li>
				))}
			</ul>
		</DataPanel>
	);
}
