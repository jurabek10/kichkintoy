export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  token?: string | null;
};

export type ProcedureInput<TProcedure> = TProcedure extends {
  (...args: infer TArgs): unknown;
}
  ? TArgs[0]
  : never;

export type QueryParams = NonNullable<RequestOptions["query"]>;
