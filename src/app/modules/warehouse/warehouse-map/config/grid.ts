export const gridInset = 32;
export const canvasPadding = 48;
export const maxPixelRatio = 2;

export function cellOrigin(coordinate: number, size: number) {
	return gridInset + coordinate * size;
}

export function cellCenter(coordinate: number, size: number) {
	return gridInset + (coordinate + 0.5) * size;
}

export function canvasLength(cellCount: number, size: number) {
	return cellCount * size + canvasPadding;
}
