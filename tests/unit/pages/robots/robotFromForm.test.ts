import { expect, test } from "bun:test";
import { robotFromForm } from "@/pages/robots/model/robotFromForm";

function form() {
	const data = new FormData();
	for (const [name, value] of Object.entries({
		name: "New",
		roles: "ship",
		speed: "5",
		duration: "20",
		capacity: "2.500",
		position: "1,1",
	}))
		data.append(name, value);
	return data;
}
test("robot form requires a current spawn cell and bounded integer parameters", () => {
	const cells: Parameters<typeof robotFromForm>[2] = [
		{ x: 1, y: 1, type: "aisle" },
	];
	const data = form();
	expect(robotFromForm(data, undefined, cells)).toMatchObject({
		x: 1,
		y: 1,
		speed: 5,
		duration: 20,
		roles: ["ship"],
	});
	expect(() => robotFromForm(data, undefined, [])).toThrow("стартовую");
	for (const [field, value] of [
		["speed", "6"],
		["speed", "1.5"],
		["duration", "21"],
		["roles", "loader"],
	]) {
		const invalid = form();
		invalid.set(field ?? "", value ?? "");
		expect(() => robotFromForm(invalid, undefined, cells)).toThrow();
	}
	const robot: NonNullable<Parameters<typeof robotFromForm>[1]> = {
		id: "r",
		name: "Robot",
		revision: 1,
		roles: ["unload"],
		x: 0,
		y: 0,
		speed: 1,
		duration: 1,
		capacity: "10",
		status: "idle",
	};
	const update = robotFromForm(data, robot, []);
	expect(update).toMatchObject({ id: "r", revision: 1 });
	expect(update).not.toHaveProperty("x");
});
