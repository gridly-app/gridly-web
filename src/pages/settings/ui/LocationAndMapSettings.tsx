import { useRef, useState } from "react";
import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import {
	Button,
	ErrorNotice,
	Field,
	Form,
	FormActions,
	FormGrid,
	Input,
	Select,
	WarmTooltip,
} from "@/shared/ui";
import cities from "../config/cities.json";
import styles from "./SettingsPage.module.css";

function currentCity(w: Warehouse) {
	const raw = (w.cabinet?.location || w.location || "").trim();
	return cities.some((option) => option.value === raw)
		? raw
		: raw.split(",")[0]?.trim() || "";
}
export function LocationAndMapSettings({
	w,
	execute,
	pending,
}: {
	w: Warehouse;
	execute: CommandExecutor;
	pending: boolean;
}) {
	const [city, setCity] = useState(() => currentCity(w));
	const [width, setWidth] = useState(String(w.width));
	const [height, setHeight] = useState(String(w.height));
	const [saving, setSaving] = useState<"city" | "map" | null>(null);
	const [errors, setErrors] = useState({ city: "", map: "" });
	const [messages, setMessages] = useState({ city: "", map: "" });
	const inFlight = useRef(false);
	const canEdit = !!w.allowedActions?.includes("edit-settings");
	const canResize = !!w.allowedActions?.includes("resize");
	const busy = pending || saving !== null;
	const options =
		city && !cities.some((option) => option.value === city)
			? [{ value: city, label: city }, ...cities]
			: cities;
	async function save(section: "city" | "map") {
		if (inFlight.current || busy) return;
		inFlight.current = true;
		setSaving(section);
		setErrors((current) => ({ ...current, [section]: "" }));
		setMessages((current) => ({ ...current, [section]: "" }));
		try {
			if (section === "city")
				await execute("cabinet", {
					...(w.cabinet ?? {
						placement: "fefo",
						allowMixedCategories: false,
						reserveOnStart: true,
						lowStockThreshold: 10,
					}),
					location: city,
				});
			else
				await execute("resize", {
					width: Number(width),
					height: Number(height),
				});
			setMessages((current) => ({ ...current, [section]: "Сохранено" }));
		} catch (error) {
			setErrors((current) => ({ ...current, [section]: errorMessage(error) }));
		} finally {
			setSaving(null);
			inFlight.current = false;
		}
	}
	return (
		<section className={styles.card} aria-label="Расположение и размеры карты">
			<Form
				onSubmit={(event) => {
					event.preventDefault();
					void save("city");
				}}
			>
				<h3>Расположение</h3>
				<Field label="Город">
					<Select
						aria-label="Город склада"
						value={city}
						onValueChange={setCity}
						options={options}
						searchable
						searchLabel="Поиск города"
						disabled={busy || !canEdit}
					/>
				</Field>
				<WarmTooltip
					content={
						<>
							Справочник HFLabs / DaData, CC BY-SA 4.0. Поиск по городам России.
						</>
					}
					focusable
				>
					<small className={styles.citySource}>Справочник городов России</small>
				</WarmTooltip>
				<ErrorNotice message={errors.city} />
				<p role="status">{messages.city}</p>
				<FormActions>
					<Button
						type="submit"
						loading={saving === "city"}
						disabled={!canEdit || busy || !city || city === currentCity(w)}
						tooltip={!canEdit ? "Изменение расположения недоступно" : undefined}
					>
						Сохранить город
					</Button>
				</FormActions>
			</Form>
			<Form
				className={styles.mapSizeForm}
				onSubmit={(event) => {
					event.preventDefault();
					void save("map");
				}}
			>
				<h3>Размеры карты</h3>
				<FormGrid>
					<Field label="Ширина, клеток">
						<Input
							type="number"
							min={5}
							max={100}
							step={1}
							required
							value={width}
							onChange={(event) => setWidth(event.target.value)}
							disabled={busy || !canResize}
						/>
					</Field>
					<Field label="Высота, клеток">
						<Input
							type="number"
							min={5}
							max={100}
							step={1}
							required
							value={height}
							onChange={(event) => setHeight(event.target.value)}
							disabled={busy || !canResize}
						/>
					</Field>
				</FormGrid>
				<ErrorNotice message={errors.map} />
				<p role="status">{messages.map}</p>
				<FormActions>
					<Button
						type="submit"
						loading={saving === "map"}
						disabled={
							!canResize ||
							busy ||
							(Number(width) === w.width && Number(height) === w.height)
						}
						tooltip={
							!canResize ? "Изменение размеров карты недоступно" : undefined
						}
					>
						Сохранить размеры
					</Button>
				</FormActions>
			</Form>
		</section>
	);
}
