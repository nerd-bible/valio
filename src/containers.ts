import { Context, Pipe, Task } from "./pipe";
import type { Output, Result } from "./pipe";

export class Array<T> extends Pipe<any[], T[]> {
	constructor(public element: Pipe<any, T>) {
		super(
			new Task(
				"array",
				(v): v is any[] => globalThis.Array.isArray(v),
				function transform(input: any[], ctx: Context): Result<T[]> {
					const output = new globalThis.Array<T>(input.length);
					let success = true;

					const arrIndex = ctx.jsonPath.length;
					ctx.jsonPath[arrIndex] = "";
					for (let i = 0; i < input.length; i++) {
						ctx.jsonPath[arrIndex] = i.toString();
						const decoded = element.decode(input[i], ctx);
						if (decoded.success) output[i] = decoded.output;
						else success = false;
					}
					ctx.jsonPath.pop();

					if (!success) return { success, errors: ctx.errors };
					return { success, output };
				},
			),
			new Task(`array<${element.o.name}>`, (v): v is any[] =>
				globalThis.Array.isArray(v),
			),
		);
	}
}
export function array<T>(element: Pipe<any, T>) {
	return new Array(element);
}

export type ObjectOutput<T extends globalThis.Record<string, Pipe<any, any>>> =
	{
		[K in keyof T]: Output<T[K]>;
	};
export class Object<
	T extends globalThis.Record<string, Pipe<any, any>>,
> extends Pipe<object, ObjectOutput<T>> {
	constructor(public shape: T) {
		super(
			new Task(
				"object",
				(v): v is object =>
					Object.prototype.toString.call(v) == "[object Object]",
				function transform(
					data: object,
					ctx: Context,
				): Result<ObjectOutput<T>> {
					const output: Partial<ObjectOutput<T>> = {};
					let success = true;

					const last = ctx.jsonPath.length;
					ctx.jsonPath[last] = "";

					for (const s in shape) {
						ctx.jsonPath[last] = s;
						const decoded = shape[s]!.decode((data as any)[s], ctx);
						if (decoded.success) output[s] = decoded.output;
						else success = false;
					}

					ctx.jsonPath.pop();

					if (!success) return { success, errors: ctx.errors };

					return { success, output: output as ObjectOutput<T> };
				},
			),
			new Task("object<T>", (v): v is ObjectOutput<T> => {
				if (Object.prototype.toString.call(v) != "[object Object]")
					return false;
				for (const s in shape) if (!shape[s]!.o.typeCheck(v[s])) return false;
				return true;
			}),
		);
	}
}
export function object<T extends globalThis.Record<string, Pipe<any, any>>>(
	shape: T,
) {
	return new Object(shape);
}

export class Record<K extends string | number, V> extends Pipe<
	object,
	globalThis.Record<K, V>
> {
	constructor(
		public keyPipe: Pipe<unknown, K>,
		public valPipe: Pipe<unknown, V>,
	) {
		super(
			new Task(
				"object",
				(v): v is object =>
					Object.prototype.toString.call(v) == "[object Object]",
				function transform(
					input: object,
					ctx: Context,
				): Result<globalThis.Record<K, V>> {
					const output = {} as globalThis.Record<K, V>;

					let success = true;
					const arrIndex = ctx.jsonPath.length;
					for (const key in input) {
						ctx.jsonPath[arrIndex] = key;
						const decodedKey = keyPipe.decode(key, ctx);
						if (decodedKey.success) {
							const decodedVal = valPipe.decode((input as any)[key], ctx);
							if (decodedVal.success) {
								output[decodedKey.output] = decodedVal.output;
							} else {
								success = false;
							}
						} else {
							success = false;
						}
					}

					if (!success) return { success, errors: ctx.errors };
					return { success, output };
				},
			),
			new Task(
				`record<${keyPipe.o.name},${valPipe.o.name}>`,
				(v): v is globalThis.Record<K, V> => {
					if (Object.prototype.toString.call(v) != "[object Object]")
						return false;
					for (const k in v) {
						if (!keyPipe.o.typeCheck(k)) return false;
						if (!valPipe.o.typeCheck(v[k])) return false;
					}
					return true;
				},
			),
		);
	}
}
export function record<K extends string | number, V>(
	keyPipe: Pipe<any, K>,
	valPipe: Pipe<any, V>,
) {
	return new Record(keyPipe, valPipe);
}

export class Union<T extends Readonly<Pipe[]>> extends Pipe<
	Output<T[number]>,
	Output<T[number]>
> {
	constructor(public options: T) {
		type O = Output<T[number]>;
		const name = options.map((o) => o.o.name).join("|");
		function typeCheck(data: any): data is O {
			for (const f of options) if (f.o.typeCheck(data)) return true;
			return false;
		}

		super(
			new Task(
				name,
				typeCheck,
				function transform(data: O, ctx: Context): Result<O> {
					const newCtx = ctx.clone();
					for (const s of options) {
						const decoded = s.decode(data, newCtx);
						if (decoded.success) return decoded;
					}

					globalThis.Object.assign(ctx.errors, newCtx.errors);
					return { success: false, errors: ctx.errors };
				},
			),
			new Task(name, typeCheck),
		);
	}
}
export function union<T extends Readonly<Pipe[]>>(options: T) {
	return new Union(options);
}
