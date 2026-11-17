import type { ReactNode } from "react";

import type { AuditEvent } from "@/domain/shipment";

export type RenderAuditEvents = (
	items: AuditEvent[],
	search: string,
	label?: string,
) => ReactNode;

export type DescribeAuditEvent = (event: AuditEvent) => {
	area: string;
	areaLabel: string;
	event: string;
	description: string;
	searchFields: string[];
};

export type RecentErrorAudit = {
	events: AuditEvent[] | undefined;
	error: Error | null;
	isFetching: boolean;
	isComplete: boolean;
	canLoadAll: boolean;
	canSearchContext: boolean;
	onLoadAll: () => void;
	onRetry: () => void;
};
