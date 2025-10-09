import { Context, pipe, type Result } from "./pipe";

// This sucks.
function coerceToNumber(input: any, ctx: Context): Result<number> {
	if (
		input == null ||
		(typeof input == "string" && input.toLowerCase() == "nan")
	)
		return { success: true, output: NaN };

	const str = String(input);
	const output = parseFloat(str);
	if (!isNaN(output)) return { success: true, output };

	ctx.addError({
		input,
		message: `could not parseFloat`,
	});
	return { success: false, errors: ctx.errors! };
}

export function number() {
	return {
		...pipe<any, number>("number"),
		isOutput: (data: unknown) => typeof data == "number",
		coerce(fn = coerceToNumber) {
			this.coerceFn = fn;
			return this as any;
		},

		min(n: number) {
			return this.refine((v) => (v > n ? "" : `must be > ${n}`));
		},
		max(n: number) {
			return this.refine((v) => (v < n ? "" : `must be < ${n}`));
		},
	};
}
