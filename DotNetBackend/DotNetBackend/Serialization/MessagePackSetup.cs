using System.Diagnostics.CodeAnalysis;
using MessagePack;
using Microsoft.AspNetCore.SignalR;

namespace DotNetBackend.Serialization;

public static class MessagePackSetup
{
    // The API is annotated trim-unsafe because of MessagePack's dynamic resolvers;
    // AppMessagePackResolver is reflection-free, so it is safe under AOT.
    [UnconditionalSuppressMessage("Trimming", "IL2026", Justification = "Uses the reflection-free AppMessagePackResolver.")]
    [UnconditionalSuppressMessage("AOT", "IL3050", Justification = "Uses the reflection-free AppMessagePackResolver.")]
    public static ISignalRServerBuilder AddAotSafeMessagePack(this ISignalRServerBuilder builder) =>
        builder.AddMessagePackProtocol(options =>
            options.SerializerOptions = MessagePackSerializerOptions.Standard.WithResolver(AppMessagePackResolver.Instance));
}
