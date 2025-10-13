import { Context, pipe } from "./pipe";
import * as p from "./primitives";

/**
 * null || undefined || "nan" -> NaN
 * string -> parser(string)
 */
export function number(parser = parseFloat) {
	type Input = string | number | null | undefined;
	return {
		...p.number(),
		...pipe(
			{
				name: "string|number|null|undefined",
				typeCheck: (v): v is Input =>
					typeof v == "string" || typeof v == "number" || v == null,
				transform(input: Input, ctx: Context) {
					if (typeof input == "number") return { success: true, output: input };
					if (input == null || input.toLowerCase() == "nan")
						return { success: true, output: NaN };

					const output = parser(input);
					if (!isNaN(output)) return { success: true, output };

					ctx.addError({ input, message: "could not parse number" });
					return { success: false, errors: ctx.errors };
				},
			},
			{
				name: "number",
				typeCheck: (v): v is number => typeof v == "number",
			},
		),
	};
}

export function boolean(opts: {
	true?: string[];
	false?: string[];
}) {
	return pipe(
		{
			name: "any",
		},
		{
			name: "boolean",
			typeCheck: (v: any): v is string => typeof v == "string",
			transform(input: any) {
				if (opts.true?.includes(input)) return { success: true, output: true };
				if (opts.false?.includes(input))
					return { success: true, output: false };
				return { success: true, output: Boolean(input) };
			},
		},
	);
}
