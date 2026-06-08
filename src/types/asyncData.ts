export type AsyncData<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: string }
  | { readonly status: "success"; readonly data: T };
