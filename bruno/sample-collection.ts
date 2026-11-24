import { z } from "zod";

import type { MockStore } from "./mock-http";

export const collection = <T extends z.ZodType>(
	schema: T,
	store: MockStore,
	path: string,
) => z.object({ items: z.array(schema) }).parse(store.get(path)).items;
