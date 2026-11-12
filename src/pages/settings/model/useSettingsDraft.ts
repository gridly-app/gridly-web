import { useState } from "react";

export function useSettingsDraft(savedValue: string, revision?: number) {
	const [draft, setDraft] = useState<{
		value: string;
		revision: number;
	} | null>(null);

	return {
		value: draft?.value ?? savedValue,
		revision: draft?.revision ?? revision,
		dirty: draft !== null,
		setValue: (value: string) => {
			if (revision !== undefined)
				setDraft((current) => ({
					value,
					revision: current?.revision ?? revision,
				}));
		},
		reset: () => setDraft(null),
	};
}
