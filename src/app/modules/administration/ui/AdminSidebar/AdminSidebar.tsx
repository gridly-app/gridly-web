import { IconArrowLeft, IconShieldCog } from "@tabler/icons-react";

import { type AdminTab, adminLocation } from "@/ports/navigation";
import { groups } from "../../config/adminSections";

import { Link } from "@/shared/ui/navigation";

import { managementStyles as sharedStyles } from "@/shared/ui/management";
import styles from "./AdminSidebar.module.css";

export function AdminSidebar({
	backPath,
	activeTab,
}: {
	backPath: string;
	activeTab: AdminTab;
}) {
	return (
		<aside className={styles.sidebar}>
			<Link className={`${styles.back} ${sharedStyles.link}`} to={backPath}>
				<IconArrowLeft size={16} aria-hidden="true" /> Рабочее пространство
			</Link>
			<div className={styles.adminTitle}>
				<span className={styles.sectionIcon}>
					<IconShieldCog size={20} aria-hidden="true" />
				</span>
				Администрирование
			</div>
			<nav className={styles.navigation} aria-label="Разделы администрирования">
				{groups.map((group) => (
					<div key={group.id}>
						<p className={styles.groupLabel}>{group.label}</p>
						{group.items.map(({ id, label, icon: Icon }) => (
							<Link
								key={id}
								className={styles.navLink}
								aria-current={activeTab === id ? "page" : undefined}
								to={adminLocation(id)}
							>
								<Icon className={styles.navIcon} size={18} aria-hidden="true" />
								{label}
							</Link>
						))}
					</div>
				))}
			</nav>
		</aside>
	);
}
