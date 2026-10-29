import { Combobox, DataPanel, Modal, SearchField } from "@/shared/ui";
import { useInventoryPage } from "../model/useInventoryPage";
import { InventoryTable } from "./InventoryTable";
import { WriteOffForm } from "./WriteOffForm";

export function InventoryPage() {
	const {
		empty,
		search,
		setSearch,
		filter,
		changeFilter,
		pending,
		openWriteOff,
		closeWriteOff,
		selected,
		writeOffStock,
		visibleStock,
	} = useInventoryPage();

	return (
		<>
			<DataPanel
				empty={visibleStock.length === 0}
				emptyMessage={
					empty
						? "На складе пока нет остатков."
						: "Ничего не найдено. Измените поиск или фильтр."
				}
				toolbar={
					<>
						<SearchField
							aria-label="Поиск по остаткам"
							value={search}
							onChange={setSearch}
						/>
						<Combobox
							aria-label="Фильтр остатков"
							value={filter}
							onValueChange={changeFilter}
							options={[
								{ value: "all", label: "Все партии" },
								{ value: "expired", label: "Просрочено" },
								{ value: "reserved", label: "В резерве" },
							]}
						/>
					</>
				}
			>
				<InventoryTable
					items={visibleStock}
					pending={pending}
					onWriteOff={openWriteOff}
				/>
			</DataPanel>
			{selected && (
				<Modal title="Списание партии" onClose={closeWriteOff}>
					<WriteOffForm
						stock={selected}
						pending={pending}
						onSave={writeOffStock}
					/>
				</Modal>
			)}
		</>
	);
}
