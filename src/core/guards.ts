/** Exhaustiveness helper: unreachable if all union members are handled. */
export function assertNever(value: never): never {
	throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}

export function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}
