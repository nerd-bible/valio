import { Context, pipe, type Output, type Pipe, type Result } from "./pipe";
import * as p from "./primitives";

export interface Array {}
export function array<T>(element: Pipe<any, T>): Array & Pipe<any[], T[]> {
	return pipe<any[], T[]>(
		{
			name: "array",
			typeCheck: (v: any): v is any[] => Array.isArray(v),
			transform(input: any[], ctx: Context): Result<T[]> {
				const output = new Array<T>(input.length);
				let success = true;

				const length = ctx.jsonPath.length;
				for (let i = 0; i < input.length; i++) {
					ctx.jsonPath[length] = i.toString();
					const decoded = element.decode(input[i], ctx);
					if (decoded.success) output[i] = decoded.output;
					else success = false;
				}
				ctx.jsonPath.length = length;

				if (!success) return { success, errors: ctx.errors };
				return { success, output };
			},
		},
		{
			name: `array<${element.o.name}>`,
			typeCheck: (v: any): v is T[] => {
				if (!Array.isArray(v)) return false;
				for (const e of v) if (!element.o.typeCheck(e)) return false;
				return true;
			},
		},
	);
}

export interface Record<K extends keyof any, V> {
	keyPipe: Pipe<any, K>;
	valPipe: Pipe<any, V>;
}
export function record<K extends keyof any, V>(
	keyPipe: Pipe<any, K>,
	valPipe: Pipe<any, V>,
): Record<K, V> & Pipe<globalThis.Record<any, any>, globalThis.Record<K, V>> {
	const res = pipe<globalThis.Record<any, any>, globalThis.Record<K, V>>(
		{
			name: "object",
			typeCheck: (v): v is Record<any, any> =>
				Object.prototype.toString.call(v) == "[object Object]",
			transform(input: object, ctx: Context): Result<globalThis.Record<K, V>> {
				const output = {} as globalThis.Record<K, V>;

				let success = true;
				const length = ctx.jsonPath.length;
				for (const key in input) {
					ctx.jsonPath[length] = key;
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
				ctx.jsonPath.length = length;

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
					// Keys will always be strings.
					// if (!keyPipe.o.typeCheck(k)) return false;
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
	options: T;
}
export function union<T extends Readonly<Pipe[]>>(
	options: T,
): Union<T> & Pipe<Output<T[number]>, Output<T[number]>> {
	type O = Output<T[number]>;
	const name = options.map((o) => o.o.name).join("|");
	const res = pipe<O, O>(
		{
			name,
			typeCheck(v: any): v is O {
				for (const f of options) if (f.i.typeCheck(v)) return true;
				return false;
			},
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
		{
			name,
			typeCheck(v: any): v is O {
				for (const f of options) if (f.o.typeCheck(v)) return true;
				return false;
			},
		},
	) as ReturnType<typeof union<T>>;
	res.options = options;
	return res;
}

type ObjectOutput<T extends globalThis.Record<string, Pipe<any, any>>> = {
	[K in keyof T]: Output<T[K]>;
};
export interface Object<
	Shape extends globalThis.Record<any, Pipe<any, any>>,
	RK extends keyof any = never,
	RV = never,
> {
	shape: Shape;
	record?: Record<RK, RV>;
	partial(): Object<Shape> & Pipe<object, Partial<ObjectOutput<Shape>>>;
	extend<K extends keyof any, V>(
		k: Pipe<any, K>,
		v: Pipe<any, V>,
	): Object<Shape, K, V> & Pipe<object, ObjectOutput<Shape> & { [k in K]: V }>;
}
export function object<
	T extends globalThis.Record<any, Pipe<any, any>>,
	RK extends keyof any = never,
	RV = never,
>(
	shape: T,
	record_?: Record<RK, RV>,
): Object<T> & Pipe<object, ObjectOutput<T>> {
	const res = pipe<object, ObjectOutput<T>>(
		{
			name: "object",
			typeCheck: (v): v is object =>
				Object.prototype.toString.call(v) == "[object Object]",
			transform(data: object, ctx: Context): Result<ObjectOutput<T>> {
				const output: globalThis.Record<keyof any, any> = {};
				let success = true;

				const length = ctx.jsonPath.length;
				for (const k in data) {
					ctx.jsonPath[length] = k;
					const v = (data as any)[k];
					if (k in shape) {
						const decoded = shape[k]!.decode(v, ctx);
						if (decoded.success) output[k] = decoded.output;
						else success = false;
					} else if (record_) {
						const decodedKey = record_.keyPipe.decode(k, ctx);
						if (decodedKey.success) {
							const decodedVal = record_.valPipe.decode(v, ctx);
							if (decodedVal.success) {
								output[decodedKey.output] = decodedVal.output;
							} else {
								success = false;
							}
						} else {
							success = false;
						}
					}
				}
				ctx.jsonPath.length = length;

				if (!success) return { success, errors: ctx.errors };
			console.log("huh", output);
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
	res.partial = () => {
		const next = res.clone();
		for (const k in next.shape) {
			// @ts-ignore
			next.shape[k] = union([next.shape[k], p.undefined()]);
		}
		return next as any;
	};
	res.extend = <K extends keyof any, V>(
		k: Pipe<any, K>,
		v: Pipe<any, V>,
	): Object<T, K, V> & Pipe<object, ObjectOutput<T> & { [k in K]: V }> => {
		return object<T, K, V>(shape, record(k, v)) as any;
	};
	return res;
}
