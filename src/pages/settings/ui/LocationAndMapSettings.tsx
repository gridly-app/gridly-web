import { IconRefresh } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import {
	Button,
	ErrorNotice,
	Feedback,
	Field,
	Form,
	FormActions,
	FormGrid,
	IconButton,
	Input,
	Select,
} from "@/shared/ui";
import cities from "../config/cities.json";
import styles from "./SettingsPage.module.css";

const defaultMapSize = "10";

function currentCity(w: Warehouse) {
	const raw = (w.settings?.location || "").trim();
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
	const [cityDraft, setCityDraft] = useState<{
		value: string;
		revision: number;
	} | null>(null);
	const city = cityDraft?.value ?? currentCity(w);
	const setCity = (value: string) => {
		if (w.settings)
			setCityDraft({
				value,
				revision: cityDraft?.revision ?? w.settings.revision,
			});
	};
	const [width, setWidth] = useState(String(w.width));
	const [height, setHeight] = useState(String(w.height));
	const [saving, setSaving] = useState<"city" | "map" | null>(null);
	const [errors, setErrors] = useState({ city: "", map: "" });
	const [messages, setMessages] = useState({ city: "", map: "" });
	const inFlight = useRef(false);
	const canEdit = !!w.settings && !!w.allowedActions?.includes("edit-settings");
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
			if (section === "city") {
				if (!w.settings) throw new Error("Настройки склада не загружены");
				await execute("warehouseSettings", {
					revision: cityDraft?.revision ?? w.settings.revision,
					location: city,
				});
				setCityDraft(null);
			} else
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
		<div className={styles.locationAndMap}>
			<Form
				onSubmit={(event) => {
					event.preventDefault();
					void save("city");
				}}
			>
				<h4>Расположение</h4>
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
				<ErrorNotice message={errors.city} />
				{messages.city && <Feedback tone="success">{messages.city}</Feedback>}
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
				onSubmit={(event) => {
					event.preventDefault();
					void save("map");
				}}
			>
				<h4>Размеры карты</h4>
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
							disabled={busy}
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
							disabled={busy}
						/>
					</Field>
				</FormGrid>
				<ErrorNotice message={errors.map} />
				{messages.map && <Feedback tone="success">{messages.map}</Feedback>}
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
					<IconButton
						type="button"
						label="Сбросить размеры карты до 10 × 10"
						tooltip="Сбросить размеры до 10 × 10"
						icon={<IconRefresh size={16} />}
						disabled={busy}
						onClick={() => {
							setWidth(defaultMapSize);
							setHeight(defaultMapSize);
							setErrors((current) => ({ ...current, map: "" }));
							setMessages((current) => ({ ...current, map: "" }));
						}}
					/>
				</FormActions>
			</Form>
		</div>
	);
}
