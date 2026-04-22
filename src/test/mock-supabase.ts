import { vi } from "vitest";

export type QueryResult = { data?: unknown; error?: unknown };

/**
 * A chainable, thenable mock for the Supabase query builder.
 * Every method returns `this` so chains like `.from().select().eq().single()` work.
 * The builder is awaitable directly (for chains that don't end in `.single()`).
 * `.single()` returns the underlying Promise so `await builder.single()` also works.
 */
class Builder {
  private _promise: Promise<QueryResult>;

  constructor(result: QueryResult) {
    this._promise = Promise.resolve({
      data: result.data ?? null,
      error: result.error ?? null,
    });
  }

  select = (..._args: unknown[]) => this;
  insert = (..._args: unknown[]) => this;
  update = (..._args: unknown[]) => this;
  upsert = (..._args: unknown[]) => this;
  delete = () => this;
  eq = (..._args: unknown[]) => this;
  single = () => this._promise;

  then<T>(
    onfulfilled?: ((value: QueryResult) => T | PromiseLike<T>) | null,
    onrejected?: ((reason: unknown) => T | PromiseLike<T>) | null
  ) {
    return this._promise.then(onfulfilled, onrejected);
  }

  catch<T>(onrejected?: ((reason: unknown) => T | PromiseLike<T>) | null) {
    return this._promise.catch(onrejected);
  }
}

export function makeBuilder(result: QueryResult = {}): Builder {
  return new Builder(result);
}

export type MockSupabaseClient = {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    admin: {
      inviteUserByEmail: ReturnType<typeof vi.fn>;
      generateLink: ReturnType<typeof vi.fn>;
    };
  };
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
};

/**
 * Creates a mock Supabase client.
 *
 * @param user - The user returned by `auth.getUser()`. Pass `null` to simulate unauthenticated.
 * @param fromResults - Ordered array of query results for sequential `.from()` calls.
 * @param rpcResult - Result returned by `.rpc()`.
 */
export function createMockClient({
  user = { id: "user-1" } as object | null,
  fromResults = [] as QueryResult[],
  rpcResult = {} as QueryResult,
} = {}): MockSupabaseClient {
  const fromMock = vi.fn();
  fromResults.forEach((result, i) => {
    if (i < fromResults.length - 1) {
      fromMock.mockReturnValueOnce(makeBuilder(result));
    } else {
      fromMock.mockReturnValue(makeBuilder(result));
    }
  });
  if (fromResults.length === 0) {
    fromMock.mockReturnValue(makeBuilder({ data: null, error: null }));
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      admin: {
        inviteUserByEmail: vi.fn().mockResolvedValue({ error: null }),
        generateLink: vi.fn().mockResolvedValue({
          data: { properties: { action_link: "https://example.com/magic" } },
          error: null,
        }),
      },
    },
    from: fromMock,
    rpc: vi.fn().mockReturnValue(makeBuilder(rpcResult)),
  };
}

/** Shorthand: an admin user */
export const adminUser = { id: "admin-1" };
/** Shorthand: a regular member user */
export const memberUser = { id: "member-1" };
/** Shorthand: admin profile row */
export const adminProfile = { data: { role: "admin" }, error: null };
/** Shorthand: member profile row */
export const memberProfile = { data: { role: "member" }, error: null };
