// Zod schemas for every request/response body. Consumers use these as
// runtime validators and also derive TypeScript types from them via
// `z.infer<typeof Foo>`, so we don't need to re-export the orval-generated
// `types/` directory — its interfaces collide with the same-named zod
// constants here and no consumer actually imports them. If you ever need
// a named interface, import it directly from
// `@workspace/api-zod/src/generated/types/<file>`.
export * from "./generated/api";
