using DotNetBackend.Hubs;
using DotNetBackend.Sapphire;
using System.Text.Json.Serialization.Metadata;

var builder = WebApplication.CreateSlimBuilder(args);

builder.Services.AddScoped<IApiClient, ApiClient>();
builder.Services.AddHttpClient();

builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.TypeInfoResolver = new DefaultJsonTypeInfoResolver());

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
        options.PayloadSerializerOptions.TypeInfoResolver = new DefaultJsonTypeInfoResolver())
    .AddMessagePackProtocol();

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors("AllowedOrigins");
app.MapHub<LeaderboardHub>("/hubs/leaderboard").RequireCors("AllowedOrigins");
app.MapGet("/API/1/LiveAllCompetitions", (IApiClient api) => api.GetLiveAllCompetitions());

app.Run();
