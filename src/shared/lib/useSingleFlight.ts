import { useRef, useState } from "react";

export function useSingleFlight() {
	const running = useRef(false);
	const [isRunning, setIsRunning] = useState(false);

	async function run<Result>(
		work: () => Promise<Result>,
	): Promise<Result | undefined> {
		if (running.current) return undefined;

		running.current = true;
		setIsRunning(true);

		try {
			return await work();
		} finally {
			running.current = false;
			setIsRunning(false);
		}
	}

	return { isRunning, run };
}
