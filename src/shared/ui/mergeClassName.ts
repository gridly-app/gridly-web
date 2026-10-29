type StatefulClassName<State> =
	| string
	| null
	| undefined
	| ((state: State) => string | null | undefined);

export function mergeClassName<State>(
	baseClassName: string | undefined,
	className: StatefulClassName<State>,
): (state: State) => string {
	return (state) => {
		const customClassName =
			typeof className === "function" ? className(state) : className;

		return [baseClassName, customClassName].filter(Boolean).join(" ");
	};
}
