using DotNetBackend.Hubs;
using DotNetBackend.Sapphire;
using DotNetBackend.Serialization;
using DotNetBackend.Services;
using Microsoft.AspNetCore.ResponseCompression;
using System.Net.Mime;

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
        policy
            .WithOrigins("https://timingapplite.mccorry.dev", "http://localhost:8000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()));

builder.Services.AddOpenApi();

builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
        options.PayloadSerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default))
    .AddMessagePackProtocol();

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseResponseCompression();
app.UseCors("AllowedOrigins");
app.MapHub<LeaderboardHub>("/hubs/LeaderBoard").RequireCors("AllowedOrigins");
app.MapGet("/API/1/LiveAllCompetitions", (IApiClient api) => api.GetLiveAllCompetitions());
app.MapGet("/API/1/Competitions/{competionId:int}/LeaderBoards/{leaderboardId:int?}", (IApiClient api, int competionId, int? leaderboardId) => api.GetLeaderboards(competionId, leaderboardId));

Console.WriteLine("Starting DotNetBackend...");
app.Run();

public partial class Program { }
