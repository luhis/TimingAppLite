# AutoTest

## Running Tests

This project uses **xUnit v3** with `OutputType=Exe`. Do NOT use `dotnet test` — it fails with a testhost error.

Run tests directly as executables:

```bash
# Unit tests
dotnet run --project DotNetBackend.Test/DotNetBackend.Test.csproj

## Build

After making changes, always run a release build to ensure analyzers execute:

```bash
dotnet build DotNetBackend.slnx -c Release
```

## Conventions

- Use **Bulma components** from `react-bulma-components` where possible (e.g., `Table.Container` for scrollable tables, `Control` for form field spacing, `Columns` for layouts). Avoid inline styles for spacing or layout.
- Use **strict mocks** (`MockBehavior.Strict`) in unit tests. Avoid `It.IsAny<T>()` where a specific value can be used instead — narrow down mock setups to match actual expected calls.
- Prefer `BeEquivalentTo` over multiple individual assertions (e.g., `res.Should().BeEquivalentTo(new[] { new { ... } })`) for cleaner, more maintainable tests.
- Prefer LINQ (`Select`, `Where`, etc.) over `foreach` loops where possible for more declarative, concise code.
- Use method groups (e.g., `.Select(MapEntrant.Map)`) over lambda wrappers (e.g., `.Select(a => MapEntrant.Map(a))`) for less code.
