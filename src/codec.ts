import { Pipe, type Context, type Result } from "./pipe";

export function codec<I, O, P extends Pipe<any, any>>(
	fromValidator: P,
	decoder: (input: I, ctx: Context) => Result<O>,
	encoder: (output: O, ctx: Context) => Result<I>,
) {
	const oldDecode = fromValidator.decode;

	return Object.assign(fromValidator, {
		encode: encoder,
		decode(data: I, ctx: Context = {}) {
			const toDecode = oldDecode.bind(this)(data, ctx);
			if ("output" in toDecode)
				return decoder(toDecode.output, ctx);

			return toDecode;
		},
	});
}
