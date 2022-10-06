import {
	Concept,
	LoggerEffect,
	MarkedResult,
	produce,
	State,
	use,
} from "../../deps.ts";
import { sortContexts } from "../core/sort_contexts.ts";
import { getUpdatedConcepts } from "../core/update_concepts.ts";

export const updateTopContext = (s1: State) =>
	use<LoggerEffect>().chain(() => sortContexts(s1)(s1.queue))
		.map(
			(res, f) => {
				if (res.length === 0) {
					throw new Error("Queue was empty.");
				}
				const s2 = {
					...s1,
					queue: res.map((q) => q[0]),
					desiredHideLevel: 0,
				};
				f.log(s2);

				return s2;
			},
		);

export const markAndUpdate = (s1: State) => (scores: MarkedResult) =>
	getUpdatedConcepts(s1.db)(scores)
		.map((toUpdate) =>
			produce(s1.db.concepts, (db: Record<string, Concept>) => {
				toUpdate.forEach((c) => (db[c.name] = c));
			})
		).map((concepts) => ({
			...s1,
			db: {
				...s1.db,
				concepts,
			},
			desiredHideLevel: 0,
		}));
