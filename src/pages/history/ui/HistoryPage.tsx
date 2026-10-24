import { DataPanel, SearchField } from "@/shared/ui";
import { useHistoryPage } from "../model/useHistoryPage";
import historyStyles from "./HistoryPage.module.css";
import localLayout from "./Layout.module.css";

export function HistoryPage() {
	const { visibleEvents, empty, search, setSearch } = useHistoryPage();

	return (
		<DataPanel
			empty={empty}
			toolbar={<SearchField value={search} onChange={setSearch} />}
		>
			{
				<div className={historyStyles.timeline}>
					{visibleEvents.map((e) => (
						<div key={e.id}>
							<span className={historyStyles["event-dot"]} />
							<div>
								<b>{e.title}</b>
								<p className={localLayout.muted}>{e.detail}</p>
							</div>
							<time>{new Date(e.time).toLocaleString("ru")}</time>
						</div>
					))}
				</div>
			}
		</DataPanel>
	);
}
