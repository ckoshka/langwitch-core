import { Free } from "../../deps.ts";
import { BaseContext } from "../core/context.ts";

type ConceptId = string;

export type ConceptQueryEffect = {
	nextConcepts: Free<
		Set<ConceptId>,
		{ knowns: Iterable<ConceptId>; total: number }
	>;
	//
};

export type ContextQueryEffect<T> = {
	nextContexts: Free<
		Array<BaseContext<T>>,
		{ knowns: Iterable<ConceptId>; focus: Iterable<ConceptId> }
	>;
};

export type StateCalculationEffects<T> =
	& ConceptQueryEffect
	& ContextQueryEffect<T>;

// todo: the sorting of the contexts should be an effect
// todo: choosing what concepts next is an effect, we might want several layers

// database effect isn't needed because contexts get provided to us
// check for msgpack compatibility between rust and js
// not strictly necessary since we can do the encoding part in rust
// concept update effect?
