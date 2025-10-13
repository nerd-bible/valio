import { Context, pipe, type Output, type Pipe, type Result } from "./pipe";

export function array<T>(element: Pipe<any, T>) {
	return pipe(
		{
			name: "array",
			typeCheck: (v): v is Array<any> => Array.isArray(v),
			transform(input: Array<any>, ctx: Context): Result<Array<T>> {
				const output = new Array<T>(input.length);
				let success = true;

				const arrIndex = ctx.jsonPath.length;
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
			name: `array<${element.outputName}>`,
			typeCheck: (v): v is Array<any> => Array.isArray(v),
		},
	);
}

export type ShapeOutput<T extends Record<string, Pipe<any, any>>> = {
	// @ts-ignore
	[K in keyof T]: Output<T[K]>;
};

export function object<T extends Record<string, Pipe<any, any>>>(shape: T) {
	return pipe(
		{
			name: "object",
			typeCheck: (v): v is object =>
				Object.prototype.toString.call(v) == "[object Object]",
			transform(data: object, ctx: Context): Result<ShapeOutput<T>> {
				const output: Partial<ShapeOutput<T>> = {};
				let success = true;

				const last = ctx.jsonPath.length;

				for (const s in shape) {
					ctx.jsonPath[last] = s;
					const decoded = shape[s]!.decode((data as any)[s], ctx);
					if (decoded.success) output[s] = decoded.output;
					else success = false;
				}

				ctx.jsonPath.pop();

				if (!success) return { success, errors: ctx.errors };

				return { success, output: output as ShapeOutput<T> };
			},
		},
		{
			name: "object<T>",
			typeCheck: (v): v is object =>
				Object.prototype.toString.call(v) == "[object Object]",
		},
	);
}

export function record<K extends string | number, V>(
	keyPipe: Pipe<unknown, K>,
	valPipe: Pipe<unknown, V>,
) {
	return pipe(
		{
			name: "object",
			typeCheck: (v): v is object =>
				Object.prototype.toString.call(v) == "[object Object]",
			transform(input: object, ctx: Context): Result<Record<K, V>> {
				const output = {} as Record<K, V>;

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
			name: `record<${keyPipe.outputName},${valPipe.outputName}>`,
			typeCheck: (v): v is object =>
				Object.prototype.toString.call(v) == "[object Object]",
		},
	);
}

export function union<T extends Readonly<Array<Pipe<any, any>>>>(options: T) {
	type O = Output<T[number]>;
	const name = options.map((o) => o.outputName).join("|");
	function typeCheck(data: any): data is O {
		for (const f of options) if (f.isOutput(data)) return true;
		return false;
	}

	return pipe(
		{
			name,
			typeCheck,
			transform(data: O, ctx: Context): Result<O> {
				const newCtx = new Context();
				for (const s in options) {
					const decoded = options[s]!.decode(data, newCtx);
					if (decoded.success) return decoded;
				}

				Object.assign(ctx.errors, newCtx.errors);
				return { success: false, errors: ctx.errors };
			},
		},
		{ name, typeCheck },
	);
}
