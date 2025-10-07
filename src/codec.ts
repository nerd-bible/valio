import { Validatable, type Context, type Errors } from "./validatable";

export interface Decoder<I, O, U> {
	/** Context accumulates errors. */
	_decode(input: I, ctx: Context<U>): O;
}

export interface Encoder<I, O, U> {
	/** Context accumulates errors. */
	_encode(output: O, ctx: Context<U>): I;
}

export type Codec<I, O, U> = Decoder<I, O, U> & Encoder<I, O, U>;

// export abstract class Codec<I, O, U> extends Validatable<O, U> {
// 	constructor(
// 		public decoder: Decoder<I, O, U>,
// 		public encoder: Encoder<I, O, U>,
// 	) {
// 		super();
// 	}
//
// 	encode(output: O, ctx: Context<U>): { input: I; errors?: Errors } {
// 		this.validate(output, ctx);
// 		const input = this.encoder.encode(output, ctx);
// 		return {
// 			input,
// 			errors: ctx.errors,
// 		};
// 	}
//
// 	decode(input: I, ctx: Context<U>): { output: O; errors?: Errors } {
// 		const output = this.decoder.decode(input, ctx);
// 		this.validate(output, ctx);
// 		return {
// 			output,
// 			errors: ctx.errors,
// 		};
// 	}
// }
