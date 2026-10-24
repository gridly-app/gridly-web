import { ApiError } from "@/shared/api";
import type { AuthMode, Credentials } from "@/shared/auth";
import type { MockStore } from "./MockStore";

export class AuthService {
	constructor(private readonly store: MockStore) {}

	async authenticate(mode: AuthMode, { login, password }: Credentials) {
		if (login.length < 3 || password.length < 8) {
			throw new ApiError("Логин от 3 символов, пароль от 8 символов", 400);
		}
		const normalized = login.toLowerCase();
		const digest = Array.from(
			new Uint8Array(
				await crypto.subtle.digest(
					"SHA-256",
					new TextEncoder().encode(password),
				),
			),
		)
			.map((x) => x.toString(16).padStart(2, "0"))
			.join("");
		const user = this.store.users().find((u) => u.login === normalized);

		if (mode === "register") {
			if (user) {
				throw new ApiError("Этот логин уже занят", 409);
			}
			this.store.addUser({ login: normalized, digest });
		} else if (login !== "demo" && user?.digest !== digest) {
			throw new ApiError("Неверный логин или пароль", 401);
		}

		return { login };
	}
}
