import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act } from "react";
import { createRoot } from "react-dom/client";

export function registerTestDom() {
	GlobalRegistrator.register();
	Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
		value: true,
		writable: true,
		configurable: true,
	});

	return async () => {
		Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
		await GlobalRegistrator.unregister();
	};
}

export function mountDom() {
	const unregister = registerTestDom();
	const root = createRoot(document.body);

	async function close() {
		try {
			act(() => root.unmount());
		} finally {
			await unregister();
		}
	}

	return { root, close };
}
