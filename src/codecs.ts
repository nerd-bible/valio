import { Context, type Pipe } from "./pipe";
import * as p from "./primitives";

/**
 * null || undefined || "nan" -> NaN
 * string -> parser(string)
 */
export function number(parser = parseFloat) {
	return {
		...p.number(),
		isOutput: (data: any) =>
			typeof data == "string" || typeof data == "number" || data == null,
		decoder(input: string | number | null | undefined, ctx: Context) {
			if (typeof input == "number") return { success: true, output: input };
			if (input == null || input.toLowerCase() == "nan")
				return { success: true, output: NaN };
			const output = parser(input);
			if (!isNaN(output)) return { success: true, output };

			ctx.addError({ input, message: "could not parse number" });
			return { success: false, errors: ctx.errors };
		},
	};
}

export function string() {
	return {
		...p.string(),
		inputType: "string",
		isInput: (v: any) => typeof v == "string",
		decode(input: any) {
			return { success: true, output: String(input) };
		},
	};
}
