using DotNetBackend.Hubs;
using DotNetBackend.Sapphire;
using DotNetBackend.Serialization;
using DotNetBackend.Services;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.ResponseCompression;
using Scalar.AspNetCore;
using System.Net;
using System.Net.Mime;
using System.Text.Json;

var builder = WebApplication.CreateSlimBuilder(args);

builder.Services.AddSingleton<IApiClient, ApiClient>();
builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<LeaderboardService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<LeaderboardService>());

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Append(MediaTypeNames.Application.Json);
});

builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default));

builder.Services.AddCors(options =>
    options.AddPolicy("AllowedOrigins", policy =>
    {
        var origins = new List<string> { "https://timingapplite.mccorry.dev" };
        if (builder.Environment.IsDevelopment())
            origins.Add("http://localhost:8000");

        policy
            .WithOrigins([.. origins])
            .AllowAnyHeader()
            .WithMethods("GET")
            .AllowCredentials();
    }));

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddOpenApi();
}

builder.Services.AddHealthChecks();

builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
        options.PayloadSerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default));

var app = builder.Build();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.ContentType = MediaTypeNames.Application.Json;

        var exceptionHandler = context.Features.Get<IExceptionHandlerFeature>();
        if (exceptionHandler is null)
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            return;
        }

        if (exceptionHandler.Error is UpstreamHttpException upstreamHttpException)
        {
            context.Response.StatusCode = (int)upstreamHttpException.StatusCode;
            context.Response.ContentType = upstreamHttpException.ContentType;
            await context.Response.Body.WriteAsync(upstreamHttpException.ResponseBody.AsMemory());
            return;
        }

        var statusCode = exceptionHandler.Error is HttpRequestException { StatusCode: not null } httpRequestException
            ? (int)(httpRequestException.StatusCode ?? HttpStatusCode.InternalServerError)
            : StatusCodes.Status500InternalServerError;

        context.Response.StatusCode = statusCode;

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = statusCode == StatusCodes.Status500InternalServerError
                ? "An unexpected error occurred"
                : "Upstream request failed",
            Detail = app.Environment.IsDevelopment() ? exceptionHandler.Error.Message : null,
        };
        var json = JsonSerializer.Serialize(problemDetails, AppJsonContext.Default.ProblemDetails);
        await context.Response.WriteAsync(json);
    });
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseResponseCompression();
app.UseCors("AllowedOrigins");
app.MapHealthChecks("/healthz", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = MediaTypeNames.Application.Json;
        await context.Response.WriteAsync($"{{\"status\":\"{report.Status.ToString().ToLowerInvariant()}\"}}");
    },
});
app.MapHub<LeaderboardHub>("/hubs/LeaderBoard").RequireCors("AllowedOrigins");
app.MapGet("/API/1/LiveAllCompetitions", async (IApiClient api, CancellationToken ct) =>
{
    var (bytes, contentType) = await api.GetLiveAllCompetitions(ct);
    return Results.Bytes(bytes, contentType);
})
    .Produces(200, contentType: "application/json")
    .AddOpenApiOperationTransformer((op, _, _) => { op.Summary = "Returns all live competitions as raw bytes"; return Task.CompletedTask; });
app.MapGet("/API/1/Competitions/{competitionId:int}/LeaderBoards/{leaderboardId:int?}", async (IApiClient api, int competitionId, int? leaderboardId, CancellationToken ct) =>
{
    var (bytes, contentType) = await api.GetLeaderboards(competitionId, leaderboardId, ct);
    return Results.Bytes(bytes, contentType);
})
    .Produces(200, contentType: "application/json")
    .AddOpenApiOperationTransformer((op, _, _) => { op.Summary = "Returns leaderboard data for a competition"; return Task.CompletedTask; });
app.MapGet("/API/1/Competitions/{competitionId:int}/SiteName", async (IApiClient api, int competitionId, CancellationToken ct) => await api.GetSiteName(competitionId, ct))
    .Produces<string>(StatusCodes.Status200OK)
    .AddOpenApiOperationTransformer((op, _, _) => { op.Summary = "Returns the site name for a competition"; return Task.CompletedTask; });

app.Run();
