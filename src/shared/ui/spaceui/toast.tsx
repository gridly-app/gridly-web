import { Toast } from "@base-ui/react/toast";
import type { ReactNode } from "react";

import css from "./toast.module.css";

export const toastManager = Toast.createToastManager();

function Toasts() {
	const { toasts } = Toast.useToastManager();

	return (
		<Toast.Portal data-slot="toast-portal">
			<Toast.Viewport
				className={css.viewport}
				data-position="bottom-right"
				data-slot="toast-viewport"
			>
				{toasts.map((toast) => (
					<Toast.Root
						key={toast.id}
						className={css.toast}
						data-position="bottom-right"
						swipeDirection={["right", "down"]}
						toast={toast}
					>
						<Toast.Content className={css.stackContent}>
							<Toast.Description
								className={css.description}
								data-slot="toast-description"
							/>
						</Toast.Content>
					</Toast.Root>
				))}
			</Toast.Viewport>
		</Toast.Portal>
	);
}

export function ToastProvider({ children }: { children: ReactNode }) {
	return (
		<Toast.Provider toastManager={toastManager}>
			{children}
			<Toasts />
		</Toast.Provider>
	);
}
