import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act } from "react";
import { createRoot } from "react-dom/client";

export function mountDom() {
	GlobalRegistrator.register();
	Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
		value: true,
		configurable: true,
	});
	const root = createRoot(document.body);

	async function close() {
		try {
			act(() => root.unmount());
		} finally {
			Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
			await GlobalRegistrator.unregister();
		}
	}

	return { root, close };
}
