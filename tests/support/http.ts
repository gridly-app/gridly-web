import type {
	RequestOptions,
	SessionHttpClient,
	StreamHttpClient,
} from "@/shared/http";

type HttpDoubleMethods = Pick<StreamHttpClient, "request"> &
	Partial<Pick<StreamHttpClient, "openStream">> &
	Partial<Pick<SessionHttpClient, "clearSession">>;

export function httpDouble(
	double: HttpDoubleMethods,
): StreamHttpClient & SessionHttpClient {
	return {
		request: (path: string, options?: RequestOptions) =>
			double.request(path, options),
		openStream: async (path: string, options?: RequestOptions) => {
			if (!double.openStream)
				throw new Error("openStream не используется в этом тесте");

			return double.openStream(path, options);
		},
		clearSession: () => double.clearSession?.(),
	};
}
