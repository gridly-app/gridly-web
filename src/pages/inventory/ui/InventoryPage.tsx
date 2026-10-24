import { Combobox, DataPanel, Modal, SearchField } from "@/shared/ui";
import { useInventoryPage } from "../model/useInventoryPage";
import { InventoryTable } from "./InventoryTable";
import { WriteOffForm } from "./WriteOffForm";

export function InventoryPage() {
	const model = useInventoryPage();
	const {
		empty,
		search,
		setSearch,
		filter,
		changeFilter,
		pending,
		setSelected,
		selected,
		writeOffStock,
	} = model;

	return (
		<>
			<DataPanel
				empty={empty}
				toolbar={
					<>
						<SearchField value={search} onChange={setSearch} />
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
				<InventoryTable model={model} />
			</DataPanel>
			{selected && (
				<Modal title="Списание партии" onClose={() => setSelected(null)}>
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
