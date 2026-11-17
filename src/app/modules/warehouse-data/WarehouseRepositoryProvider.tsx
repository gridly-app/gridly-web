import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type { WarehouseRepository } from "./repositories/repository";

export interface WarehouseRepositoryProviderProps {
	repository: WarehouseRepository;
	children: ReactNode;
}

const Context = createContext<WarehouseRepository | null>(null);

export function WarehouseRepositoryProvider({
	repository,
	children,
}: WarehouseRepositoryProviderProps) {
	return <Context.Provider value={repository}>{children}</Context.Provider>;
}

export function useWarehouseRepository() {
	const value = useContext(Context);

	if (!value) {
		throw new Error("WarehouseRepositoryProvider is missing");
	}

	return value;
}
