/**
 * Topic Classifier — Phase 2
 *
 * Source: decision-trees/01-request-evaluation-tree.md, Phase 2 (scope check)
 *         decision-trees/04-content-generation-tree.md (content classification)
 *
 * Classifies the response + input against the ruleset's allowed/restricted
 * topics. V1 uses keyword matching with word boundary awareness.
 * V2 will add semantic matching via embeddings.
 *
 * Target: <3ms
 */
import type { Ruleset, TopicClassificationResult } from "../types.js";
/**
 * Classify the response + input against allowed/restricted topics.
 */
export declare function classifyTopics(response: string, userInput: string, ruleset: Ruleset): TopicClassificationResult;
