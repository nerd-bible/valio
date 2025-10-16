import { Context, pipe, type Output, type Pipe, type Result } from "./pipe";

export interface Array {}
export function array<T>(element: Pipe<any, T>): Array & Pipe<any[], T[]> {
	return pipe(
		{
			name: "array",
			typeCheck: (v): v is any[] => Array.isArray(v),
			transform(input: any[], ctx: Context): Result<T[]> {
				const output = new Array<T>(input.length);
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
		},
		{
			name: `array<${element.o.name}>`,
			typeCheck: (v): v is any[] => Array.isArray(v),
		},
	);
}

export type ObjectOutput<T extends globalThis.Record<string, Pipe<any, any>>> =
	{
		// @ts-ignore
		[K in keyof T]: Output<T[K]>;
	};
export interface Object<T extends globalThis.Record<string, Pipe<any, any>>> {
	shape: T;
}
export function object<T extends globalThis.Record<string, Pipe<any, any>>>(
	shape: T,
): Object<T> & Pipe<object, ObjectOutput<T>> {
	const res = pipe<object, ObjectOutput<T>>(
		{
			name: "object",
			typeCheck: (v): v is object =>
				Object.prototype.toString.call(v) == "[object Object]",
			transform(data: object, ctx: Context): Result<ObjectOutput<T>> {
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
		},
		{
			name: "object<T>",
			typeCheck: (v): v is ObjectOutput<T> => {
				if (Object.prototype.toString.call(v) != "[object Object]")
					return false;
				for (const s in shape) if (!shape[s]!.o.typeCheck(v[s])) return false;
				return true;
			},
		},
	) as ReturnType<typeof object<T>>;
	res.shape = shape;
	return res;
}

export interface Record<K extends string | number, V> {
	keyPipe: Pipe<unknown, K>,
	valPipe: Pipe<unknown, V>,
}
export function record<K extends string | number, V>(
	keyPipe: Pipe<unknown, K>,
	valPipe: Pipe<unknown, V>,
): Record<K, V> & Pipe<object, globalThis.Record<K, V>> {
	const res = pipe<object, globalThis.Record<K, V>>(
		{
			name: "object",
			typeCheck: (v): v is object =>
				Object.prototype.toString.call(v) == "[object Object]",
			transform(input: object, ctx: Context): Result<globalThis.Record<K, V>> {
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
		},
		{
			name: `record<${keyPipe.o.name},${valPipe.o.name}>`,
			typeCheck: (v): v is globalThis.Record<K, V> => {
				if (Object.prototype.toString.call(v) != "[object Object]")
					return false;
				for (const k in v) {
					if (!keyPipe.o.typeCheck(k)) return false;
					if (!valPipe.o.typeCheck(v[k])) return false;
				}
				return true;
			},
		},
	) as ReturnType<typeof record<K, V>>;
	res.keyPipe = keyPipe;
	res.valPipe = valPipe;
	return res;
}

export interface Union<T extends Readonly<Pipe[]>> {
	options: T
}
export function union<T extends Readonly<Pipe[]>>(
	options: T,
): Union<T> & Pipe<Output<T[number]>, Output<T[number]>> {
	type O = Output<T[number]>;
	const name = options.map((o) => o.o.name).join("|");
	function typeCheck(data: any): data is O {
		for (const f of options) if (f.o.typeCheck?.(data)) return true;
		return false;
	}

	const res = pipe<O, O>(
		{
			name,
			typeCheck,
			transform(data: O, ctx: Context): Result<O> {
				const newCtx = ctx.clone();
				for (const s in options) {
					const decoded = options[s]!.decode(data, newCtx);
					if (decoded.success) return decoded;
				}

				Object.assign(ctx.errors, newCtx.errors);
				return { success: false, errors: ctx.errors };
			},
		},
		{ name, typeCheck },
	) as ReturnType<typeof union<T>>;
	res.options = options;
	return res;
}
