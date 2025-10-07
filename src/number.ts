import type { Codec } from "./codec";
import { Validatable, type Context } from "./validatable";

class NumberValidator<U = never> extends Validatable<number, U> {
	constructor() {
		super();
	}

	isT(data: unknown, ctx: Context<U>) {
		const res = typeof data == "number";
		if (!res) this.addError("not a number", ctx);
		return res;
	}

	min(n: number) {
		return this.refine((v) => (v > n ? "" : `must be > ${n}`));
	}

	max(n: number) {
		return this.refine((v) => (v < n ? "" : `must be < ${n}`));
	}
}

export function number<T>() {
	return new NumberValidator<T>();
}

class NumberCodec<U>
	extends NumberValidator<U>
	implements Codec<string, number, U>
{
	_decode(input: unknown): number {
		return parseFloat(input as string);
	}
	_encode(output: number): string {
		return output.toString();
	}

	decode(data: unknown, ctx: Context<U> = {}) {
		const toDecode = this._decode(data);
		return super.decode(toDecode, ctx);
	}
}

export function codecNumber<T>() {
	return new NumberCodec<T>();
}
