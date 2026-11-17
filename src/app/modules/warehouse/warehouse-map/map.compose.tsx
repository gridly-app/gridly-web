import { type ComponentProps, type CSSProperties, useState } from "react";

import { MapEditor } from "./map-editor";
import { MapInspector } from "./map-inspector";
import { MapViewport } from "./map-viewport";

import styles from "./shared.module.css";

type EditorProps = ComponentProps<typeof MapEditor>;
type InspectorProps = ComponentProps<typeof MapInspector>;
type ViewportProps = ComponentProps<typeof MapViewport>;

export function MapLayout({
	editor,
	editing,
	sizeEditor,
	routeEditor,
	pending,
	canvas,
	viewing,
	inspection,
	legend,
	cellErrors,
}: Pick<
	EditorProps,
	"editor" | "editing" | "sizeEditor" | "routeEditor" | "pending"
> & {
	canvas: ViewportProps["model"];
	viewing: boolean;
	inspection: InspectorProps["model"];
	legend: InspectorProps["legend"];
	cellErrors: InspectorProps["cellErrors"];
}) {
	const editorMode = editing ? editor.mode : undefined;
	const [editorHeight, setEditorHeight] = useState<number>();
	const style: CSSProperties & { "--map-editor-height"?: string } =
		editorHeight === undefined
			? {}
			: { "--map-editor-height": `${editorHeight}px` };

	return (
		<>
			<MapEditor
				className={styles.editorOverlay}
				editor={editor}
				editing={editing}
				sizeEditor={sizeEditor}
				routeEditor={routeEditor}
				palette={legend.palette}
				pending={pending}
				onHeightChange={setEditorHeight}
			/>
			<div className={styles.mapLayout} style={style}>
				<MapViewport model={canvas} viewing={viewing} editorMode={editorMode} />
				<MapInspector
					className={styles.mapDetails}
					model={inspection}
					legend={legend}
					cellErrors={cellErrors}
				/>
			</div>
		</>
	);
}
