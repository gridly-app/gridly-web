import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useEffect,
	useState,
} from "react";

const activeContext = createContext(false);
const actionContext = createContext<(_active: boolean) => void>(() => {});

export function ImmersiveProvider({ children }: { children: ReactNode }) {
	const [active, setActive] = useState(false);
	return (
		<actionContext.Provider value={setActive}>
			<activeContext.Provider value={active}>{children}</activeContext.Provider>
		</actionContext.Provider>
	);
}

export function useImmersiveState() {
	return useContext(activeContext);
}

export function useImmersiveRegion(
	active: boolean,
	region: RefObject<HTMLElement | null>,
	returnFocus?: RefObject<HTMLElement | null>,
) {
	const setActive = useContext(actionContext);
	useEffect(() => {
		if (!active) return;
		const previous = document.activeElement;
		setActive(true);
		region.current?.focus({ preventScroll: true });
		return () => {
			setActive(false);
			const target = returnFocus?.current ?? previous;
			if (target instanceof HTMLElement && target.isConnected)
				target.focus({ preventScroll: true });
		};
	}, [active, region, returnFocus, setActive]);
}
