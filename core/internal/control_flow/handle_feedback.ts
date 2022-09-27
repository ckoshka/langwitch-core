import {
	CleanupEffect,
	ExitEffect,
	Free,
	LoggerEffect,
	produce,
	use,
} from "../../deps.ts";
import { CoreEffects } from "../core/effects/mod.ts";
import { markKnown } from "../core/mark_concepts.ts";
import { sortContexts } from "../core/sort_contexts.ts";
import { Concept } from "../core/types/concept.ts";
import { getUpdatedConcepts } from "../core/update_concepts.ts";
import { Feedback } from "../shared_types/feedback.ts";
import { ParamsReader } from "../shared_types/session_inputs_type.ts";
import { State } from "./types/state.ts";

export const updateTopContext = <Meta>(s1: State<Meta>) =>
	use<LoggerEffect>().chain(() => sortContexts<Meta>(s1)(s1.queue))
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
				f.log(() => s2);

				return s2;
			},
		);

const updateCurrentTopContextAsKnown = <Meta>(s1: State<Meta>) =>
	use<CoreEffects & ParamsReader>().map2(async (f) => {
		const newState = await produce(s1, async (draft) => {
			const currentConcepts = draft.queue[0].concepts;

			const isCurrentlyLearning = (c: string) =>
				draft.db.concepts[c].decayCurve <
					f.params.knownThreshold;

			await Promise.all(
				currentConcepts.map(async (c) =>
					isCurrentlyLearning(c)
						? draft.db.concepts[c] = await markKnown(
							draft.db.concepts[c],
						).run(f)
						: {}
				),
			);

			const learning = new Set(draft.learning);
			const known = new Set(draft.known);
			currentConcepts.forEach((c) => {
				learning.delete(c); // seems generalisable
				known.add(c);
			});
			draft.learning = Array.from(learning);
			draft.known = Array.from(known);
		});

		return newState;
	});

export const markAndUpdate = <Meta>(s1: State<Meta>) =>
	(scores: Feedback) =>
		scores.known
			? use<ExitEffect & CleanupEffect<State<Meta>>>().chain(() =>
				updateCurrentTopContextAsKnown(s1) // we're having to do this here because
				// Free<A> | Free<B> != Free<A & B>
			)
			: scores.result
			? use<ExitEffect & CleanupEffect<State<Meta>>>().chain(() =>
				getUpdatedConcepts(s1.db)(scores.result!)
			).map((toUpdate) =>
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
			}))
			: scores.terminate
			? Free.reader(
				async (f: ExitEffect & CleanupEffect<State<Meta>>) => {
					await f.cleanup(s1);
					return await f.exit();
				},
			) // could just be a promise that resolves on exit?
			: Free.lift(s1) as never;
