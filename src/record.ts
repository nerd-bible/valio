import { Pipe, type Context, type Result } from "./pipe";

class RecordValidator<K extends string | number, V> extends Pipe<
	number,
	Record<K, V>
> {
	type = "record" as const;

	constructor(
		public keyPipe: Pipe<unknown, K>,
		public valPipe: Pipe<unknown, V>,
	) {
		super();
	}

	isT(data: unknown): data is Record<K, V> {
		return typeof data == "object";
	}

	decode(data: unknown, ctx: Context = {}): Result<Record<K, V>> {
		const isT = this.isT(data);
		if (!isT) {
			this.addError(`not a ${this.type}`, ctx);
			return { errors: ctx.errors! };
		}

		const output = {} as Record<K, V>;

		ctx.jsonPath ??= [];
		const arrIndex = ctx.jsonPath.length;
		for (const key in data) {
			ctx.jsonPath[arrIndex] = key;
			const decodedKey = this.keyPipe.decode(key, ctx);
			if (!("output" in decodedKey)) return { errors: ctx.errors! };

			const decodedVal = this.valPipe.decode(data[key], ctx);
			if (!("output" in decodedVal)) return { errors: ctx.errors! };

			output[decodedKey.output] = decodedVal.output;
		}

		return {
			output,
			errors: ctx.errors,
		};
	}
}

export function record<K extends string | number, V>(
	keyPipe: Pipe<unknown, K>,
	valPipe: Pipe<unknown, V>,
) {
	return new RecordValidator<K, V>(keyPipe, valPipe);
}
