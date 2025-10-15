import type { Context, Pipe, Result, Output } from "./pipe";
import * as p from "./primitives";
import * as c from "./containers";

export function custom<A, B, C>(
	input: Pipe<A, B>,
	output: Pipe<B, C>,
	codec: {
		encode?(input: C, ctx: Context): Result<B>;
		decode?(output: A, ctx: Context): Result<B>;
	},
): Pipe<A, C> {
	const res = output.clone() as any;
	res.i = { ...input.i, transform: codec.decode };
	res.o.transform = codec.encode;
	return res;
}

const numberInput = c.union([p.string(), p.number(), p.null(), p.undefined()]);

export class Number
	extends p.Number
	implements Pipe<Output<typeof numberInput>, number>
{
	constructor(parser = parseFloat) {
		super();
		this.i = numberInput.i;
		this.i.transform = function decode(
			input: Output<typeof numberInput>,
			ctx: Context,
		) {
			if (typeof input == "number") return { success: true, output: input };
			if (input == null || input.toLowerCase() == "nan")
				return { success: true, output: NaN };

			const output = parser(input);
			if (!isNaN(output)) return { success: true, output };

			ctx.addError({ input, message: "could not parse number" });
			return { success: false, errors: ctx.errors };
		};
	}
}

export function number(parser = parseFloat) {
	return new Number(parser);
}

type BooleanOpts = { true?: string[]; false?: string[] };

export class Boolean extends p.Boolean implements Pipe<any, boolean> {
	constructor(opts: BooleanOpts) {
		super();
		this.i = p.any().i;
		this.i.transform = function decode(input: any): Result<boolean> {
			if (typeof input === "string") {
				if (opts.true?.includes(input)) return { success: true, output: true };
				if (opts.false?.includes(input))
					return { success: true, output: false };
			}
			return { success: true, output: globalThis.Boolean(input) };
		};
	}
}

export function boolean(opts: BooleanOpts) {
	return new Boolean(opts);
}
