import { expect, test } from "bun:test";
import { z } from "zod";
import { ApiError } from "@/shared/api";
import { errorMessage, UserError } from "@/shared/lib";

test("public messages never include exception text or diagnostic API details", () => {
	const apiError = new ApiError(
		"database driver: internal query",
		422,
		"toString",
		{
			issues: [{ field: "internal_revision", message: "internal table name" }],
		},
		"internal-request-id",
	);
	expect(errorMessage(apiError)).toBe(
		"Проверьте введённые данные и попробуйте ещё раз.",
	);
	expect(apiError.message).toBe("database driver: internal query");
	expect(apiError.requestId).toBe("internal-request-id");
	expect(
		errorMessage(new Error("WarehouseRepositoryProvider is missing")),
	).toBe("Не удалось выполнить действие. Попробуйте ещё раз.");
	const schema = z.object({ internal_revision: z.number() });
	expect(errorMessage(schema.safeParse({}).error)).toBe(
		"Проверьте введённые данные и попробуйте ещё раз.",
	);
});

test("public messages preserve local guidance and translate known API failures", () => {
	const guidance = "Выберите свободную стартовую клетку.";
	expect(errorMessage(new UserError(guidance))).toBe(guidance);
	expect(errorMessage(new ApiError("stack trace", 409, "STALE_REVISION"))).toBe(
		"Объект изменился. Обновите данные, проверьте изменения и повторите сохранение.",
	);
	expect(errorMessage(new DOMException("internal URL", "TimeoutError"))).toBe(
		"Сервер отвечает слишком долго. Попробуйте ещё раз.",
	);
});
