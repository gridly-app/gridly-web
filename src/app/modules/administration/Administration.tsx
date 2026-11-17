import { type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import type { Warehouse } from "@/domain/warehouse";
import type { WorkspaceMode } from "@/ports/session";

import {
	type AdminSectionLocation,
	readAdminLocation,
} from "@/ports/navigation";

import { defaultAdminSection, sections } from "./config/adminSections";

import { AdminSidebar } from "./ui/AdminSidebar/AdminSidebar";
import { AdminOrderDialog } from "./ui/AdminOrderDialog/AdminOrderDialog";

import styles from "./Administration.module.css";

type AdministrationProps = {
	mode: WorkspaceMode;
	renderSection: (section: AdminSectionLocation) => ReactNode;
	renderOrder: (warehouse: Warehouse) => ReactNode;
};

export function Administration({
	mode,
	renderSection,
	renderOrder,
}: AdministrationProps) {
	const [params] = useSearchParams();
	const { section, orderCard } = readAdminLocation(params);
	const orderCardKey = orderCard ? JSON.stringify(orderCard) : undefined;
	const activeSection =
		sections.find(({ id }) => id === section.tab) ?? defaultAdminSection;
	const backPath = mode === "sandbox" ? "/sandbox" : "/app";

	return (
		<div className={styles.page}>
			<AdminSidebar backPath={backPath} activeTab={activeSection.id} />
			<main className={styles.main}>
				<header className={styles.heading}>
					<h1 className={styles.title}>{activeSection.label}</h1>
				</header>
				{renderSection(section)}
				{orderCard && (
					<AdminOrderDialog
						key={orderCardKey}
						warehouseId={orderCard.warehouseId}
						renderOrder={renderOrder}
					/>
				)}
			</main>
		</div>
	);
}
