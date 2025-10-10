import { Context, pipe, type Pipe, type Result } from "./pipe";

export function array<T>(element: Pipe<unknown, T>) {
	return {
		...pipe<any, Array<T>>("any", "array"),
		isOutput: (data: any) => Array.isArray(data),

		parseFn(input: any, ctx: Context): Result<Array<T>> | undefined {
			if (!Array.isArray(input)) return;
			
			const output = new Array<T>(input.length);
			let success = true;

			ctx.jsonPath ??= [];
			const arrIndex = ctx.jsonPath.length;
			for (let i = 0; i < input.length; i++) {
				ctx.jsonPath[arrIndex] = i.toString();
				const decoded = element.decode(input[i], ctx);
				console.log("decode", i, decoded);
				if (decoded.success) output[i] = decoded.output;
				else success = false;
			}

			ctx.jsonPath.pop();

			if (success) return { success, output };
			return { success, errors: ctx.errors };
		},
		// codecEncode(output: Array<T>, ctx: Context): Result<any> {
		// },
	};
}

// type ShapeOutput<T extends Record<string, Pipe<any, any>>> = {
// 	// @ts-ignore
// 	[K in keyof T]: Output<T[K]>;
// };
//
// class ObjectValidator<T extends Record<string, Pipe<any, any>>> extends Pipe<
// 	unknown,
// 	ShapeOutput<T>
// > {
// 	type = "object" as const;
//
// 	constructor(public shape: T) {
// 		super();
// 	}
//
// 	isT(data: unknown): data is ShapeOutput<T> {
// 		return typeof data === "object";
// 	}
//
// 	decode(data: unknown, ctx: Context = {}): Result<ShapeOutput<T>> {
// 		const isT = this.isT(data);
// 		if (!isT) {
// 			this.addTypeError(ctx, data);
// 			return { errors: ctx.errors! };
// 		}
//
// 		const output: any = {};
// 		let failedProp = false;
//
// 		ctx.jsonPath ??= [];
// 		const last = ctx.jsonPath.length;
//
// 		for (const s in this.shape) {
// 			ctx.jsonPath[last] = s;
// 			const decoded = this.shape[s]!.decode((data as any)[s], ctx);
// 			if ("output" in decoded) output[s] = decoded.output;
// 			else failedProp = true;
// 		}
//
// 		ctx.jsonPath.pop();
//
// 		if (failedProp) return { errors: ctx.errors! };
//
// 		return {
// 			output: output as ShapeOutput<T>,
// 			errors: ctx.errors,
// 		};
// 	}
// }
//
// export function object<T extends Record<string, Pipe<any, any>>>(shape: T) {
// 	return new ObjectValidator<T>(shape);
// }
//
// class RecordValidator<K extends string | number, V> extends Pipe<
// 	number,
// 	Record<K, V>
// > {
// 	type = "record" as const;
//
// 	constructor(
// 		public keyPipe: Pipe<unknown, K>,
// 		public valPipe: Pipe<unknown, V>,
// 	) {
// 		super();
// 	}
//
// 	isT(data: unknown): data is Record<K, V> {
// 		return typeof data == "object";
// 	}
//
// 	decode(data: unknown, ctx: Context = {}): Result<Record<K, V>> {
// 		const isT = this.isT(data);
// 		if (!isT) {
// 			this.addTypeError(ctx, data);
// 			return { errors: ctx.errors! };
// 		}
//
// 		const output = {} as Record<K, V>;
//
// 		ctx.jsonPath ??= [];
// 		const arrIndex = ctx.jsonPath.length;
// 		for (const key in data) {
// 			ctx.jsonPath[arrIndex] = key;
// 			const decodedKey = this.keyPipe.decode(key, ctx);
// 			if (!("output" in decodedKey)) return { errors: ctx.errors! };
//
// 			const decodedVal = this.valPipe.decode(data[key], ctx);
// 			if (!("output" in decodedVal)) return { errors: ctx.errors! };
//
// 			output[decodedKey.output] = decodedVal.output;
// 		}
//
// 		return {
// 			output,
// 			errors: ctx.errors,
// 		};
// 	}
// }
//
// export function record<K extends string | number, V>(
// 	keyPipe: Pipe<unknown, K>,
// 	valPipe: Pipe<unknown, V>,
// ) {
// 	return new RecordValidator<K, V>(keyPipe, valPipe);
// }
//
// class UnionValidator<T extends Readonly<Array<Pipe<any, any>>>> extends Pipe<
// 	unknown,
// 	Output<T[number]>
// > {
// 	type = "union" as const;
//
// 	constructor(public options: T) {
// 		super();
// 	}
//
// 	isT(data: unknown, ctx: Context): data is Output<T[number]> {
// 		for (const f of this.options) {
// 			if (f.isOutput(data, ctx)) return true;
// 		}
// 		return false;
// 	}
//
// 	decode(data: unknown, ctx: Context = {}): Result<Output<T[number]>> {
// 		const isT = this.isT(data, ctx);
// 		if (!isT) {
// 			this.addError(ctx, {
// 				message: `not any of: ${this.options.map((o) => o.type)}`,
// 				input: data,
// 			});
// 			return { errors: ctx.errors! };
// 		}
//
// 		const newCtx: Context = {};
// 		for (const s in this.options) {
// 			const decoded = this.options[s]!.decode(data, newCtx);
// 			if ("output" in decoded) return { output: decoded.output };
// 		}
//
// 		ctx.errors = {
// 			...newCtx.errors,
// 			...(ctx.errors ?? {}),
// 		};
// 		return { errors: ctx.errors };
// 	}
// }
//
// export function union<T extends Readonly<Array<Pipe<any, any>>>>(options: T) {
// 	return new UnionValidator<T>(options);
// }
