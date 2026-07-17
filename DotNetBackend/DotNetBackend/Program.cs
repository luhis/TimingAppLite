using DotNetBackend.Hubs;
using DotNetBackend.Sapphire;
using DotNetBackend.Serialization;
using DotNetBackend.Services;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.ResponseCompression;
using System.Net.Mime;
using System.Text.Json;

var builder = WebApplication.CreateSlimBuilder(args);

builder.Services.Configure<HostOptions>(options =>
    options.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore);

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
            .AllowAnyMethod()
            .AllowCredentials();
    }));

if (builder.Environment.IsDevelopment())
    builder.Services.AddOpenApi();

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
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;

        var exceptionHandler = context.Features.Get<IExceptionHandlerFeature>();
        if (exceptionHandler is not null)
        {
            var problemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "An unexpected error occurred",
                Detail = app.Environment.IsDevelopment() ? exceptionHandler.Error.Message : null,
            };
            var json = JsonSerializer.Serialize(problemDetails, AppJsonContext.Default.ProblemDetails);
            await context.Response.WriteAsync(json);
        }
    });
});

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseResponseCompression();
app.UseCors("AllowedOrigins");
app.MapHealthChecks("/healthz", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = MediaTypeNames.Application.Json;
        await context.Response.WriteAsync($"{{\"status\":\"{report.Status}\"}}");
    },
});
app.MapHub<LeaderboardHub>("/hubs/LeaderBoard").RequireCors("AllowedOrigins");
app.MapGet("/API/1/LiveAllCompetitions", (IApiClient api, CancellationToken ct) => api.GetLiveAllCompetitions(ct));
app.MapGet("/API/1/Competitions/{competitionId:int}/LeaderBoards/{leaderboardId:int?}", (IApiClient api, int competitionId, int? leaderboardId, CancellationToken ct) => api.GetLeaderboards(competitionId, leaderboardId, ct));
app.MapGet("/API/1/Competitions/{competitionId:int}/SiteName", (IApiClient api, int competitionId, CancellationToken ct) => api.GetSiteName(competitionId, ct));

Console.WriteLine("Starting DotNetBackend...");
app.Run();
