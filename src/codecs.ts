import { Context, type Pipe } from "./pipe";
import * as p from "./primitives";

/**
 * null || undefined || "nan" -> NaN
 * string -> parser(string)
 */
export function number(parser = parseFloat) {
	const number = p.number() as Pipe<string, number>;

	// TODO: union type that handles numbers, null, and undefined
	// if (input == null) return { success: true, output: NaN };
	return p.string().pipe({
		...number,
		decode(input: string, ctx = new Context()) {
			if (input.toLowerCase() == "nan") return { success: true, output: NaN };
			const output = parser(input);
			if (!isNaN(output)) return { success: true, output };

			ctx.addError({ input, message: "could not parse number" });
			return { success: false, errors: ctx.errors };
		},
	});
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
