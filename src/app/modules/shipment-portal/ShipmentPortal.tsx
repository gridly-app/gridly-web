import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import type { ShipmentProgressSlot } from "@/ports/shipment";
import type { FileHttpClient } from "@/shared/http";

import { GuestShipmentApi } from "./api/guestShipmentApi";
import { guestTokenFromHash } from "./model/order/guestToken";
import { GuestOrder } from "./ui/order/GuestOrder/GuestOrder";

import styles from "./shared.module.css";

export function ShipmentPortal({
	http,
	progress,
}: {
	http: FileHttpClient;
	progress: ShipmentProgressSlot;
}) {
	const guestApi = useMemo(() => new GuestShipmentApi(http), [http]);
	const { hash } = useLocation();
	const token = guestTokenFromHash(hash);

	return (
		<main className={styles.page}>
			<header className={styles.top}>
				<strong>Gridly</strong>
				<span>Кабинет отгрузок</span>
			</header>
			<GuestOrder
				key={token}
				token={token}
				guestApi={guestApi}
				progress={progress}
			/>
		</main>
	);
}
