import { BaseContext, Concept, Free, State } from "../../deps.ts";
import { adjust } from "./memory.ts";

export const futurity = (concept: Concept) =>
	adjust(
		concept,
	)(1.0)
		.map((ifCorrect) =>
			Math.abs(
				concept.decayCurve -
					ifCorrect.decayCurve,
			)
		);

// first, add a cache table
// then change chain/reduce to free.flatten
export const sortContexts = (state: State) => (ctxs: BaseContext[]) => {
	const cache: Map<string, number> = new Map();
	return Free.flatten(
		ctxs.map((ctx) =>
			Free.flatten(
				ctx.concepts.filter((c) => state.db.concepts[c]).map(
					(c) => {
						return cache.get(c) !== undefined
							? Free.lift(cache.get(c)) as never
							: futurity(state.db.concepts[c]).map(
								(n) => (cache.set(c, n), n),
							);
					},
				),
			).map((ns) =>
				ns.reduce((prev, curr) => prev + curr, 0) /
				Math.pow(ctx.concepts.length, 0.8)
			)
				.map((result) =>
					[
						ctx,
						(1 -
							(1 /
								ctxs.concat([ctx]).findIndex((c) =>
									c.id === ctx.id
								))) * result,
					] as [BaseContext, number]
				)
		),
	)
		.map((scoredCtxs) => scoredCtxs.sort((a, b) => b[1] - a[1]));
};
