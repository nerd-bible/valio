import { Context, type Pipe, type Result, type Param, type Output } from "./pipe";
import * as p from "./primitives";
import * as c from "./containers";

export function custom<A, B, C, O extends Pipe<B, C>>(
	input: Param<A, B>,
	output: O,
	codec: {
		encode?(input: C, ctx: Context): Result<B>;
		decode?(output: A, ctx: Context): Result<B>;
	},
): O & Pipe<A, C> {
	const res = output.clone() as any;

	res.i = { ...input };
	res.i.transform = codec.decode;
	res.o.transform = codec.encode;

	return res;
}

export function number(parser = parseFloat) {
	const input = c.union([p.string(), p.number(), p.null(), p.undefined()]);
	type Input = Output<typeof input>;
	return {
		...p.number() as ReturnType<typeof p.number> & Pipe<Input, number>,
		i: {
			...input.i,
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
	};
}

export function boolean(opts: {
	true?: string[];
	false?: string[];
}) {
	return custom(p.any().i, p.boolean(), {
		decode(input) {
			if (typeof input === "string") {
				if (opts.true?.includes(input)) return { success: true, output: true };
				if (opts.false?.includes(input))
					return { success: true, output: false };
			}
			return { success: true, output: Boolean(input) };
		},
	});
}
