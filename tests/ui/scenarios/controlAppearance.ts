import { expect, type Locator } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

async function expectFilledControl(control: Locator) {
	await expect(control).toBeVisible();
	await expect(control).toHaveCSS("border-top-width", "0px");

	const appearance = await control.evaluate((element) => {
		const style = getComputedStyle(element);

		return {
			background: style.backgroundColor,
			padding: parseFloat(style.paddingInlineStart),
		};
	});

	expect(appearance.background).not.toBe("rgba(0, 0, 0, 0)");
	expect(appearance.padding).toBeGreaterThan(0);
}

async function expectReadableSegment(segment: Locator) {
	const contrast = await segment.evaluate((element) => {
		const group = element.closest('[role="radiogroup"]');
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");

		if (!group || !context) throw new Error("Missing segment colors");

		const background = getComputedStyle(group).backgroundColor;
		const foreground = getComputedStyle(element).color;

		function luminance(context: CanvasRenderingContext2D, color: string) {
			context.clearRect(0, 0, 1, 1);
			context.fillStyle = background;
			context.fillRect(0, 0, 1, 1);
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);

			const [red = 0, green = 0, blue = 0] = context.getImageData(
				0,
				0,
				1,
				1,
			).data;
			const linear = (channel: number) => {
				const srgb = channel / 255;

				return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
			};

			return (
				0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
			);
		}

		const levels = [
			luminance(context, foreground),
			luminance(context, background),
		];

		return (Math.max(...levels) + 0.05) / (Math.min(...levels) + 0.05);
	});

	expect(contrast).toBeGreaterThanOrEqual(4.5);
}

async function expectIndicatorAligned(track: Locator, thumb: Locator) {
	const selected = track.locator('[role="radio"][data-checked]');

	await expect
		.poll(async () => {
			const selectedBounds = await selected.boundingBox();
			const thumbBounds = await thumb.boundingBox();

			if (!selectedBounds || !thumbBounds) return false;

			return (
				Math.abs(selectedBounds.x - thumbBounds.x) < 1 &&
				Math.abs(selectedBounds.width - thumbBounds.width) < 1
			);
		})
		.toBe(true);
}

export async function controlAppearanceScenario({
	page,
	base,
	signIn,
	ready,
}: UiScenario) {
	await page.goto(base);
	const signInLink = page.getByRole("link", { name: "Войти", exact: true });
	const sandbox = page.getByRole("button", { name: "Открыть песочницу" });
	await expectFilledControl(signInLink);
	await expectFilledControl(sandbox);
	const primaryBackground = await signInLink.evaluate(
		(element) => getComputedStyle(element).backgroundColor,
	);
	await expect(sandbox).toHaveCSS("background-color", primaryBackground);

	await signIn();

	for (const dark of [false, true]) {
		await page.evaluate(
			(isDark) =>
				localStorage.setItem("gridly.theme", isDark ? "dark" : "light"),
			dark,
		);
		await ready("map");
		await expectFilledControl(
			page.getByRole("combobox", {
				name: "Рабочее пространство — выбор склада",
			}),
		);
		await expectFilledControl(
			page.getByRole("button", { name: "Режим просмотра", exact: true }),
		);
		await ready("inventory");
		const selected = page.getByRole("radio", {
			name: "На складе",
			exact: true,
		});
		await expect(selected).toBeVisible();
		await expectReadableSegment(
			page.getByRole("radio", { name: "Ожидается", exact: true }),
		);
		const thumb = page.locator('[data-slot="rubber-segment-thumb"]');
		await expect(thumb).toBeVisible();
		const track = page.getByRole("radiogroup").filter({ has: selected });
		const bounds = await track.boundingBox();
		const thumbBounds = await thumb.boundingBox();

		expect(bounds).not.toBeNull();
		expect(thumbBounds).not.toBeNull();
		if (!bounds || !thumbBounds) throw new Error("Missing segment bounds");

		expect(thumbBounds.y).toBeGreaterThan(bounds.y);
		expect(thumbBounds.y + thumbBounds.height).toBeLessThan(
			bounds.y + bounds.height,
		);
		await expectIndicatorAligned(track, thumb);
		await selected.focus();
		await selected.press("ArrowRight");
		await expect(
			page.getByRole("radio", { name: "Ожидается", exact: true }),
		).toBeChecked();
		await expectIndicatorAligned(track, thumb);
		await page.setViewportSize({ width: 700, height: 900 });
		await expectIndicatorAligned(track, thumb);
		await page.setViewportSize({ width: 1440, height: 1000 });
		await expectIndicatorAligned(track, thumb);
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await selected.click();
		await expect(selected).toBeChecked();
		await expectIndicatorAligned(track, thumb);
		await page.emulateMedia({ reducedMotion: "reduce" });
	}
}
