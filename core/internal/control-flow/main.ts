import {
	CleanupEffect,
	ExitEffect,
	Free,
	LoggerEffect,
	produce,
	TapEffect,
	use,
} from "../../deps.ts";
import { Concept, CoreEffects, markKnown, markNew } from "../core/concept.ts";
import { getUpdatedConcepts } from "../core/marker.ts";
import { predict } from "../core/memory.ts";
import { sortContexts } from "../core/sorter.ts";
import { Database } from "../database.ts";
import { Feedback } from "../feedback.ts";
import { findGraduated } from "../queries/graduation.ts";
import { ParamsReader } from "../session_inputs_type.ts";
import { StateCalculationEffects } from "./effects.ts";
import { State } from "./state_type.ts";

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

// TODO: SEP INTO SEVERAL FNS, FIX THIS
const updateCurrentTopContextAsKnown = <Meta>(s1: State<Meta>) =>
	use<CoreEffects & ParamsReader>().chain(async (_, f) => {
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

		return checkGraduation<Meta>(newState).chain((s3) =>
			updateTopContext<Meta>(s3)
		);
	});

export const markAndUpdate = <Meta>(s1: State<Meta>) => (scores: Feedback) =>
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
// the problem was that not all variants contained exit

/*

the vast majority of the noise in this function comes down to:
1. checking against null values
2. checking against existing values we don't want overwritten
3. checking against duplication of existing values
4. uniquely identifying objects by their hashes


*/

const updateLearnedAndKnown = (
	learnedBefore: Iterable<string>,
	knownBefore: Iterable<string>,
	graduatedIds: Array<string>,
) => {
	const learning = new Set(learnedBefore);
	const known = new Set(knownBefore);
	graduatedIds.forEach((i) => {
		learning.delete(i);
		known.add(i);
	});
	return { learning, known };
};

const updateDbWithNew =
	(rec: Record<string, Concept>) => (learning: Iterable<string>) =>
		use<CoreEffects>().map2((f) =>
			Array.from(learning).map(async (id) =>
				rec[id] !== undefined ? rec[id] : await markNew({
					name: id,
				})
					.run(f)
			)
		).map((p) => Promise.all(p));

const noneGraduated = (ids: string[]) => ids.length === 0;
const atFullLearningCapacity = (max: number) => (learning: string[]) =>
	learning.length >= max;

export const checkGraduation = <Meta>(s1: State<Meta>) =>
	use<
		& ParamsReader
		& TapEffect
		& CoreEffects
		& StateCalculationEffects<Meta>
		& LoggerEffect
	>()
		.chain(() =>
			findGraduated(s1.db)(
				new Set(s1.learning),
			)
		).chain(async (graduatedIds, f) => {
			f.log(() => s1);

			if (
				noneGraduated(graduatedIds) &&
				atFullLearningCapacity(f.params.maxLearnable)(
					s1.learning,
				)
			) {
				return Free.lift(s1) as never;
			}

			const cfg = f.params;

			const { learning, known } = updateLearnedAndKnown(
				s1.learning,
				s1.known,
				graduatedIds,
			);

			const nextIds = await f.nextConcepts.run(
				{ knowns: known, total: cfg.maxConsiderationSize },
			).then((ids) => ({ learning: [...learning, ...ids] }));

			return updateDbWithNew(s1.db.concepts)(nextIds.learning).map(
				(updates) => ({ updates, ...nextIds }),
			)
				.map(async (rec) => ({
					queue: await f.nextContexts.run(
						{ knowns: known, focus: new Set(rec.learning) },
					),
					...rec,
				}))
				.map((rec) => {
					const existingIds = new Set(
						s1.queue.map((i) => i.id),
					);

					//f.tap("Existing queue ids")(existingIds);

					return {
						...rec,
						queue: s1.queue.concat(
							rec.queue
								.filter((ctx) => !existingIds.has(ctx.id)),
						),
					};
				})
				//.map((data) => f.tap("Partially updated state")(data))
				.map((rec) => {
					// update the database via immer

					const concepts = produce(
						s1.db.concepts,
						(dbDraft: Record<string, Concept>) => {
							rec.updates.forEach((m) => dbDraft[m.name] = m);
						},
					);

					const s2 = <State<Meta>> {
						...s1,
						db: {
							...s1.db,
							concepts,
						},
						stats: {
							learnCount: Object.values(s1.db.concepts).filter((
								concept,
							) => concept.firstSeen >
								cfg.metadata.startTimestamp / 1000 /
									60 / 60
							).length,
							knownCount: known.size,
						},
						known: Array.from(known),
						queue: rec.queue,
						learning: Array.from(rec.learning),
					};

					f.log(() => s2);

					return s2;
				});

			// todo: make this more declarative
			// this is an area where i notice mistakes in a lot, maybe 80% of them
			// and i find myself constantly tweaking different parameters and
			// changing the types of the inputs because i'm not 100% sure that
			// they're actually behaving as expected
			//
			// the annoying thing is, none of these transformations are reflected
			// in the type-system itself
			// the "have whether the queue is non-empty reflected as a generic"
			// was a good step, but we ended up erasing that information so as to
			// allow for sharing of the state with the IO frontend.
			//
			// and there are no 'hard' conditions under which the function will
			// fail completely, causing intermediate error-states that propagate
			// forward, causing unpredictable behaviours, violated expectations,
			// and invalid states.
			// the consequence is that it's essentially as if the function is mutating
			// the state.
			//
			// the only benefit of having it organised like this is
			// that it means several different states can be "simulated"
			// concurrently, i.e if the user is still typing an answer, we can go ahead
			// and anticipate 0, 30, 50, 70, 100 scores, then recalculate a new state
			// for each of them, so that there is absolutely no lag
			//
			// ideally we want to hide the ugly imperative execution away
			// leaving a modifiable configuration object
		});

const sortConcepts = (concepts: Array<Concept>) =>
	use<CoreEffects>().map2(
		async (f) => {
			const known: string[] = [];
			const learning: string[] = [];
			await Promise.all(
				concepts.map(async (c) =>
					(await predict(f.now().hoursFromEpoch)(c).run(f)) > 0.3 &&
						c.timesSeen > 2 //! sacrifices purity and also parameterisation
						? known.push(c.name)
						: learning.push(c.name)
				),
			);
			return [known, learning];
		},
	);

export const refresh = (db: Database) =>
	sortConcepts(Object.values(db.concepts)).map(([known, learning]) => ({
		db,
		known,
		learning,
		queue: [],
		stats: {
			learnCount: 0,
			knownCount: known.length,
		},
		desiredHideLevel: 0,
		lastResponse: "",
		noMoreLearnablesLeft: false,
	}));

export const handleSessionRefresh = <Meta>(s1: State<Meta>) =>
	refresh(s1.db).chain((s2) => checkGraduation<Meta>(s2)).chain((s3) =>
		updateTopContext<Meta>(s3)
	);

export const nextState = <Meta>(s1: State<Meta>) => (feedback: Feedback) =>
	markAndUpdate<Meta>(s1)(feedback)
		.chain((s2) => checkGraduation<Meta>(s2))
		.chain((s3) => updateTopContext(s3))
		.chain((s4, f) => {
			if (
				s4.noMoreLearnablesLeft ||
				s4.stats.learnCount >=
					f.params.maxPerSession - 10
			) {
				return handleSessionRefresh<Meta>(s4);
			} else return Free.lift(s4) as never;
		});

// since everything is immutable, we could calculate a new state in the case that the user got the answer correcetc.?
// no, but it mutates the backend which also prevents concurrency.
// REMEMBER TO GET ANOTHER ANSWER AND MAP IT TO A COMMAND AFTER THIS FN

// this is pretty awkward. should define declarative state transitions and decisional logic between them.
// io actions are mixed up. polluting the rest of the logic.
// so we could use an io monad here to clearly separate the impure from the pure
// "io" isn't very specific. the point is that it encodes side-effects into a visible type-system
//(() => {
//const cmd = ["nix-shell", "-p", "mpv", "--run", `mpv --loop-playlist=inf --volume=65 music`];
//Deno.run({ cmd, stdout: "null",
//stderr: "piped" });
//})()
